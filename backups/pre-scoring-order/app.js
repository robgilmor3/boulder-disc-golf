// ═══════════════════════════════════════════════════════
//  SUPABASE INIT
//  These values are injected by Vercel from environment vars
// ═══════════════════════════════════════════════════════
const SUPABASE_URL  = 'https://mewwizubdwfgvrhiylur.supabase.co';
const SUPABASE_ANON = 'sb_publishable_aZbW6gII45Fkxflzw9gG_Q_OCt29okw';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ═══════════════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════════════
let state = {
  currentUser: null,
  players: [],
  events: [],
  notes: [],
  acePool: 0,
  registrants: [],
  pendingResults: null,
  selectedEventId: null,
  tagOverrideLevel: 'full',
};

// Demo credentials (in prod these would be in Supabase auth)
const DEMO_CREDS = {
  rob:   { pass: 'boulder1', role: 'god',    name: 'Rob Gilmore' },
  shane: { pass: 'bdgc1',    role: 'admin',  name: 'Shane Sparkman' },
};

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
function localDateStr(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function localDateFromStr(s) { const p = String(s).split('-').map(Number); return new Date(p[0], (p[1]||1)-1, p[2]||1); }
function attrStr(s) { return JSON.stringify(String(s == null ? '' : s)).replace(/"/g, '&quot;'); }
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const labels = { splash:'Home', ledger:'Tags', match:'Match', stats:'Stats', diablo:'🔥 Diablo', admin:'Admin' };
  [...document.querySelectorAll('nav button')].find(b => b.textContent === labels[id])?.classList.add('active');
  if (id === 'splash')  renderSplash();
  if (id === 'ledger')  renderLedger();
  if (id === 'admin')   renderAdmin();
  if (id === 'match')   initMatch();
  if (id === 'stats')   renderStats();
  if (id === 'diablo') renderDiabloPage();
}

// ═══════════════════════════════════════════════════════
//  DATA LAYER — Supabase
// ═══════════════════════════════════════════════════════

async function loadPlayers() {
  const { data, error } = await db.from('players').select('*').order('tag', { ascending: true });
  if (!error && data) state.players = data;
  return state.players;
}

async function loadAcePool() {
  try {
    const { data } = await db.from('settings').select('value').eq('key', 'ace_pool_balance').single();
    if (data) state.acePool = parseFloat(data.value) || 0;
  } catch(e) { state.acePool = 0; }
  return state.acePool;
}

// ── Tag override confirmation level (Section 2) — admin-configurable slider ──
async function loadTagOverrideLevel() {
  try {
    const { data } = await db.from('settings').select('value').eq('key', 'tag_override_confirmation_level').maybeSingle();
    state.tagOverrideLevel = data?.value || 'full';
  } catch(e) { state.tagOverrideLevel = 'full'; }
  return state.tagOverrideLevel;
}

async function loadEvents() {
  const { data, error } = await db.from('events').select('*').order('date', { ascending: true });
  if (!error && data) state.events = data;
  return state.events;
}

async function loadNotes() {
  const [{ data, error }, { data: orderData }] = await Promise.all([
    db.from('notes').select('*').order('created_at', { ascending: true }),
    db.from('settings').select('value').eq('key', 'note_order').maybeSingle()
  ]);
  if (!error && data) {
    if (orderData?.value) {
      try {
        const order = JSON.parse(orderData.value).map(String);
        const byId = Object.fromEntries(data.map(n => [String(n.id), n]));
        const sorted = order.map(id => byId[id]).filter(Boolean);
        const unsorted = data.filter(n => !order.includes(String(n.id)));
        state.notes = [...sorted, ...unsorted];
      } catch { state.notes = data; }
    } else {
      state.notes = data;
    }
  }
  return state.notes;
}

// ═══════════════════════════════════════════════════════
//  SPLASH
// ═══════════════════════════════════════════════════════

async function renderSplash() {
  await Promise.all([loadEvents(), loadNotes()]);

  const now = new Date();
  const today = localDateStr(now);
  const el = document.getElementById('eventList');

  // Filter out events that ended more than 3 hours ago
  const visibleEvents = state.events.filter(ev => {
    const [h, m] = (ev.time || '12:00').split(':').map(Number);
    const evEnd = new Date(ev.date + 'T' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':00');
    evEnd.setHours(evEnd.getHours() + 4);
    return evEnd > now;
  }).slice(0, 2);

  // Prime the ace pool cache for every course shown so the sync getter below has data
  await Promise.all([...new Set(visibleEvents.map(ev => ev.course))].filter(Boolean).map(c => ensureAcePoolLoaded(c)));

  if (!visibleEvents.length) {
    el.innerHTML = '<div class="empty">No upcoming events. Check back soon!</div>';
  } else {
    el.innerHTML = visibleEvents.map(ev => {
      const isToday = ev.date === today;
      const d = new Date(ev.date + 'T12:00:00');
      const dateStr = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      const timeStr = formatTime(ev.time);
      const registered = Array.isArray(ev.registered) ? ev.registered : (ev.registered ? JSON.parse(ev.registered) : []);
      const playerCount = registered.length;
      const aceContrib = parseFloat(ev.ace_per_player || 1);
      const aceTotal = ev.course ? getCachedAcePoolMain(ev.course) : 0;
      const aceCap = ev.ace_pool_cap ? parseFloat(ev.ace_pool_cap) : null;
      const aceCapped = aceCap && aceTotal >= aceCap;
      return `
        <div class="event-card ${isToday ? 'today' : ''} ${ev.cancelled ? 'cancelled' : ''}">
          <div class="event-card-inner">
            <div class="event-card-left">
              ${isToday ? '<span class="badge badge-green">TODAY</span>' : ''}
              ${ev.cancelled ? '<span class="badge badge-red">CANCELLED</span>' : ''}
              <div class="event-title ${ev.cancelled ? 'cancelled-text' : ''}">${ev.title || 'Tag Match'}</div>
              <div class="event-meta">
                <strong>📍</strong> ${ev.course}<br>
                <strong>📅</strong> ${dateStr} &nbsp; <strong>🕗</strong> ${timeStr}
                ${ev.host ? `<br><strong>🎙️</strong> Hosted by ${ev.host}` : ''}
              </div>
              <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:1px;">
                <span id="reg-count-${ev.id}" style="color:var(--green);cursor:pointer;text-decoration:underline dotted;" onclick="showRegisteredPlayers(${ev.id})" title="Tap to see who's registered">👥 ${playerCount} registered</span>
                ${!ev.cancelled ? `<span style="color:var(--gold);">💰 $${aceTotal.toFixed(0)} ace pool${aceCapped ? ' 🔒 CAPPED' : ''}</span>` : ''}
              </div>
              ${!ev.cancelled ? `<button class="btn btn-primary btn-sm" style="margin-top:10px;display:block;width:fit-content;padding:12px 20px;" onclick="openRegisterForEvent(${ev.id})">Register →</button>` : ''}
              ${isToday && !ev.cancelled && registered.length > 0 ? `
                <div style="margin-top:10px;padding:10px 14px;background:rgba(61,220,110,0.07);border:1px solid rgba(61,220,110,0.2);border-radius:8px;font-size:13px;color:var(--green);font-family:'Barlow Condensed',sans-serif;letter-spacing:0.5px;">
                  ✅ You're registered! Head to the <strong>Match tab</strong> to submit your score.
                </div>
              ` : ''}
            </div>
            <div class="event-weather-wrapper"><div id="weather-card-${ev.id}" class="event-weather-bar"></div></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const notesEl = document.getElementById('notesList');
  const isAdmin = state.currentUser && ['god','admin','scorer'].includes(state.currentUser.role);
  notesEl.innerHTML = state.notes.length
    ? state.notes.map(n => `
        <div class="note-item${isAdmin ? ' draggable' : ''}" data-note-id="${n.id}">
          ${isAdmin ? `<span class="drag-handle" title="Drag to reorder">&#9776;</span>` : ''}
          <span class="note-content" id="note-content-${n.id}" style="flex:1">${n.content}</span>
          ${isAdmin ? `
            <button class="note-edit-btn" onclick="startEditNote(${n.id})" title="Edit">✏️</button>
            <button class="note-del-btn" onclick="deleteNote(${n.id})" title="Delete">✕</button>
          ` : ''}
        </div>`).join('')
    : '<div style="color:var(--text-muted);font-size:13px">No notes posted.</div>';
  if (isAdmin && state.notes.length) applyNoteReorder(notesEl);

  // Fetch weather for upcoming events
  fetchWeatherForCards();
}

function openRegisterForEvent(id) {
  const ev = state.events.find(e => e.id === id);
  state.selectedEventId = id;
  // Load existing registrants for this event
  const saved = Array.isArray(ev?.registered) ? ev.registered
    : (ev?.registered ? JSON.parse(ev.registered) : []);
  state.registrants = saved;
  document.getElementById('modalEventInfo').textContent = ev ? `${ev.course} · ${formatTime(ev.time)}` : '';
  document.getElementById('modalRegSearch').value = '';
  document.getElementById('modalTag').value = '';
  openModal('registerModal');
}

async function submitModalReg() {
  const name = document.getElementById('modalRegSearch').value.trim();
  const tag = parseInt(document.getElementById('modalTag').value);
  if (!name) return showToast('Enter name and tag number.', true);
  if (state.registrants.find(r => r.name === name)) return showToast(`${name} already registered.`, true);
  state.registrants.push({ name, tag, score: null });
  await persistRegistrants();
  closeModal('registerModal');
  showToast(`${name} registered — tag #${tag}!`);
}

// ═══════════════════════════════════════════════════════
//  TAG LEDGER
// ═══════════════════════════════════════════════════════

async function renderLedger(filter = '') {
  const el = document.getElementById('tagList');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  await loadPlayers();

  const fl = filter.toLowerCase();
  const sorted = [...state.players].sort((a, b) => (a.tag ?? Infinity) - (b.tag ?? Infinity));
  const visible = fl ? sorted.filter(p =>
    p.name.toLowerCase().includes(fl) || (p.pdga && p.pdga.includes(fl))
  ) : sorted;

  if (!visible.length) { el.innerHTML = '<div class="empty">No players found.</div>'; return; }

  el.innerHTML = visible.map(p => {
    const cls = p.tag === 1 ? 't1' : p.tag === 2 ? 't2' : p.tag === 3 ? 't3' : p.tag <= 20 ? 'top' : p.tag <= 100 ? 'mid' : 'low';
    const changeClass = p.last_change === 'up' ? 'change-up' : p.last_change === 'down' ? 'change-down' : 'change-same';
    const changeText = p.last_change === 'up' ? '▲' : p.last_change === 'down' ? '▼' : '—';
    const pdgaLink = p.pdga ? `<a href="https://www.pdga.com/player/${p.pdga}" target="_blank" style="color:var(--text-muted);text-decoration:none;font-family:'DM Mono',monospace;font-size:11px">#${p.pdga}</a>` : '';
    return `
      <div class="tag-row" onclick="showPlayerStats(${p.id})" style="cursor:pointer;">
        <span class="tag-num ${cls}">${p.tag}</span>
        <div class="tag-info">
          <div class="tag-name">${p.name}</div>
          <div class="tag-pdga">${pdgaLink}</div>
        </div>
        <span class="tag-change ${changeClass}">${changeText}</span>
      </div>
    `;
  }).join('');
}

function filterLedger(val) { renderLedger(val); }

async function showPlayerStats(playerId) {
  // Switch to stats page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-stats').classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const el = document.getElementById('statsContent');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  await Promise.all([loadPlayers(), loadEvents()]);
  const p = state.players.find(pl => pl.id === playerId);
  if (!p) { el.innerHTML = '<div class="empty">Player not found.</div>'; return; }

  // Calculate stats from match history
  const { data: history } = await db.from('match_history').select('*').order('date', { ascending: false });
  const playerMatches = (history || []).filter(m => {
    const results = typeof m.results === 'string' ? JSON.parse(m.results) : (m.results || []);
    return results.some(r => r.name === p.name);
  });

  const matchCount = p.match_count || playerMatches.length;
  const bestTag = p.best_tag || p.tag;
  const tagHistory = typeof p.tag_history === 'string' ? JSON.parse(p.tag_history || '[]') : (p.tag_history || []);

  // Build match history rows
  const historyRows = playerMatches.slice(0, 10).map(m => {
    const results = typeof m.results === 'string' ? JSON.parse(m.results) : (m.results || []);
    const pr = results.find(r => r.name === p.name);
    if (!pr) return '';
    const d = new Date(m.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' });
    const moved = pr.newTag < pr.tag ? `<span style="color:var(--green)">▲ +${pr.tag - pr.newTag}</span>` :
                  pr.newTag > pr.tag ? `<span style="color:#ff6b6b">▼ ${pr.tag - pr.newTag}</span>` :
                  '<span style="color:var(--text-muted)">—</span>';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;">
      <span style="color:var(--text-muted)">${dateStr}</span>
      <span>${m.course || 'Tag Match'}</span>
      <span style="font-family:'DM Mono',monospace">${pr.score ? pr.score+'✦' : '—'}</span>
      <span style="font-family:'DM Mono',monospace">#${pr.tag} → #${pr.newTag}</span>
      <span>${moved}</span>
    </div>`;
  }).join('');

  const tagCls = p.tag === 1 ? 't1' : p.tag <= 3 ? 't2' : p.tag <= 20 ? 'top' : p.tag <= 100 ? 'mid' : 'low';
  const pdgaLink = p.pdga ? `<a href="https://www.pdga.com/player/${p.pdga}" target="_blank" style="color:var(--orange);text-decoration:none;font-size:13px;">PDGA #${p.pdga} ↗</a>` : '<span style="color:var(--text-muted);font-size:13px;">No PDGA#</span>';

  el.innerHTML = `
    <div class="card" style="text-align:center;padding:28px 20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:2px;">${p.name}</div>
      <div style="margin-top:4px;">${pdgaLink}</div>
      <div style="margin-top:20px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
        <span class="tag-num ${tagCls}" style="font-size:36px;padding:10px 18px;">${p.tag}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-top:8px;">Current Tag</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;">
      <div class="stat-card"><div class="stat-val">${matchCount}</div><div class="stat-lbl">Matches</div></div>
      <div class="stat-card"><div class="stat-val">#${bestTag}</div><div class="stat-lbl">Best Tag</div></div>
      <div class="stat-card"><div class="stat-val">${p.last_change === 'up' ? '▲' : p.last_change === 'down' ? '▼' : '—'}</div><div class="stat-lbl">Last Move</div></div>
    </div>

    ${playerMatches.length > 0 ? `
    <div class="card">
      <div class="card-title">📊 Recent Matches</div>
      <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);letter-spacing:1px;text-transform:uppercase;">
        <span>Date</span><span>Course</span><span>Score</span><span>Tags</span><span>Move</span>
      </div>
      ${historyRows || '<div class="empty">No match history yet.</div>'}
    </div>` : '<div class="card"><div class="empty" style="padding:20px">No match history yet.</div></div>'}
  `;
}

async function renderStats() {
  const el = document.getElementById('statsContent');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';
    const {data:rounds,error:rErr} = await db.from('rounds').select('*,events(date,course,weather_temp_f,weather_wind_mph,weather_precip_mm)').eq('season','2026').order('created_at',{ascending:true});
    const {data:allEvents} = await db.from('events').select('id,date,course').eq('season','2026').order('date',{ascending:true});
    const now=new Date(),seasonStart=localDateFromStr('2026-07-04'),daysTo=Math.ceil((seasonStart-now)/86400000);
    if(rErr||!rounds||rounds.length===0){
      el.innerHTML='<div class="stats-empty" style="padding:40px 0;text-align:center"><div style="font-size:48px">🏆</div>'+(now<seasonStart?'<div style="margin-top:12px;font-size:16px">Season starts July 4th, 2026</div><div style="font-family:Barlow Condensed,sans-serif;font-size:32px;color:var(--gold);margin-top:8px">'+daysTo+' days to go</div>':'<div style="margin-top:12px;color:var(--text-muted)">No stats yet — they appear after the first committed match.</div>')+'</div>';
      return;
    }
  const attend={},courseMap={},weather={},tagImp={},playerDates={};
  rounds.forEach(r=>{
    const n=r.player_name;
    attend[n]=(attend[n]||0)+1;
    if(!courseMap[n]) courseMap[n]={};
    if(r.course) courseMap[n][r.course]=(courseMap[n][r.course]||0)+1;
    const ev=r.events;
    if(ev&&(ev.weather_wind_mph>15||ev.weather_precip_mm>0||ev.weather_temp_f<40)) weather[n]=(weather[n]||0)+1;
    if(!tagImp[n]) tagImp[n]={first:r.tag_before,best:r.tag_after??999};
    else if(r.tag_after&&r.tag_after<tagImp[n].best) tagImp[n].best=r.tag_after;
    const ed=ev?.date; if(ed){if(!playerDates[n]) playerDates[n]=new Set(); playerDates[n].add(ed);}
  });
  const evDates=(allEvents||[]).map(e=>e.date).sort();
  const streaks={};
  Object.entries(playerDates).forEach(([n,dates])=>{
    let s=0; for(const d of [...evDates].reverse()){if(dates.has(d))s++;else break;} streaks[n]=s;
  });
  const ironDisc={};
  Object.entries(playerDates).forEach(([n,dates])=>{
    const first=[...dates].sort()[0],elig=evDates.filter(d=>d>=first);
    const played=elig.filter(d=>dates.has(d)).length;
    if(elig.length>0) ironDisc[n]={played,total:elig.length,pct:Math.round(played/elig.length*100)};
  });
  const medal=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.';
  const board=(title,emoji,rows,valFn,subFn)=>{
    const rh=rows.length===0?'<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No data yet</div>':
      rows.map((r,i)=>'<div class="stats-row"><span class="stats-rank">'+medal(i)+'</span><span class="stats-name">'+r[0]+(subFn?'<br><span style="font-size:10px;color:var(--text-muted)">'+subFn(r)+'</span>':'')+'</span><span class="stats-val">'+valFn(r)+'</span></div>').join('');
    return '<div class="stats-card"><div class="stats-card-title">'+emoji+' '+title+'</div>'+rh+'</div>';
  };
  const top=(obj,n)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);
  el.innerHTML='<div class="stats-screen"><button class="btn btn-sm" onclick="showPage(&apos;splash&apos;)" style="margin-bottom:16px">← Back</button>'+
    '<div style="font-family:Barlow Condensed,sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:4px">🏆 SEASON STATS</div>'+
    '<div style="font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:20px">2026 � '+(allEvents?.length||0)+' events � '+rounds.length+' rounds logged</div>'+
    '<div class="stats-grid">'+
    board('Season Attendance','📅',top(attend,8),r=>r[1]+' rounds')+
    board('Current Streak','🔥',Object.entries(streaks).sort((a,b)=>b[1]-a[1]).slice(0,8),r=>r[1]+' weeks')+
    board('Course Regular','📍',Object.entries(courseMap).map(([n,cs])=>{const t=Object.entries(cs).sort((a,b)=>b[1]-a[1])[0];return[n,t[1],t[0]];}).sort((a,b)=>b[1]-a[1]).slice(0,8),r=>r[1]+' rounds',r=>r[2])+
    board('Weather Warrior','🌦',top(weather,8),r=>r[1]+' rough rounds')+
    board('Most Improved','📈',Object.entries(tagImp).map(([n,d])=>[n,(d.first||99)-(d.best||99)]).filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,8),r=>'↑'+r[1]+' spots')+
    board('Iron Disc','⭐',Object.entries(ironDisc).sort((a,b)=>b[1].pct-a[1].pct).slice(0,8),r=>r[1].pct+'%',r=>r[1].played+'/'+r[1].total+' events')+
    '</div></div>';
}
async function saveNoteOrder(orderedIds) {
  await db.from('settings').upsert({ key: 'note_order', value: JSON.stringify(orderedIds) }, { onConflict: 'key' });
}

function applyNoteReorder(noteEl) {
  // Document-level pointer events — reliable on Android, iOS, and desktop Chrome
  // No setPointerCapture needed; document always receives move/up regardless of pointer position
  noteEl.querySelectorAll('.drag-handle').forEach(handle => {
    handle.style.touchAction = 'none';
    handle.style.userSelect = 'none';

    handle.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const dragItem = handle.closest('[data-note-id]');
      if (!dragItem) return;

      dragItem.style.opacity = '0.55';
      dragItem.style.transform = 'scale(1.01)';
      dragItem.style.boxShadow = '0 6px 24px rgba(0,0,0,0.5)';

      function onMove(ev) {
        ev.preventDefault();
        const y = ev.clientY;
        const siblings = [...noteEl.querySelectorAll('[data-note-id]')].filter(s => s !== dragItem);
        for (const sib of siblings) {
          const r = sib.getBoundingClientRect();
          if (y >= r.top && y <= r.bottom) {
            const insertBefore = y < r.top + r.height / 2 ? sib : sib.nextSibling;
            if (dragItem.nextSibling !== insertBefore && dragItem !== insertBefore) {
              noteEl.insertBefore(dragItem, insertBefore);
            }
            break;
          }
        }
      }

      async function onEnd() {
        dragItem.style.opacity = '';
        dragItem.style.transform = '';
        dragItem.style.boxShadow = '';
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
        document.removeEventListener('pointercancel', onEnd);
        const newOrder = [...noteEl.querySelectorAll('[data-note-id]')].map(el => el.dataset.noteId);
        await saveNoteOrder(newOrder);
        showToast('Order saved!');
      }

      // Document-level listeners catch pointer events anywhere on screen
      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onEnd);
      document.addEventListener('pointercancel', onEnd);
    }, { passive: false });
  });
}

// ── Inline note editing ──────────────────────────────────
function startEditNote(id) {
  const span = document.getElementById('note-content-' + id);
  if (!span) return;
  const current = span.textContent.trim();
  // Replace the span + its sibling buttons with an edit row
  const item = span.closest('[data-note-id]');
  const handle = item.querySelector('.drag-handle');
  // Hide handle while editing
  if (handle) handle.style.display = 'none';
  span.outerHTML = `
    <input id="note-edit-${id}" type="text" value="${current.replace(/"/g,'&quot;')}"
      style="flex:1;padding:4px 10px;border-radius:6px;border:1px solid var(--border);
             background:var(--surface2);color:var(--text);font-family:inherit;font-size:13px;"
      onkeydown="if(event.key==='Enter')saveNoteEdit(${id});if(event.key==='Escape')renderSplash();">
    <button class="btn btn-primary btn-sm" onpointerdown="event.preventDefault();saveNoteEdit(${id})" style="padding:4px 10px;margin-left:4px;touch-action:manipulation">✓</button>
    <button class="btn btn-secondary btn-sm" onpointerdown="event.preventDefault();renderSplash()" style="padding:4px 10px;touch-action:manipulation">✕</button>
  `;
  // Hide existing edit/delete buttons while in edit mode
  item.querySelectorAll('.note-edit-btn,.note-del-btn').forEach(b => b.style.display='none');
  const input = document.getElementById('note-edit-' + id);
  if (input) { input.focus(); input.select(); }
}

async function saveNoteEdit(id) {
  const input = document.getElementById('note-edit-' + id);
  if (!input) return;
  const newContent = input.value.trim();
  if (!newContent) return showToast('Note can\'t be empty.', true);
  try {
    await db.from('notes').update({ content: newContent }).eq('id', id);
    const note = state.notes.find(n => n.id === id);
    if (note) note.content = newContent;
    showToast('Note updated!');
    renderSplash();
    if (document.getElementById('page-admin')?.classList.contains('active')) renderAdmin();
  } catch(e) { showToast('Error saving note.', true); }
}

function fmtDate(dateStr) {
  // Convert YYYY-MM-DD → MM/DD/YYYY for display
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

async function quickAddNote() {
  const ta = document.getElementById('quickNoteInput');
  const lines = ta.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (!lines.length) return showToast('Type at least one note.', true);
  for (const line of lines) {
    await db.from('notes').insert({ content: line });
  }
  ta.value = '';
  showToast(lines.length > 1 ? lines.length + ' notes posted!' : 'Note posted!');
  await loadNotes();
  renderSplash();
}

async function addNote() {
  const content = document.getElementById('noteInput').value.trim();
  if (!content) return showToast('Type a note first.', true);
  await db.from('notes').insert({ content });
  document.getElementById('noteInput').value = '';
  showToast('Note posted!');
  renderAdmin(); renderSplash();
}

async function deleteNote(id) {
  await db.from('notes').delete().eq('id', id);
  showToast('Note removed.');
  renderAdmin(); renderSplash();
}

// ═══════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════

function doLogin() {
  const user = document.getElementById('loginUser').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;

  // Check static creds first
  let cred = DEMO_CREDS[user] && DEMO_CREDS[user].pass === pass ? DEMO_CREDS[user] : null;

  // Check dynamic admins if no static match
  if (!cred) {
    const dynAdmins = getDynamicAdmins();
    const dyn = dynAdmins.find(a => a.username === user && a.pass === pass);
    if (dyn) {
      if (isDynamicAdminExpired(dyn)) {
        document.getElementById('loginErr').textContent = 'This access has expired.';
        document.getElementById('loginErr').style.display = 'block';
        return;
      }
      cred = { name: dyn.name, role: dyn.role };
    }
  }

  if (cred) {
    state.currentUser = { name: cred.name, role: cred.role };
    localStorage.setItem('bdg_user', JSON.stringify({ name: cred.name, role: cred.role }));
    applyLogin(cred.name, cred.role);
    document.getElementById('loginErr').style.display = 'none';
    closeModal('loginModal');
    showToast(`Welcome, ${cred.name.split(' ')[0]}!`);
    renderSplash(); // re-render so drag handles + edit buttons appear
  } else {
    document.getElementById('loginErr').textContent = 'Invalid username or password.';
    document.getElementById('loginErr').style.display = 'block';
  }
}

function applyLogin(name, role) {
  document.getElementById('userLabel').textContent = name.split(' ')[0];
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-flex';
  document.getElementById('addNoteForm').style.display = 'flex';
  if (['god','admin','scorer'].includes(role)) {
    document.getElementById('adminBtn').style.display = 'inline-block';
    document.getElementById('diabloBtn').style.display = 'inline-block';
  }
}

function doLogout() {
  state.currentUser = null;
  localStorage.removeItem('bdg_user');
  document.getElementById('userLabel').textContent = 'Guest';
  document.getElementById('loginBtn').style.display = 'inline-flex';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('addNoteForm').style.display = 'none';
  document.getElementById('adminBtn').style.display = 'none';

  document.getElementById('diabloBtn').style.display = 'none';
  showPage('splash');
  showToast('Logged out.');
}

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

let toastTimer;
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}

// ═══════════════════════════════════════════════════════
//  PWA INSTALL PROMPT
// ═══════════════════════════════════════════════════════
let deferredPrompt;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const isMobile = window.innerWidth < 768 || ('ontouchstart' in window) || window.matchMedia('(hover: none)').matches;
  if (isMobile) {
    document.getElementById('installBanner').classList.add('show');
  }
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('installBanner').classList.remove('show');
  }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

//  INIT
// ═══════════════════════════════════════════════════════
(async () => {
  // Restore saved login — simple, defensive, no external dependencies
  try {
    const saved = localStorage.getItem('bdg_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      const name = parsed.name;
      const role = parsed.role;
      if (name && role) {
        // Check static creds
        const inStatic = Object.values(DEMO_CREDS).some(c => c.name === name && c.role === role);
        // Check dynamic admins (wrapped separately so failure here doesn't break static restore)
        let inDynamic = false;
        try {
          const dynAdmins = JSON.parse(localStorage.getItem('bdg_dynamic_admins') || '[]');
          const dynMatch = dynAdmins.find(a => a.name === name && a.role === role);
          inDynamic = !!(dynMatch && (!dynMatch.expires || new Date(dynMatch.expires) >= new Date()));
        } catch(e2) {}

        if (inStatic || inDynamic) {
          state.currentUser = { name, role };
          applyLogin(name, role);
        } else {
          localStorage.removeItem('bdg_user');
        }
      }
    }
  } catch(e) {
    try { localStorage.removeItem('bdg_user'); } catch(e2) {}
  }

  await loadPlayers();
  await loadTagOverrideLevel();
  await renderSplash();
})();
