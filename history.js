// ═══════════════════════════════════════════════════════
//  MATCH HISTORY (Master Spec Section 7)
// ═══════════════════════════════════════════════════════

let historyState = { tab: 'official', matches: [], filter: '', expanded: {} };

async function renderHistoryPage() {
  const el = document.getElementById('historyContent');
  if (el) el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  await loadHistoryMatches();
  renderHistoryTabContent();
}

async function loadHistoryMatches() {
  try {
    const { data, error } = await db.from('match_history').select('*').order('date', { ascending: false });
    if (!error && data) historyState.matches = data;
  } catch(e) { console.warn('loadHistoryMatches:', e); historyState.matches = []; }
}

function switchHistoryTab(tab) {
  historyState.tab = tab;
  document.querySelectorAll('.history-tab-btn').forEach(b => {
    const isActive = b.dataset.tab === tab;
    b.classList.toggle('btn-primary', isActive);
    b.classList.toggle('btn-secondary', !isActive);
    b.classList.toggle('active', isActive);
  });
  const searchRow = document.getElementById('historySearchRow');
  if (searchRow) searchRow.style.display = tab === 'official' ? 'block' : 'none';
  renderHistoryTabContent();
}

function filterHistory(val) {
  historyState.filter = (val || '').trim().toLowerCase();
  renderHistoryTabContent();
}

function toggleHistoryMatch(id) {
  historyState.expanded[id] = !historyState.expanded[id];
  renderHistoryTabContent();
}

function parseHistoryResults(m) {
  try { return typeof m.results === 'string' ? JSON.parse(m.results) : (m.results || []); }
  catch(e) { return []; }
}

function renderHistoryTabContent() {
  const el = document.getElementById('historyContent');
  if (!el) return;
  el.innerHTML = historyState.tab === 'official' ? renderOfficialMatchesHtml() : renderSideMatchesHtml();
}

function renderOfficialMatchesHtml() {
  const fl = historyState.filter;
  let matches = historyState.matches;
  if (fl) {
    matches = matches.filter(m => parseHistoryResults(m).some(r => (r.name || '').toLowerCase().includes(fl)));
  }
  if (!matches.length) return '<div class="empty">No matches found.</div>';

  return matches.map(m => {
    const results = parseHistoryResults(m);
    const winner = results.find(r => r.finish === 1) || results[0] || {};
    const isOpen = !!historyState.expanded[m.id];
    const d = m.date ? new Date(m.date + 'T12:00:00') : null;
    const dateStr = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (m.date || '');

    const rowsHtml = isOpen ? results.slice().sort((a, b) => (a.finish || 99) - (b.finish || 99)).map(r => {
      const better = r.newTag < r.tag, worse = r.newTag > r.tag;
      const arrow = better ? '▲' : worse ? '▼' : '—';
      const arrowColor = better ? 'var(--green)' : worse ? '#ff6b6b' : 'var(--text-muted)';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;">
        <span style="flex:1">${r.name}</span>
        <span style="font-family:'DM Mono',monospace;color:var(--text-muted);margin-right:12px">${r.score ? r.score + '✦' : '—'}</span>
        <span style="font-family:'DM Mono',monospace">#${r.tag} → #${r.newTag}</span>
        <span style="color:${arrowColor};margin-left:8px">${arrow}</span>
      </div>`;
    }).join('') : '';

    return `<div class="card" style="margin-bottom:10px;cursor:pointer;" onclick="toggleHistoryMatch(${m.id})">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:1px;">${m.course || 'Tag Match'}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${dateStr} · ${m.player_count || results.length} players · Tag Match</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--gold);">🏆 ${winner.name || '—'}</div>
          <div style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;">${winner.score ? winner.score + '✦' : ''}</div>
        </div>
      </div>
      ${isOpen ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">${rowsHtml}</div>` : ''}
    </div>`;
  }).join('');
}

function renderSideMatchesHtml() {
  return '<div class="empty">No side matches recorded yet.</div>';
}
