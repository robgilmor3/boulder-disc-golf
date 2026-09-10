// ═══════════════════════════════════════════════════════
//  SIDE MATCHES (Master Spec Section 3)
// ═══════════════════════════════════════════════════════
// Informal tag matches outside a scheduled event. Same tag redistribution
// logic as official matches (calculateResults in match.js), no ace pool,
// no CTP. Saved to the side_matches table (see STATUS.md for the
// CREATE TABLE SQL if it hasn't been run yet).

let sideMatchState = { selectedPlayers: [], course: '', step: 'players', scores: {}, pendingResults: null };

async function openSideMatchModal() {
  await loadPlayers();
  sideMatchState = { selectedPlayers: [], course: '', step: 'players', scores: {}, pendingResults: null };
  renderSideMatchModal();
  openModal('sideMatchModal');
}

function renderSideMatchModal() {
  const el = document.getElementById('sideMatchBody');
  if (!el) return;
  if (sideMatchState.step === 'players') el.innerHTML = renderSideMatchPlayersStep();
  else if (sideMatchState.step === 'scores') el.innerHTML = renderSideMatchScoresStep();
  else el.innerHTML = renderSideMatchResultsStep();
}

function renderSideMatchPlayersStep() {
  const sorted = [...state.players].sort((a, b) => (a.tag ?? 9999) - (b.tag ?? 9999));
  const chips = sorted.map(p => {
    const selected = sideMatchState.selectedPlayers.find(sp => sp.name === p.name);
    return `<button onclick="toggleSideMatchPlayer(${attrStr(p.name)})" style="padding:8px 14px;border-radius:20px;border:1px solid ${selected ? 'var(--green)' : 'var(--border)'};background:${selected ? 'var(--green)' : 'transparent'};color:${selected ? '#04140c' : 'var(--text)'};font-size:13px;cursor:pointer;transition:all 0.2s;margin:3px;">${p.name}${selected ? ' ✓' : ''}</button>`;
  }).join('');

  return `
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Tap players to add them to the side match (minimum 2).</p>
    <div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${chips || '<span style="color:var(--text-muted);font-size:13px">No players in the roster yet.</span>'}</div>
    <div class="form-row">
      <label>Course <span style="font-size:11px;font-weight:300;color:var(--text-muted)">(optional)</span></label>
      <select id="sideMatchCourseSelect" onchange="onSideMatchCourseChange(this.value)">
        <option value="">Unspecified</option>
        <option>Valmont DGC</option>
        <option>Harlow Platts Community Park</option>
        <option>East Interlocken Park</option>
        <option>Wondervu DGC</option>
        <option value="__other__">Other (type below)...</option>
      </select>
    </div>
    <div class="form-row" id="sideMatchCourseOtherRow" style="display:none">
      <label>Course name</label>
      <input type="text" id="sideMatchCourseOther" placeholder="Type course name..." oninput="sideMatchState.course = this.value">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal('sideMatchModal')">Cancel</button>
      <button class="btn btn-primary" onclick="goToSideMatchScores()">Next →</button>
    </div>
  `;
}

function toggleSideMatchPlayer(name) {
  const idx = sideMatchState.selectedPlayers.findIndex(p => p.name === name);
  if (idx >= 0) {
    sideMatchState.selectedPlayers.splice(idx, 1);
  } else {
    const player = state.players.find(p => p.name === name);
    sideMatchState.selectedPlayers.push({ name, tag: player?.tag ?? null });
  }
  renderSideMatchModal();
}

function onSideMatchCourseChange(val) {
  const otherRow = document.getElementById('sideMatchCourseOtherRow');
  if (val === '__other__') {
    if (otherRow) otherRow.style.display = 'block';
    sideMatchState.course = document.getElementById('sideMatchCourseOther')?.value || '';
  } else {
    if (otherRow) otherRow.style.display = 'none';
    sideMatchState.course = val;
  }
}

function goToSideMatchScores() {
  if (sideMatchState.selectedPlayers.length < 2) return showToast('Pick at least 2 players.', true);
  sideMatchState.step = 'scores';
  renderSideMatchModal();
}

function backToSideMatchPlayers() {
  sideMatchState.step = 'players';
  renderSideMatchModal();
}

function renderSideMatchScoresStep() {
  const rows = sideMatchState.selectedPlayers.map(p => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="flex:1">${p.name}</span>
      <span style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;">Tag #${p.tag ?? '—'}</span>
      <input type="number" min="18" max="120" placeholder="Score" style="width:80px"
        value="${sideMatchState.scores[p.name] ?? ''}"
        onchange="sideMatchState.scores[${attrStr(p.name)}] = parseInt(this.value)">
    </div>
  `).join('');
  const courseLabel = sideMatchState.course || 'Unspecified course';

  return `
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${courseLabel} · enter each player's total score.</p>
    <div>${rows}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="backToSideMatchPlayers()">← Back</button>
      <button class="btn btn-primary" onclick="calculateSideMatchResults()">Calculate →</button>
    </div>
  `;
}

// Same redistribution logic as calculateResults() in match.js: best score
// gets the lowest tag among the tags brought to this match; ties go to
// whoever had the better (lower) incoming tag.
function calculateSideMatchResults() {
  const scored = sideMatchState.selectedPlayers.map(p => ({ ...p, score: sideMatchState.scores[p.name] }));
  if (scored.some(r => !r.score || isNaN(r.score))) return showToast('All players need a score.', true);

  scored.sort((a, b) => a.score !== b.score ? a.score - b.score : (a.tag ?? 9999) - (b.tag ?? 9999));
  const tags = scored.map(r => r.tag ?? 9999).sort((a, b) => a - b);
  const results = scored.map((r, i) => ({ ...r, newTag: tags[i], finish: i + 1 }));

  sideMatchState.pendingResults = results;
  sideMatchState.step = 'results';
  renderSideMatchModal();
}

function backToSideMatchScores() {
  sideMatchState.step = 'scores';
  renderSideMatchModal();
}

function renderSideMatchResultsStep() {
  const rows = sideMatchState.pendingResults.map(r => {
    const oldTag = r.tag ?? null;
    const better = oldTag != null && r.newTag < oldTag;
    const worse = oldTag != null && r.newTag > oldTag;
    const arrow = better ? '▲' : worse ? '▼' : '—';
    const arrowColor = better ? 'var(--green)' : worse ? '#ff6b6b' : 'var(--text-muted)';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--gold);min-width:26px;">${r.finish}</span>
      <span style="flex:1">${r.name}</span>
      <span style="font-family:'DM Mono',monospace;color:var(--text-muted);margin-right:10px;">${r.score}✦</span>
      <span style="font-family:'DM Mono',monospace;">#${oldTag ?? '—'} → #${r.newTag}</span>
      <span style="color:${arrowColor};margin-left:8px;">${arrow}</span>
    </div>`;
  }).join('');

  return `
    <div>${rows}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="backToSideMatchScores()">← Back</button>
      <button class="btn btn-primary" onclick="commitSideMatch()">✓ Commit Side Match</button>
    </div>
  `;
}

async function commitSideMatch() {
  if (!sideMatchState.pendingResults) return;
  const now = new Date();
  const dateStr = localDateStr(now);
  const timeStr = now.toTimeString().slice(0, 5);
  const course = sideMatchState.course || null;

  // Update player tags in the ledger — same fields commitResults() updates for
  // official matches (tag, last_change), plus tag_history since this record
  // won't otherwise show up in that player's official match count.
  for (const r of sideMatchState.pendingResults) {
    const player = state.players.find(p => p.name === r.name);
    if (!player) continue;
    const oldTag = player.tag;
    const change = oldTag == null ? 'same' : (r.newTag < oldTag ? 'up' : r.newTag > oldTag ? 'down' : 'same');
    const history = Array.isArray(player.tag_history) ? player.tag_history.slice()
      : (typeof player.tag_history === 'string' ? (JSON.parse(player.tag_history || '[]')) : []);
    history.push({ date: dateStr, from: oldTag, to: r.newTag, reason: 'side_match' });
    try {
      const { error } = await db.from('players')
        .update({ tag: r.newTag, last_change: change, tag_history: JSON.stringify(history) })
        .eq('id', player.id);
      if (!error) { player.tag = r.newTag; player.last_change = change; player.tag_history = history; }
    } catch(e) { console.warn('commitSideMatch player update:', e); }
  }

  let saveFailed = false;
  try {
    const { error } = await db.from('side_matches').insert({
      date: dateStr,
      time: timeStr,
      course,
      players: JSON.stringify(sideMatchState.pendingResults),
      created_by: state.currentUser?.name || 'Guest',
    });
    if (error) throw error;
  } catch(e) {
    console.warn('side_matches insert:', e);
    saveFailed = true;
  }

  closeModal('sideMatchModal');
  if (saveFailed) {
    showToast('Tags updated, but the side match record could not be saved — ask Rob to run the side_matches setup SQL (see STATUS.md).', true);
  } else {
    showToast('✓ Side match committed! Tags updated.');
  }

  if (document.getElementById('page-ledger')?.classList.contains('active')) renderLedger();
  if (document.getElementById('page-history')?.classList.contains('active') && typeof loadHistorySideMatches === 'function') {
    await loadHistorySideMatches();
    renderHistoryTabContent();
  }
}
