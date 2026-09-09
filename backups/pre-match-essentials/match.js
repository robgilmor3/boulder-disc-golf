// ═══════════════════════════════════════════════════════
//  MATCH FLOW
// ═══════════════════════════════════════════════════════

async function initMatch() {
  const today = localDateStr();

  // Auto-detect today's event if none selected yet
  if (!state.selectedEventId && state.events?.length) {
    const todayEv = state.events.find(ev => !ev.cancelled && ev.date === today)
                 || state.events.find(ev => !ev.cancelled && ev.date >= today);
    if (todayEv) {
      state.selectedEventId = todayEv.id;
    }
  }

  // Pre-fill event details from the selected event
  if (state.selectedEventId) {
    const ev = state.events?.find(e => e.id === state.selectedEventId);
    if (ev) {
      const courseEl = document.getElementById('matchCourse');
      if (courseEl) {
        // Select matching option or add it
        const opt = [...courseEl.options].find(o => o.value === ev.course);
        if (opt) { courseEl.value = ev.course; }
        else {
          const o = new Option(ev.course, ev.course, true, true);
          courseEl.add(o);
        }
      }
      if (ev.date) document.getElementById('matchDate').value = ev.date;
      if (ev.time) document.getElementById('matchTime').value = ev.time;
    }

    // Load registrants fresh from Supabase
    try {
      const { data: evData } = await db.from('events').select('registered').eq('id', state.selectedEventId).single();
      if (evData?.registered) {
        state.registrants = Array.isArray(evData.registered)
          ? evData.registered : JSON.parse(evData.registered);
        // Sync back to state.events too
        const stateEv = state.events?.find(e => e.id === state.selectedEventId);
        if (stateEv) stateEv.registered = state.registrants;
      } else {
        state.registrants = [];
      }
    } catch(e) { console.error('load registrants:', e); state.registrants = []; }
  } else {
    document.getElementById('matchDate').value = today;
  }

  renderRegistrantList();
}

// ── Persist registrants to Supabase + update home screen count ──
async function persistRegistrants() {
  if (!state.selectedEventId) return;
  try {
    await db.from('events')
      .update({ registered: JSON.stringify(state.registrants) })
      .eq('id', state.selectedEventId);
    // Keep home screen count in sync
    const badge = document.getElementById('reg-count-' + state.selectedEventId);
    if (badge) badge.textContent = '\u{1F465} ' + state.registrants.length + ' registered';
    // Keep state.events in sync so re-renders are accurate
    const ev = state.events.find(e => e.id === state.selectedEventId);
    if (ev) ev.registered = state.registrants;
  } catch(e) { console.error('persist registrants:', e); }
}

// ── Show registered players for an event (tap the count) ──
function showRegisteredPlayers(eventId) {
  const ev = state.events.find(e => e.id === eventId);
  if (!ev) return;
  const registered = Array.isArray(ev.registered) ? ev.registered
    : (ev.registered ? JSON.parse(ev.registered) : []);
  if (!registered.length) { showToast('No players registered yet.'); return; }
  const sorted = [...registered].sort((a, b) => (a.tag ?? 999) - (b.tag ?? 999));
  const listHtml = sorted.map(r =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--orange);min-width:44px;">#${r.tag}</span>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:1px;">${r.name}</span>
    </div>`
  ).join('');
  document.getElementById('regListModalTitle').textContent =
    (ev.title || 'Tag Match') + ' · ' + registered.length + ' registered';
  document.getElementById('regListModalBody').innerHTML = listHtml;
  openModal('regListModal');
}

let pdgaLookupTimer = null;

function searchPlayer(val) {
  const dd = document.getElementById('playerDropdown');
  const status = document.getElementById('pdgaLookupStatus');

  if (!val || val.length < 2) {
    dd.style.display = 'none';
    status.style.display = 'none';
    document.getElementById('newPlayerFields').style.display = 'none';
    return;
  }

  const fl = val.toLowerCase();
  const localMatches = state.players.filter(p =>
    p.name.toLowerCase().includes(fl) || (p.pdga && p.pdga.includes(fl))
  ).slice(0, 6);

  if (localMatches.length) {
    document.getElementById('newPlayerFields').style.display = 'none';
    status.style.display = 'none';
    dd.style.display = 'block';
    dd.innerHTML = localMatches.map(p => `
      <div onmousedown="event.preventDefault();selectPlayer(${attrStr(p.name)}, ${p.tag}, ${attrStr(p.pdga)})" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;" onmouseenter="this.style.background='var(--surface)'" onmouseleave="this.style.background=''">
        <strong>${p.name}</strong>
        <span style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;margin-left:8px">Tag #${p.tag}${p.pdga ? ' · PDGA #'+p.pdga : ''}</span>
      </div>
    `).join('');
    return;
  }

  // Not in local DB — check if it looks like a PDGA number
  dd.style.display = 'none';
  clearTimeout(pdgaLookupTimer);

  if (/^\d{4,8}$/.test(val.trim())) {
    // Looks like a PDGA number — look it up
    status.style.display = 'block';
    status.innerHTML = '🔍 Looking up PDGA #' + val.trim() + '...';
    pdgaLookupTimer = setTimeout(() => lookupPDGANumber(val.trim()), 600);
  } else if (val.trim().includes(' ') && val.trim().length >= 4) {
    // Looks like a full name — offer PDGA search
    status.style.display = 'block';
    status.innerHTML = '<span style="color:var(--text-muted)">Not in local roster. </span><a href="#" onclick="lookupPDGAName(event, ' + JSON.stringify(val.trim()) + ')" style="color:var(--green);">Search PDGA →</a> or add as new player below.';
    document.getElementById('newPlayerFields').style.display = 'block';
    document.getElementById('newPlayerName').value = val.trim();
  } else {
    status.style.display = 'none';
    document.getElementById('newPlayerFields').style.display = 'block';
  }
}

async function lookupPDGANumber(pdgaNum) {
  const status = document.getElementById('pdgaLookupStatus');
  try {
    const res = await fetch('/api/pdga?pdga=' + pdgaNum);
    const data = await res.json();
    if (data.found && data.name) {
      status.innerHTML = '✅ Found: <strong style="color:var(--text)">' + data.name + '</strong> · <a href="#" onclick="selectPDGAResult(event, ' + JSON.stringify(data.name) + ', ' + JSON.stringify(pdgaNum) + ')" style="color:var(--green);">Use this player</a>';
    } else {
      status.innerHTML = '<span style="color:var(--text-muted)">PDGA #' + pdgaNum + ' not found. Add as new player:</span>';
      document.getElementById('newPlayerFields').style.display = 'block';
      document.getElementById('newPlayerPDGA').value = pdgaNum;
    }
  } catch(e) {
    status.innerHTML = '<span style="color:var(--text-muted)">PDGA lookup unavailable. Add manually:</span>';
    document.getElementById('newPlayerFields').style.display = 'block';
    document.getElementById('newPlayerPDGA').value = pdgaNum;
  }
}

async function lookupPDGAName(e, name) {
  e.preventDefault();
  const status = document.getElementById('pdgaLookupStatus');
  const dd = document.getElementById('playerDropdown');
  status.innerHTML = '🔍 Searching PDGA for "' + name + '"...';
  try {
    const res = await fetch('/api/pdga?name=' + encodeURIComponent(name));
    const data = await res.json();
    if (data.found && data.players && data.players.length) {
      dd.style.display = 'block';
      dd.innerHTML = data.players.map(p => `
        <div onmousedown="selectPDGAResult(event, ${attrStr(p.name)}, ${attrStr(p.pdga)})" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;" onmouseenter="this.style.background='var(--surface)'" onmouseleave="this.style.background=''">
          <strong>${p.name}</strong>
          <span style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;margin-left:8px">PDGA #${p.pdga}${p.city ? ' · ' + p.city + (p.state ? ', '+p.state : '') : ''}</span>
        </div>
      `).join('');
      status.innerHTML = data.players.length + ' PDGA result' + (data.players.length > 1 ? 's' : '') + ' — select or add manually below.';
    } else {
      status.innerHTML = '<span style="color:var(--text-muted)">No PDGA results. Add as new player below.</span>';
    }
  } catch(e) {
    status.innerHTML = '<span style="color:var(--text-muted)">PDGA lookup unavailable.</span>';
  }
}

function selectPDGAResult(e, name, pdgaNum) {
  if (e && e.preventDefault) e.preventDefault();
  if (e && e.stopPropagation) e.stopPropagation();
  document.getElementById('regSearch').value = name;
  document.getElementById('newPlayerName').value = name;
  document.getElementById('newPlayerPDGA').value = pdgaNum || '';
  document.getElementById('newPlayerFields').style.display = 'block';
  document.getElementById('playerDropdown').style.display = 'none';
  document.getElementById('pdgaLookupStatus').innerHTML = '✅ <strong style="color:var(--text)">' + name + '</strong>' + (pdgaNum ? ' · PDGA #' + pdgaNum : '') + ' — enter their tag # and click Add.';
  document.getElementById('regTag').focus();
}

function selectPlayer(name, tag, pdga) {
  document.getElementById('regSearch').value = name;
  document.getElementById('regTag').value = tag;
  document.getElementById('playerDropdown').style.display = 'none';
  document.getElementById('pdgaLookupStatus').style.display = 'none';
  document.getElementById('newPlayerFields').style.display = 'none';
}

function searchPlayerModal(val) {
  const dd = document.getElementById('modalDropdown');
  if (!val || val.length < 2) { dd.style.display = 'none'; return; }
  const fl = val.toLowerCase();
  const matches = state.players.filter(p =>
    p.name.toLowerCase().includes(fl) || (p.pdga && p.pdga.includes(fl))
  ).slice(0, 5);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  dd.innerHTML = matches.map(p => `
    <div onmousedown="event.preventDefault();selectPlayerModal(${attrStr(p.name)}, ${p.tag})" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;" onmouseenter="this.style.background='var(--surface)'" onmouseleave="this.style.background=''">
      <strong>${p.name}</strong>
      <span style="font-size:11px;color:var(--text-muted);margin-left:8px">Tag #${p.tag}</span>
    </div>
  `).join('');
}

function selectPlayerModal(name, tag) {
  document.getElementById('modalRegSearch').value = name;
  document.getElementById('modalTag').value = tag;
  document.getElementById('modalDropdown').style.display = 'none';
}

async function addRegistrant() {
  const searchVal = document.getElementById('regSearch').value.trim();
  const nickname = document.getElementById('regNickname')?.value.trim() || '';
    const newName = document.getElementById('newPlayerName').value.trim();
  const name = newName || searchVal;
  const pdga = document.getElementById('newPlayerPDGA') ? document.getElementById('newPlayerPDGA').value.trim() : '';
  const tag = parseInt(document.getElementById('regTag').value);

  if (!name) return showToast('Enter a player name.', true);
  if (!tag || tag < 1 || tag > 350) return showToast('Enter a valid tag # (1–350).', true);
  if (state.registrants.find(r => r.name === name)) return showToast(`${name} already registered.`, true);
  if (state.registrants.find(r => r.tag === tag)) return showToast(`Tag #${tag} already in match.`, true);

  // Check if new player (not in local DB) — mark for Supabase insert on commit
  const existingPlayer = state.players.find(p => p.name === name);
  const isNew = !existingPlayer;

  state.registrants.push({ name, tag, pdga: pdga || (existingPlayer ? existingPlayer.pdga : ''), score: null, isNew });
  clearRegForm();
  renderRegistrantList();
  await persistRegistrants();
  showToast(`${name} added — Tag #${tag}${isNew ? ' (new player)' : ''}`);
}

function clearRegForm() {
  document.getElementById('regSearch').value = '';
  document.getElementById('regTag').value = '';
  document.getElementById('regNickname').value = '';
  document.getElementById('newPlayerName').value = '';
  if (document.getElementById('newPlayerPDGA')) document.getElementById('newPlayerPDGA').value = '';
  document.getElementById('newPlayerFields').style.display = 'none';
  document.getElementById('playerDropdown').style.display = 'none';
  document.getElementById('pdgaLookupStatus').style.display = 'none';
}

function renderRegistrantList() {
  const el = document.getElementById('registrantList');
  const count = document.getElementById('regCount');
  const btn = document.getElementById('proceedBtn');
  count.textContent = `(${state.registrants.length} players)`;
  btn.style.display = state.registrants.length >= 2 ? 'flex' : 'none';

  if (!state.registrants.length) {
    el.innerHTML = '<div class="empty">No players added yet.</div>';
    return;
  }

  el.innerHTML = [...state.registrants].sort((a,b) => a.tag - b.tag).map(r => `
    <div class="registrant-item">
      <span class="reg-tag">#${r.tag}</span>
      <span class="reg-name">${r.name}</span>
      <button class="btn btn-danger btn-sm" onclick="removeRegistrant(${attrStr(r.name)})">✕</button>
    </div>
  `).join('');
}

function removeRegistrant(name) {
  state.registrants = state.registrants.filter(r => r.name !== name);
  renderRegistrantList();
  persistRegistrants();
}

function goToScoring() {
  setStep(2);
  renderScoreList();
}

function renderScoreList() {
  const el = document.getElementById('scoreList');
  const btn = document.getElementById('calcTagsBtn');
  const sorted = [...state.registrants].sort((a,b) => a.tag - b.tag);
  const allScored = sorted.length > 0 && sorted.every(r => r.score && !isNaN(r.score));
  if (btn) btn.disabled = !allScored;

  el.innerHTML = sorted.map(r => {
    const hasScore = r.score && !isNaN(parseInt(r.score));
    const sid = 'score_' + r.name.replace(/\W/g,'_');
    return `
      <div class="score-status-item">
        <span class="reg-tag">#${r.tag}</span>
        <span class="reg-name">${r.name}</span>
        ${hasScore
          ? `<span class="score-badge-done" title="${r.score_by === 'player' ? 'Player submitted' : 'TD entered'}">✅</span>
             <span class="score-done-val">${r.score}✦</span>`
          : `<span class="score-badge-pending">⏳</span>
             <input class="score-input score-pending-input" type="number" min="18" max="120"
               placeholder="—" id="${sid}"
               onchange="saveTDScore(${attrStr(r.name)}, this.value)">`
        }
      </div>`;
  }).join('');
}

function saveTDScore(name, val) {
  const score = parseInt(val);
  if (!score || isNaN(score) || score < 18) return;
  const r = state.registrants.find(r => r.name === name);
  if (!r) return;
  r.score = score;
  r.score_by = 'td';
  persistRegistrants();
  renderScoreList();
}

async function refreshTDScores() {
  if (!state.selectedEventId) return;
  try {
    const { data: evData } = await db.from('events').select('registered').eq('id', state.selectedEventId).single();
    if (evData?.registered) {
      state.registrants = Array.isArray(evData.registered) ? evData.registered : JSON.parse(evData.registered);
      const stateEv = state.events?.find(e => e.id === state.selectedEventId);
      if (stateEv) stateEv.registered = state.registrants;
    }
  } catch(e) { console.error('refresh scores:', e); }
  renderScoreList();
  showToast('Scores refreshed.');
}

async function submitPlayerScore(eventId) {
  const nameEl = document.getElementById('score-player-' + eventId);
  const scoreEl = document.getElementById('score-val-' + eventId);
  const name = nameEl?.value;
  const score = parseInt(scoreEl?.value);
  if (!name) return showToast('Select your name first.', true);
  if (!score || isNaN(score) || score < 18) return showToast('Enter a valid stroke count.', true);

  try {
    const { data: evData } = await db.from('events').select('registered').eq('id', eventId).single();
    let registrants = evData?.registered
      ? (Array.isArray(evData.registered) ? evData.registered : JSON.parse(evData.registered)) : [];
    const idx = registrants.findIndex(r => r.name === name);
    if (idx === -1) return showToast('Name not found in this event.', true);

    registrants[idx].score = score;
    registrants[idx].score_by = 'player';
    registrants[idx].score_at = new Date().toISOString();

    const { error } = await db.from('events')
      .update({ registered: JSON.stringify(registrants) }).eq('id', eventId);
    if (error) throw error;

    // Sync local state
    const stateEv = state.events?.find(e => e.id === eventId);
    if (stateEv) stateEv.registered = registrants;
    if (state.selectedEventId === eventId) state.registrants = registrants;

    const section = document.getElementById('score-submit-' + eventId);
    if (section) section.innerHTML =
      `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);color:var(--green);font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:1px;">✅ Score submitted for ${name} — ${score} strokes</div>`;
    showToast('Score submitted!');
  } catch(e) {
    console.error('submitPlayerScore:', e);
    showToast('Error saving score.', true);
  }
}

function calculateResults() {
  const scored = state.registrants.map(r => {
    // Use player-submitted score, or fall back to TD's manual input
    const inp = document.getElementById('score_' + r.name.replace(/\W/g,'_'));
    const score = (r.score && !isNaN(parseInt(r.score)))
      ? parseInt(r.score)
      : (inp ? parseInt(inp.value) : null);
    return { ...r, score };
  });

  if (scored.some(r => !r.score || isNaN(r.score))) return showToast('All players need a score before committing.', true);

  scored.sort((a,b) => a.score !== b.score ? a.score - b.score : a.tag - b.tag);
  const tags = [...scored].map(r => r.tag).sort((a,b) => a-b);
  const results = scored.map((r,i) => ({ ...r, newTag: tags[i], finish: i+1 }));
  state.pendingResults = results;

  setStep(3);
  const el = document.getElementById('resultsList');
  el.innerHTML = results.map(r => {
    const better = r.newTag < r.tag;
    const worse = r.newTag > r.tag;
    const fClass = r.finish === 1 ? 'f1' : r.finish === 2 ? 'f2' : r.finish === 3 ? 'f3' : '';
    const arrow = better ? '▲' : worse ? '▼' : '—';
    const arrowClass = better ? 'better' : worse ? 'worse' : '';
    const tagClass = better ? 'better' : worse ? 'worse' : 'same';
    const diff = r.tag - r.newTag;
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';
    return `
      <div class="result-item">
        <span class="finish-num ${fClass}">${r.finish}</span>
        <span class="result-name">${r.name}</span>
        <span style="font-size:12px;color:var(--text-muted);font-family:'DM Mono',monospace">${r.score}✦</span>
        <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text-muted)">#${r.tag}</span>
        <span class="tag-arrow ${arrowClass}">${arrow}</span>
        <span class="new-tag ${tagClass}" style="font-family:'Bebas Neue',sans-serif;font-size:22px">#${r.newTag}</span>
        <span style="font-size:10px;color:var(--text-muted);font-family:'DM Mono',monospace">${diffStr}</span>
      </div>
    `;
  }).join('');
}

async function commitResults() {
  if (!state.pendingResults) return;

  for (const r of state.pendingResults) {
    const player = state.players.find(p => p.name === r.name);
    if (player) {
      // Existing player — update tag
      const oldTag = player.tag;
      const change = r.newTag < oldTag ? 'up' : r.newTag > oldTag ? 'down' : 'same';
      const { error } = await db.from('players').update({ tag: r.newTag, last_change: change }).eq('id', player.id);
      if (!error) { player.tag = r.newTag; player.last_change = change; }
    } else if (r.isNew) {
      // New player — insert into Supabase
      const { data, error } = await db.from('players').insert({
        name: r.name,
        pdga: r.pdga || null,
        tag: r.newTag,
        role: 'player',
        last_change: 'same'
      }).select().single();
      if (!error && data) state.players.push(data);
    }
  }

  // Update match_count and best_tag per player
  for (const r of state.pendingResults) {
    const player = state.players.find(p => p.name === r.name);
    if (player) {
      const newBest = player.best_tag ? Math.min(player.best_tag, r.newTag) : r.newTag;
      const newCount = (player.match_count || 0) + 1;
      await db.from('players').update({ match_count: newCount, best_tag: newBest }).eq('id', player.id);
      player.match_count = newCount;
      player.best_tag = newBest;
    }
  }

  // Update ace pool balance in settings
  const aceAdded = state.pendingResults.length * 1; // $1/player default
  const newAceBalance = (state.acePool || 0) + aceAdded;
  state.acePool = newAceBalance;
  await db.from('settings').upsert({ key: 'ace_pool_balance', value: String(newAceBalance) });

  // Log match
  await db.from('match_history').insert({
    date: document.getElementById('matchDate').value,
    course: document.getElementById('matchCourse').value,
    player_count: state.pendingResults.length,
    results: JSON.stringify(state.pendingResults),
  });

  state.registrants = [];
  state.pendingResults = null;
  setStep(1);
  renderRegistrantList();
  showToast('✓ Tags updated! Ledger committed.');
  setTimeout(() => showPage('ledger'), 1500);
}

function setStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById('matchStep'+i).style.display = i === n ? 'block' : 'none';
    const dot = document.getElementById('step'+i+'dot');
    dot.classList.toggle('active', i === n);
    dot.classList.toggle('done', i < n);
  });
}

function backToStep1() { setStep(1); }
function backToStep2() { setStep(2); }
function saveMatchState() {}
