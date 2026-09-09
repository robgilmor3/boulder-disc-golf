// ═══════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
//  DYNAMIC ADMIN MANAGEMENT
// ═══════════════════════════════════════════════════════
const DYNAMIC_ADMINS_KEY = 'bdg_dynamic_admins';

function getDynamicAdmins() {
  try { return JSON.parse(localStorage.getItem(DYNAMIC_ADMINS_KEY)) || []; }
  catch(e) { return []; }
}

function saveDynamicAdmins(admins) {
  localStorage.setItem(DYNAMIC_ADMINS_KEY, JSON.stringify(admins));
}

function isDynamicAdminExpired(admin) {
  if (!admin.expires) return false;
  return new Date(admin.expires) < new Date();
}

function renderAdminAccessList() {
  const el = document.getElementById('adminAccessList');
  const admins = getDynamicAdmins();
  const today = localDateStr();
  if (!admins.length) {
    el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px 0;">No additional admins set up.</div>';
    return;
  }
  el.innerHTML = admins.map((a, i) => {
    const expired = isDynamicAdminExpired(a);
    const expiryLabel = a.expires
      ? (expired ? `<span style="color:var(--red,#f66)">Expired ${fmtDate(a.expires)}</span>` : `Expires ${fmtDate(a.expires)}`)
      : 'Permanent';
    return `<div class="list-item" style="${expired ? 'opacity:0.5' : ''}">
      <div class="list-item-info">
        <div class="list-item-name">${a.name} <span class="role-badge role-${a.role}">${a.role.toUpperCase()}</span></div>
        <div class="list-item-meta">@${a.username} · ${expiryLabel}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeDynamicAdmin(${i})">Remove</button>
    </div>`;
  }).join('');
}

function addDynamicAdmin() {
  const username = document.getElementById('newAdminUser').value.trim().toLowerCase();
  const pass = document.getElementById('newAdminPass').value.trim();
  const name = document.getElementById('newAdminName').value.trim();
  const role = document.getElementById('newAdminRole').value;
  const expires = document.getElementById('newAdminExpiry').value || null;
  if (!username || !pass || !name) return showToast('Fill in username, password, and name.', true);
  if (DEMO_CREDS[username]) return showToast('That username is reserved.', true);
  const admins = getDynamicAdmins();
  if (admins.find(a => a.username === username)) return showToast('Username already exists.', true);
  admins.push({ username, pass, name, role, expires });
  saveDynamicAdmins(admins);
  document.getElementById('newAdminUser').value = '';
  document.getElementById('newAdminPass').value = '';
  document.getElementById('newAdminName').value = '';
  document.getElementById('newAdminExpiry').value = '';
  renderAdminAccessList();
  showToast(`${name} added as ${role}!`);
}

function removeDynamicAdmin(index) {
  const admins = getDynamicAdmins();
  const removed = admins.splice(index, 1)[0];
  saveDynamicAdmins(admins);
  renderAdminAccessList();
  showToast(`${removed.name} removed.`);
}

function renderAdminEvents(showAll) {
  const evEl = document.getElementById('adminEventList');
  const today = localDateStr();
  const sorted = [...state.events].sort((a,b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter(ev => ev.date >= today);
  const past = sorted.filter(ev => ev.date < today);
  const toShow = showAll ? sorted : upcoming.slice(0, 3);

  function evRow(ev) {
    return `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">${ev.title || 'Tag Match'} — ${ev.course}</div>
        <div class="list-item-meta">${fmtDate(ev.date)} · ${formatTime(ev.time)} ${ev.cancelled ? '· CANCELLED' : ''}</div>
      </div>
      <div class="flex-gap">
        <button class="btn btn-secondary btn-sm" onclick="toggleCancel(${ev.id}, ${!ev.cancelled})">${ev.cancelled ? 'Restore' : 'Cancel'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEvent(${ev.id})">Delete</button>
      </div>
    </div>`;
  }

  const rows = toShow.map(evRow).join('') || '<div class="empty">No events.</div>';
  const hiddenCount = upcoming.length - 3;
  const toggleBtn = !showAll && hiddenCount > 0
    ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px;width:100%" onclick="renderAdminEvents(true)">Show all (${hiddenCount} more upcoming + ${past.length} past)</button>`
    : showAll
      ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px;width:100%" onclick="renderAdminEvents(false)">Show less</button>`
      : '';
  evEl.innerHTML = rows + toggleBtn;
}

async function renderAdmin() {
  await Promise.all([loadPlayers(), loadEvents(), loadNotes(), loadAcePool()]);

  document.getElementById('statPlayers').textContent = state.players.length;

  // Match count
  const { count } = await db.from('match_history').select('*', { count: 'exact', head: true });
  document.getElementById('statMatches').textContent = count || 0;

  // Events — show next 3 upcoming by default
  renderAdminEvents(false);

  // Tag Assignment
  renderTagAssign('');

  // Notes
  const noteEl = document.getElementById('adminNoteList');
  noteEl.innerHTML = state.notes.map((n,i) => `
    <div class="list-item">
      <span style="flex:1;font-size:13px">${n.content}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteNote(${n.id})">Remove</button>
    </div>
  `).join('') || '<div class="empty">No notes.</div>';

  // God-only roster
  if (state.currentUser?.role === 'god') {
    document.getElementById('godSection').style.display = 'block';
    document.getElementById('tempAdminSection').style.display = 'block';
    renderAdminAccessList();
    const roster = document.getElementById('adminRoster');
    roster.innerHTML = state.players.map(p => `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-name">${p.name}</div>
          <div class="list-item-meta">Tag #${p.tag}${p.pdga ? ' · PDGA #'+p.pdga : ''}</div>
        </div>
        <div class="flex-gap" style="align-items:center">
          <select onchange="changeRole(${p.id}, this.value)" style="width:auto;padding:4px 8px;font-size:12px">
            <option value="player" ${p.role==='player'?'selected':''}>Player</option>
            <option value="scorer" ${p.role==='scorer'?'selected':''}>Scorer</option>
            <option value="admin" ${p.role==='admin'?'selected':''}>Admin</option>
            <option value="god" ${p.role==='god'?'selected':''}>God</option>
          </select>
          <span class="role-badge role-${p.role}">${p.role.toUpperCase()}</span>
        </div>
      </div>
    `).join('');
  }
}

// ═══════════════════════════════════════════════════════
//  TAG ASSIGNMENT BULK EDITOR
// ═══════════════════════════════════════════════════════

let tagAssignChanges = {}; // playerId → newTag

function renderTagAssign(filter) {
  const el = document.getElementById('tagAssignList');
  const fl = (filter || '').toLowerCase();
  const sorted = [...state.players].sort((a, b) => {
    // Unassigned first, then by tag number
    if (!a.tag && b.tag) return -1;
    if (a.tag && !b.tag) return 1;
    return (a.tag || 999) - (b.tag || 999);
  });
  const visible = fl ? sorted.filter(p => p.name.toLowerCase().includes(fl)) : sorted;

  el.innerHTML = visible.map(p => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="flex:1;font-size:14px;">${p.name}${p.pdga ? `<span style="font-size:11px;color:var(--text-muted);margin-left:8px">PDGA #${p.pdga}</span>` : ''}</div>
      <input
        type="number"
        min="1" max="350"
        placeholder="${p.tag || 'No tag'}"
        value="${tagAssignChanges[p.id] !== undefined ? tagAssignChanges[p.id] : (p.tag || '')}"
        data-player-id="${p.id}"
        data-player-name="${p.name}"
        style="width:80px;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:var(--text);font-family:'DM Mono',monospace;font-size:14px;text-align:center;"
        oninput="tagAssignChanges[${p.id}] = this.value ? parseInt(this.value) : null"
        onkeydown="if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();const inputs=document.querySelectorAll('#tagAssignList input');const idx=Array.from(inputs).indexOf(this);if(inputs[idx+1])inputs[idx+1].focus();}"
      >
      <span style="font-size:11px;color:var(--text-muted);width:30px;font-family:'DM Mono',monospace;">${p.tag ? '#'+p.tag : '—'}</span>
    </div>
  `).join('');
}

function filterTagAssign(val) {
  renderTagAssign(val);
}

async function saveTagAssignments() {
  const status = document.getElementById('tagAssignStatus');
  const changes = Object.entries(tagAssignChanges).filter(([id, tag]) => tag !== null && tag >= 1 && tag <= 350);
  if (!changes.length) { showToast('No changes to save.', true); return; }

  // Check for duplicate tags
  const newTags = changes.map(([,t]) => t);
  const dupes = newTags.filter((t, i) => newTags.indexOf(t) !== i);
  if (dupes.length) { showToast(`Duplicate tag #${dupes[0]} — fix before saving.`, true); return; }

  status.style.display = 'block';
  status.textContent = `Saving ${changes.length} tag assignments...`;

  let saved = 0;
  for (const [playerId, newTag] of changes) {
    const player = state.players.find(p => p.id === parseInt(playerId));
    if (!player) continue;
    const { error } = await db.from('players').update({ tag: newTag, last_change: 'same' }).eq('id', playerId);
    if (!error) {
      player.tag = newTag;
      saved++;
    }
  }

  tagAssignChanges = {};
  status.textContent = `✅ ${saved} tags saved!`;
  setTimeout(() => { status.style.display = 'none'; }, 3000);

  try {
    const _ev=(state.events||[]).find(e=>e.id===state.selectedEventId);
    const _coords=_ev?.course?(COURSE_COORDS[_ev.course]||{lat:40.0150,lon:-105.2316}):{lat:40.0150,lon:-105.2316};
    const _rows=[];
    for(const [pid,nTag] of changes){
      const _p=(state.players||[]).find(p=>p.id===pid);
      if(_p) _rows.push({event_id:state.selectedEventId||null,player_id:pid,player_name:_p.name,tag_before:_p.tag,tag_after:nTag,course:_ev?.course||null,season:'2026'});
    }
    if(_rows.length>0) await db.from('rounds').insert(_rows);
    if(_ev?.id) fetchWeatherForEvent(_ev.id,_coords.lat,_coords.lon);
  }catch(_e){console.warn('rounds:',_e);}
  showToast(`${saved} tag assignments saved!`);
  renderTagAssign(document.getElementById('tagAssignSearch')?.value || '');
  renderLedger();
}

async function addEvent() {
  const title = document.getElementById('evTitle').value.trim() || 'Weekly Tag Match';
  const course = document.getElementById('evCourse').value;
  const date = document.getElementById('evDate').value;
  const time = document.getElementById('evTime').value;
  const host = document.getElementById('evHost') ? document.getElementById('evHost').value.trim() : '';
  const entry_fee = parseFloat(document.getElementById('evEntryFee')?.value || 0);
  const ace_per_player = parseFloat(document.getElementById('evAcePerPlayer')?.value || 1);
  const ace_pool_cap = document.getElementById('evAceCap')?.value ? parseFloat(document.getElementById('evAceCap').value) : null;
  if (!date) return showToast('Pick a date.', true);
  const { error } = await db.from('events').insert({
    title, course, date, time, cancelled: false,
    host, entry_fee, ace_per_player, ace_pool_cap,
    registered: []
  });
  if (error) return showToast('Error adding event.', true);
  showToast('Event added!');
  renderAdmin(); renderSplash();
}

async function toggleCancel(id, cancel) {
  await db.from('events').update({ cancelled: cancel }).eq('id', id);
  showToast(cancel ? 'Event cancelled.' : 'Event restored.');
  renderAdmin(); renderSplash();
}

async function deleteEvent(id) {
  await db.from('events').delete().eq('id', id);
  showToast('Event deleted.');
  renderAdmin(); renderSplash();
}

function insertSymbol(sym) {
  const ta = document.getElementById('quickNoteInput');
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + sym + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + sym.length;
  ta.focus();
}

const COURSE_COORDS = {
  'Valmont DGC': {lat:40.0150,lon:-105.2316},
  'Harlow Platts Community Park': {lat:40.0094,lon:-105.2616},
  'East Interlocken Park': {lat:39.9555,lon:-105.1074},
  'Wondervu DGC': {lat:39.9501,lon:-105.4050}
};

async function generateSeasonSchedule() {
  const course=document.getElementById('recurCourse')?.value, type=document.getElementById('recurType')?.value;
  const endDate=document.getElementById('recurEndDate')?.value, title=document.getElementById('recurTitle')?.value||(type==='wednesday'?'Wednesday Night Tag League':'Saturday Tag Match');
  const acePerPlayer=parseFloat(document.getElementById('recurAce')?.value||'5');
  if(!course||!endDate){alert('Fill in course and end date');return;}
  const btn=document.getElementById('generateSeasonBtn');
  if(btn){btn.disabled=true;btn.textContent='Generating…';}
  const seasonStart=localDateFromStr('2026-07-04'),seasonEnd=localDateFromStr(endDate),targetDay=type==='wednesday'?3:6;
  const coords=COURSE_COORDS[course]||{lat:40.0150,lon:-105.2316};
  let d=new Date(seasonStart); while(d.getDay()!==targetDay) d.setDate(d.getDate()+1);
  const toInsert=[]; let created=0,errors=0;
  while(d<=seasonEnd){
    const dateStr=localDateStr(d); let timeStr='12:00';
    if(type==='wednesday'){
      try{
        const sr=await fetch('https://api.sunrise-sunset.org/json?lat='+coords.lat+'&lng='+coords.lon+'&date='+dateStr+'&formatted=0');
        const sd=await sr.json(); const sunsetUTC=new Date(sd.results.sunset);
        const offsetHrs=(d.getMonth()>=2&&d.getMonth()<=10)?6:7;
        const startLocal=new Date(sunsetUTC.getTime()-(offsetHrs*3600000)-(2*60+15)*60000);
        timeStr=startLocal.toTimeString().substring(0,5);
      }catch(e){timeStr='18:00';}
    }
    toInsert.push({title,date:dateStr,time:timeStr,course,lat:coords.lat,lon:coords.lon,ace_per_player:acePerPlayer,registered:'[]',season:'2026',recurring:true,recur_day:type,recur_time:timeStr});
    d.setDate(d.getDate()+7);
  }
  for(let i=0;i<toInsert.length;i+=5){
    const batch=toInsert.slice(i,i+5);
    const {error}=await db.from('events').insert(batch);
    if(error) errors+=batch.length; else created+=batch.length;
  }
  if(btn){btn.disabled=false;btn.textContent='🗓 Generate Season';}
  alert('Created '+created+' events'+(errors?' ('+errors+' errors)':'')+'!');
  await loadEvents(); renderAdmin();
}

async function addPlayer() {
  const name = document.getElementById('npName').value.trim();
  const pdga = document.getElementById('npPDGA').value.trim();
  const tagVal = document.getElementById('npTag').value.trim();
  const tag = tagVal ? parseInt(tagVal) : null;
  const role = document.getElementById('npRole').value;
  if (!name) return showToast('Enter a name.', true);
  if (tag && state.players.find(p => p.tag === tag)) return showToast(`Tag #${tag} already assigned.`, true);
  const { error } = await db.from('players').insert({ name, pdga, tag, role, last_change: 'same' });
  if (error) return showToast('Error adding player.', true);
  document.getElementById('npName').value = '';
  document.getElementById('npPDGA').value = '';
  document.getElementById('npTag').value = '';
  showToast(`${name} added!`);
  renderAdmin();
}

async function changeRole(id, role) {
  await db.from('players').update({ role }).eq('id', id);
  const p = state.players.find(p => p.id === id);
  if (p) p.role = role;
  showToast('Role updated.');
}
