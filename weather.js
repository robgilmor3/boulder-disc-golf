async function fetchWeatherForEvent(eventId, lat, lon) {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,windspeed_10m,precipitation&temperature_unit=fahrenheit&windspeed_unit=mph';
    const res = await fetch(url); const data = await res.json(); const cur = data.current;
    const tempF = Math.round(cur.temperature_2m), windMph = Math.round(cur.windspeed_10m), precip = cur.precipitation||0;
    const desc = precip>0.05?(tempF<35?'snow':'rain'):windMph>20?'windy':tempF<40?'cold':'clear';
    await db.from('events').update({weather_temp_f:tempF,weather_wind_mph:windMph,weather_precip_mm:precip,weather_desc:desc,lat,lon}).eq('id',eventId);
  } catch(e){console.warn('weather:',e);}
}

// ── Weather for event cards ──────────────────────────────
const DEFAULT_COORDS = { lat: 40.015, lon: -105.2705 };

function wmoEmoji(code) {
  if (code === 0)              return '☀️';
  if (code <= 3)               return '⛅';
  if (code <= 48)              return '🌫️';
  if (code <= 67)              return '🌧️';
  if (code <= 77)              return '❄️';
  if (code <= 82)              return '🌦️';
  if (code <= 86)              return '🌨️';
  return '⛈️';
}

// Wind: arrow shows where wind blows TO (opposite of FROM)
function windArrow(deg) {
  const dirs = ['↓','↙','←','↖','↑','↗','→','↘'];
  return dirs[Math.round(((deg + 180) % 360) / 45) % 8];
}
// Compass: where wind comes FROM
function windCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
function fmtHour(h) {
  if (h === 0)  return '12 AM';
  if (h < 12)   return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}

function fmtEventDate(dateStr, timeStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day  = d.toLocaleDateString('en-US', { weekday:'short' }).toUpperCase();
  const mon  = d.toLocaleDateString('en-US', { month:'short' }).toUpperCase();
  const date = d.getDate();
  const [hh, mm] = (timeStr || '09:00').split(':');
  const h = parseInt(hh, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const disp = (h % 12 || 12) + (mm !== '00' ? ':' + mm : '') + ' ' + ampm;
  return `${day} · ${mon} ${date} · ${disp}`;
}

// ── Weather caching (localStorage) ─────────────────────────
function wxCacheKey(evId) { return 'wx4_' + evId; }
function wxNeedsRefresh(evId, evDate, evTime) {
  try {
    const raw = localStorage.getItem(wxCacheKey(evId));
    if (!raw) return true;
    const { ts } = JSON.parse(raw);
    const now = Date.now();
    const lastDate = new Date(ts).toDateString();
    if (lastDate !== new Date().toDateString()) return true;      // new day
    const evMs = new Date(evDate + 'T' + (evTime || '09:00')).getTime();
    const hoursTo = (evMs - now) / 3600000;
    if (hoursTo <= 0.5  && (now - ts) > 10 * 60 * 1000) return true; // <30min to event, stale 10m
    if (hoursTo <= 3    && (now - ts) > 30 * 60 * 1000) return true; // <3h to event, stale 30m
    if (hoursTo <= 24   && (now - ts) > 2 * 60 * 60 * 1000) return true; // <24h to event, stale 2h
    return false;
  } catch { return true; }
}
function wxReadCache(evId) {
  try { return JSON.parse(localStorage.getItem(wxCacheKey(evId)))?.data || null; }
  catch { return null; }
}
function wxWriteCache(evId, data) {
  try { localStorage.setItem(wxCacheKey(evId), JSON.stringify({ ts: Date.now(), data })); }
  catch {}
}

// ── NWS weather helpers ──────────────────────────────────────────────────
const _nwsGridCache = {}; // in-memory: "lat,lon" → hourlyForecast URL

function nwsEmoji(forecast) {
  const f = (forecast || '').toLowerCase();
  // Returns styled HTML spans using plain Unicode (colorable, not emoji)
  if (f.includes('thunder')) {
    // "chance" or "slight chance" = rain hybrid, not full lightning
    if (f.includes('chance') || f.includes('slight'))
      return '<span style="color:#8a8a8a">&#9729;</span><span class="rain-drop">|</span><span class="rain-drop">|</span><span class="rain-drop">|</span>';
    return '<span style="color:#8a8a8a;font-size:0.9em">&#9729;</span><span style="color:#ffd700">&#9889;</span>';
  }
  if (f.includes('blizzard') || f.includes('ice storm') || f.includes('sleet') || f.includes('freezing'))
    return '<span style="color:#b8d4dc">&#10052;</span>';
  if (f.includes('snow') || f.includes('flurr'))
    return '<span style="color:#c8dce0">&#10052;</span>';
  if (f.includes('fog') || f.includes('haze'))
    return '<span style="color:#aaaaaa">&#9832;</span>';
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle'))
    return '<span style="color:#8a8a8a">&#9729;</span><span class="rain-drop">|</span><span class="rain-drop">|</span><span class="rain-drop">|</span>';
  if (f.includes('mostly cloudy') || f.includes('overcast'))
    return '<span style="color:#888">&#9729;</span>';
  if (f.includes('partly'))
    return '<span style="color:#ffd700">&#9728;</span><span style="color:#999;font-size:0.75em">&#9729;</span>';
  if (f.includes('mostly clear') || f.includes('mostly sunny'))
    return '<span style="color:#ffcc00">&#9728;</span>';
  if (f.includes('clear') || f.includes('sunny'))
    return '<span style="color:#FFD700">&#9728;</span>';
  if (f.includes('cloud'))
    return '<span style="color:#888">&#9729;</span>';
  if (f.includes('wind'))
    return '<span style="color:#aaa;letter-spacing:-2px">&#126;&#126;&#126;</span>';
  return '<span style="color:#aaa">&#8212;</span>';
}
function nwsWindArrow(dir) {
  return {'N':'↓','NNE':'↓','NE':'↙','ENE':'↙','E':'←','ESE':'↖','SE':'↖',
          'SSE':'↑','S':'↑','SSW':'↑','SW':'↗','WSW':'↗','W':'→','WNW':'↘',
          'NW':'↘','NNW':'↓'}[dir] || '·';
}
function nwsParseWind(ws) {
  const m = (ws || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}
function nwsFindPeriod(periods, date, hour) {
  const hStr = String(hour).padStart(2, '0');
  return periods.find(p => p.startTime.startsWith(date + 'T' + hStr));
}
function nwsDayHiLo(periods, date) {
  const dp = periods.filter(p => p.startTime.startsWith(date));
  if (!dp.length) return { hi: '--', lo: '--' };
  const temps = dp.map(p => p.temperature);
  return { hi: Math.max(...temps), lo: Math.min(...temps) };
}

async function fetchWeatherForCards() {
  const today = localDateStr();
  const upcoming = (state.events || []).filter(ev => !ev.cancelled && ev.date >= today);

  for (const ev of upcoming) {
    const el = document.getElementById('weather-card-' + ev.id);
    if (!el) continue;
    const coords = COURSE_COORDS[ev.course] || DEFAULT_COORDS;

    let periods = null;
    if (!wxNeedsRefresh(ev.id, ev.date, ev.time)) {
      periods = wxReadCache(ev.id);
    }
    if (!periods) {
      // Try NWS first, fall back to Open-Meteo
      try {
        const gridKey = coords.lat + ',' + coords.lon;
        let hourlyUrl = _nwsGridCache[gridKey];
        if (!hourlyUrl) {
          const ptRes = await fetch(`https://api.weather.gov/points/${coords.lat},${coords.lon}`);
          if (!ptRes.ok) throw new Error('NWS points ' + ptRes.status);
          const ptData = await ptRes.json();
          hourlyUrl = ptData.properties?.forecastHourly;
          if (!hourlyUrl) throw new Error('No hourlyUrl in NWS response');
          _nwsGridCache[gridKey] = hourlyUrl;
        }
        const fRes = await fetch(hourlyUrl);
        if (!fRes.ok) throw new Error('NWS hourly ' + fRes.status);
        const fData = await fRes.json();
        periods = fData.properties?.periods;
        if (!periods?.length) throw new Error('Empty NWS periods');
        wxWriteCache(ev.id, periods);
      } catch(nwsErr) {
        console.warn('NWS failed, falling back to Open-Meteo:', nwsErr);
        // Open-Meteo fallback
        try {
          const url = `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${coords.lat}&longitude=${coords.lon}` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
            `&hourly=temperature_2m,weathercode,windspeed_10m,winddirection_10m` +
            `&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FDenver` +
            `&start_date=${ev.date}&end_date=${ev.date}`;
          const res = await fetch(url);
          const omData = await res.json();
          if (!omData.hourly) continue;
          // Convert Open-Meteo → NWS-style periods array for unified rendering
          periods = omData.hourly.time.map((t, i) => ({
            startTime: t + ':00',
            temperature: Math.round(omData.hourly.temperature_2m[i]),
            windSpeed: Math.round(omData.hourly.windspeed_10m[i]) + ' mph',
            windDirection: windCompass(omData.hourly.winddirection_10m[i]),
            shortForecast: (() => {
              const c = omData.hourly.weathercode[i];
              return c===0?'Clear':c<=2?'Mostly Clear':c<=3?'Partly Cloudy':
                     c<=48?'Foggy':c<=67?'Rain Showers':c<=77?'Snow':
                     c<=82?'Showers':c<=86?'Snow Showers':'Thunderstorms';
            })(),
            _omHiLo: i===0 ? { hi: Math.round(omData.daily.temperature_2m_max[0]),
                                lo: Math.round(omData.daily.temperature_2m_min[0]) } : null
          }));
          wxWriteCache(ev.id, periods);
        } catch(e) { console.warn('Open-Meteo fallback failed:', e); continue; }
      }
    }

    const matchHour = ev.time ? parseInt(ev.time.split(':')[0], 10) : 9;
    // hi/lo: from NWS day range, or from Open-Meteo fallback tag
    const _hiloFallback = periods.find(p => p._omHiLo)?._omHiLo;
    const { hi, lo } = _hiloFallback || nwsDayHiLo(periods, ev.date);
    const leftP = nwsFindPeriod(periods, ev.date, matchHour) || periods[0];
    const leftSlot = {
      temp:  leftP.temperature,
      emoji: nwsEmoji(leftP.shortForecast),
      wind:  nwsParseWind(leftP.windSpeed),
      arrow: nwsWindArrow(leftP.windDirection),
      comp:  leftP.windDirection,
      cond:  leftP.shortForecast
    };

    const hourOffsets = [-1, 0, 1, 2, 3];
    const hourSlots = hourOffsets.map(off => {
      const h = Math.max(0, Math.min(23, matchHour + off));
      const p = nwsFindPeriod(periods, ev.date, h) || leftP;
      return {
        isEvent: off === 0,
        time:    fmtHour(h),
        temp:    p.temperature,
        emoji:   nwsEmoji(p.shortForecast),
        wind:    nwsParseWind(p.windSpeed),
        arrow:   nwsWindArrow(p.windDirection)
      };
    });

    el.innerHTML =
      `<div class="ewb-body">` +
        `<div class="ewb-left">` +
          `<div class="ewb-datetime">${fmtEventDate(ev.date, ev.time)}</div>` +
          `<div class="ewb-main">` +
            `<span class="ewb-icon">${leftSlot.emoji}</span>` +
            `<span class="ewb-temp">${leftSlot.temp}°F</span>` +
          `</div>` +
          `<div class="ewb-hilo">Hi ${hi}° &middot; Lo ${lo}°</div>` +
          `<div class="ewb-wind">` +
            `<span class="ewb-arrow">${leftSlot.arrow}</span>` +
            `<span>${leftSlot.wind} mph ${leftSlot.comp}</span>` +
          `</div>` +
          `<div class="ewb-cond">${leftSlot.cond}</div>` +
        `</div>` +
        `<div class="ewb-hours">` +
          hourSlots.map(s =>
            `<div class="ewb-hour${s.isEvent ? ' event-time' : ''}">` +
              `<div class="ewb-htime">${s.time}</div>` +
              `<div class="ewb-hicon">${s.emoji}</div>` +
              `<div class="ewb-htemp">${s.temp}°F</div>` +
              `<div class="ewb-harrow">${s.arrow}</div>` +
              `<div class="ewb-hwind">${s.wind} mph</div>` +
            `</div>`
          ).join('') +
        `</div>` +
      `</div>`;
    el.style.display = 'block';
  }

}
