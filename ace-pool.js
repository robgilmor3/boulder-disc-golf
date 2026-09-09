// ═══════════════════════════════════════════════════════
//  ACE POOL — two-pot payout system (Master Spec Section 4)
// ═══════════════════════════════════════════════════════
//
// Two pots per course (or per shared pool group):
//   main    — the active pot that pays out, capped per course
//   holding — overflow once main hits its cap; tops main back up after a payout
//
// State lives in the `settings` table as plain key/value rows:
//   ace_pool_main_<group>     — numeric string
//   ace_pool_holding_<group>  — numeric string
//   ace_pool_config_<course>  — JSON: { cap, poolGroup, holeModifiers, defaultBuyin }
//
// `group` is the config's poolGroup if the course shares a pool with another
// course, otherwise the course name itself.

const ACE_POOL_DEFAULT_CONFIGS = {
  'Valmont DGC': { cap: 100, poolGroup: null, holeModifiers: { '5': 0.5 }, defaultBuyin: 1 },
};

let acePoolConfigCache = {};   // course -> config
let acePoolBalanceCache = {};  // group  -> { main, holding }

function acePoolDefaultConfig(course) {
  return ACE_POOL_DEFAULT_CONFIGS[course]
    ? { ...ACE_POOL_DEFAULT_CONFIGS[course], holeModifiers: { ...ACE_POOL_DEFAULT_CONFIGS[course].holeModifiers } }
    : { cap: null, poolGroup: null, holeModifiers: {}, defaultBuyin: 1 };
}

async function getAcePoolConfig(course) {
  if (acePoolConfigCache[course]) return acePoolConfigCache[course];
  let cfg = acePoolDefaultConfig(course);
  try {
    const { data } = await db.from('settings').select('value').eq('key', 'ace_pool_config_' + course).maybeSingle();
    if (data?.value) cfg = { ...cfg, ...JSON.parse(data.value) };
  } catch(e) { /* no saved config yet — default stands */ }
  acePoolConfigCache[course] = cfg;
  return cfg;
}

async function saveAcePoolConfig(course, cfg) {
  acePoolConfigCache[course] = cfg;
  await db.from('settings').upsert({ key: 'ace_pool_config_' + course, value: JSON.stringify(cfg) }, { onConflict: 'key' });
  return cfg;
}

function acePoolGroupFor(course, cfg) {
  return (cfg && cfg.poolGroup) || course;
}

async function loadAcePoolBalances(course) {
  const cfg = await getAcePoolConfig(course);
  const group = acePoolGroupFor(course, cfg);
  if (acePoolBalanceCache[group]) return { ...acePoolBalanceCache[group], group };
  let main = 0, holding = 0;
  try {
    const { data } = await db.from('settings').select('key,value')
      .in('key', ['ace_pool_main_' + group, 'ace_pool_holding_' + group]);
    (data || []).forEach(row => {
      if (row.key === 'ace_pool_main_' + group) main = parseFloat(row.value) || 0;
      if (row.key === 'ace_pool_holding_' + group) holding = parseFloat(row.value) || 0;
    });
  } catch(e) { console.warn('loadAcePoolBalances:', e); }
  acePoolBalanceCache[group] = { main, holding };
  return { main, holding, group };
}

async function saveAcePoolBalances(group, main, holding) {
  acePoolBalanceCache[group] = { main, holding };
  await db.from('settings').upsert([
    { key: 'ace_pool_main_' + group, value: String(main) },
    { key: 'ace_pool_holding_' + group, value: String(holding) },
  ], { onConflict: 'key' });
}

// Prime the cache for a course — call before rendering anything that shows its balance.
async function ensureAcePoolLoaded(course) {
  await getAcePoolConfig(course);
  await loadAcePoolBalances(course);
}

// Sync getters for display — 0 if the cache hasn't been primed yet.
function getCachedAcePoolMain(course) {
  const cfg = acePoolConfigCache[course];
  const group = acePoolGroupFor(course, cfg);
  return acePoolBalanceCache[group] ? acePoolBalanceCache[group].main : 0;
}
function getCachedAcePoolHolding(course) {
  const cfg = acePoolConfigCache[course];
  const group = acePoolGroupFor(course, cfg);
  return acePoolBalanceCache[group] ? acePoolBalanceCache[group].holding : 0;
}

// Money in/out. Positive delta adds respecting the cap (overflow to holding).
// Negative delta removes from holding first, then main — used when a paid
// checkbox is unchecked to correct a mistake.
async function adjustAcePool(course, delta) {
  const cfg = await getAcePoolConfig(course);
  const group = acePoolGroupFor(course, cfg);
  const bal = await loadAcePoolBalances(course);
  let { main, holding } = bal;
  if (delta >= 0) {
    if (cfg.cap == null) {
      main += delta;
    } else {
      const room = Math.max(0, cfg.cap - main);
      const toMain = Math.min(room, delta);
      main += toMain;
      holding += (delta - toMain);
    }
  } else {
    let remove = -delta;
    const fromHolding = Math.min(holding, remove);
    holding -= fromHolding;
    remove -= fromHolding;
    main = Math.max(0, main - remove);
  }
  await saveAcePoolBalances(group, main, holding);
  return { main, holding };
}

function getHoleShareMultiplier(cfg, hole) {
  if (!cfg || !cfg.holeModifiers) return 1;
  const m = cfg.holeModifiers[String(hole)];
  return (typeof m === 'number' && !isNaN(m)) ? m : 1;
}

// Pure math: given a pot amount and a list of aces [{player, hole}], compute
// shares and payout per player.
//
// perShare divides the pot by max(totalShares, 1) rather than totalShares
// directly — confirmed against the spec's own worked examples: a single
// half-share ace (Valmont hole 5) against a $100 pot pays $50 with $50 left
// in the pot, not the full $100 a naive pot/totalShares would produce. Once
// total shares reach or exceed 1 (any normal multi-ace round), the two
// formulas are identical and the whole pot is distributed as usual.
function computeAcePayout(cfg, potAmount, aces) {
  if (!aces || !aces.length) return { totalShares: 0, perShare: 0, payouts: [], totalPayout: 0 };
  const shareByPlayer = {};
  let totalShares = 0;
  aces.forEach(a => {
    const mult = getHoleShareMultiplier(cfg, a.hole);
    shareByPlayer[a.player] = (shareByPlayer[a.player] || 0) + mult;
    totalShares += mult;
  });
  const perShare = totalShares > 0 ? potAmount / Math.max(totalShares, 1) : 0;
  const payouts = Object.entries(shareByPlayer).map(([player, shares]) => ({
    player, shares, amount: Math.round(shares * perShare * 100) / 100,
  }));
  const totalPayout = Math.round(payouts.reduce((s,p) => s + p.amount, 0) * 100) / 100;
  return { totalShares, perShare, payouts, totalPayout };
}

// Live preview using cached state — safe to call synchronously while the TD
// is adding aces in the UI, before anything is committed.
function previewAcePayout(course, aces) {
  const cfg = acePoolConfigCache[course] || acePoolDefaultConfig(course);
  const main = getCachedAcePoolMain(course);
  return { ...computeAcePayout(cfg, main, aces), mainPot: main };
}

// Commit: deduct the payout from main, replenish main from holding up to the
// cap, persist both, and return the breakdown for display.
async function commitAcePayout(course, aces) {
  const bal0 = await loadAcePoolBalances(course);
  if (!aces || !aces.length) {
    return { totalShares: 0, perShare: 0, payouts: [], totalPayout: 0, mainBefore: bal0.main, mainAfter: bal0.main, holding: bal0.holding };
  }
  const cfg = await getAcePoolConfig(course);
  const group = acePoolGroupFor(course, cfg);
  const { totalShares, perShare, payouts, totalPayout } = computeAcePayout(cfg, bal0.main, aces);

  let newMain = Math.max(0, bal0.main - totalPayout);
  let newHolding = bal0.holding;
  if (cfg.cap != null) {
    const room = Math.max(0, cfg.cap - newMain);
    const replenish = Math.min(room, newHolding);
    newMain += replenish;
    newHolding -= replenish;
  }
  await saveAcePoolBalances(group, newMain, newHolding);

  return { totalShares, perShare, payouts, totalPayout, mainBefore: bal0.main, mainAfter: newMain, holding: newHolding };
}
