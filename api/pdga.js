// api/pdga.js — Vercel serverless function
// Proxies PDGA player lookups to avoid browser CORS restrictions
// Usage:
//   GET /api/pdga?pdga=26024        → { found, pdga, name, city, state, status }
//   GET /api/pdga?name=Rob+Gilmore  → { found, players: [{pdga, name, city, state}] }

const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };
    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim();
}

// Parse a PDGA player profile page (pdga.com/player/XXXXX)
function parsePlayerProfile(html, pdgaNum) {
  // Player name is in <h1 class="title">Name</h1> or page <title>Name | PDGA</title>
  const h1Match = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const name = stripTags(h1Match[1]);
    if (name && name.length > 1 && !name.toLowerCase().includes('page not found')) {
      // Try to grab city/state too
      const cityMatch = html.match(/class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const city = cityMatch ? stripTags(cityMatch[1]) : '';
      return { found: true, pdga: pdgaNum, name, city };
    }
  }

  // Fallback: page title
  const titleMatch = html.match(/<title>\s*([^|<\n]+)/i);
  if (titleMatch) {
    const name = titleMatch[1].trim();
    if (name && !name.toLowerCase().includes('pdga') && !name.toLowerCase().includes('not found') && name.length > 2) {
      return { found: true, pdga: pdgaNum, name };
    }
  }

  return { found: false };
}

// Parse the PDGA players search results table (pdga.com/players?...)
function parsePlayersTable(html) {
  const players = [];

  // Find the results table — PDGA uses a <table> with views-table class
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return players;

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let isFirst = true;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    if (isFirst) { isFirst = false; continue; } // skip header row

    const rowHtml = rowMatch[1];
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripTags(cellMatch[1]));
    }

    // PDGA table columns: PDGA#, Name, City, State, Country, Class, Status, Expires
    if (cells.length >= 2 && /^\d+$/.test(cells[0])) {
      players.push({
        pdga: cells[0],
        name: cells[1] || '',
        city: cells[2] || '',
        state: cells[3] || '',
        status: cells[6] || '',
      });
    }
  }

  return players;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600'); // cache 1hr on Vercel edge

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { pdga, name } = req.query;

  try {
    // ── Lookup by PDGA number ──
    if (pdga) {
      if (!/^\d{4,8}$/.test(pdga)) {
        return res.status(400).json({ found: false, error: 'Invalid PDGA number format' });
      }

      const { html, status } = await fetchUrl(`https://www.pdga.com/player/${pdga}`);

      if (status === 404) return res.json({ found: false });

      const result = parsePlayerProfile(html, pdga);
      return res.json(result);
    }

    // ── Search by name ──
    if (name) {
      const parts = name.trim().split(/\s+/);
      const firstName = encodeURIComponent(parts[0] || '');
      const lastName  = encodeURIComponent(parts.slice(1).join(' ') || '');

      const url = `https://www.pdga.com/players?FirstName=${firstName}&LastName=${lastName}&Status=P&Class=P`;
      const { html } = await fetchUrl(url);
      const players = parsePlayersTable(html);

      return res.json({
        found: players.length > 0,
        players: players.slice(0, 8),
      });
    }

    return res.status(400).json({ error: 'Provide ?pdga=XXXXX or ?name=First+Last' });

  } catch (err) {
    console.error('PDGA lookup error:', err.message);
    return res.status(500).json({ found: false, error: 'PDGA lookup failed' });
  }
};
