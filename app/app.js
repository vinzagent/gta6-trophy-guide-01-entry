// Leonida Ledger — GTA VI trophy tracker. All state lives in localStorage; the app fetches
// only its own data/trophies.json and never makes a network request at run time.
const EARNED_KEY = 'leonida-ledger-earned-v1';
const SETTINGS_KEY = 'leonida-ledger-settings-v1';

const KIND_LABELS = {
  platinum: 'Platinum', story: 'Story', side: 'Side quest', collectible: 'Collectible',
  activity: 'Activity', robbery: 'Robbery', misc: 'One-off', completion: '100% completion',
};
const STAGE_LABELS = {
  1: 'Stage 1 · Story', 2: 'Stage 2 · 100% checklist', 3: 'Stage 3 · Cleanup', 4: 'Stage 4 · Platinum',
};
const STAGE_CARDS = [
  { stage: 1, title: 'Play the story', body: 'Chapters 1–5, side-character chains, the Chapter 1 meditation. Do the missable step now.' },
  { stage: 2, title: '100% checklist', body: 'The long tail after the credits: scans, studies, challenges, robberies, collectibles.' },
  { stage: 3, title: 'Misc cleanup', body: 'One-off trophies: the UFO, the Banshee, the plane, the tank, the cocktail.' },
  { stage: 4, title: 'Platinum', body: 'Vice Got a Price! pops on its own once the other 54 are earned.' },
];

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailCard');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const sortEl = document.getElementById('sortOrder');
const spoilerEl = document.getElementById('spoilerToggle');
const hideEarnedEl = document.getElementById('hideEarnedToggle');
const listMetaEl = document.getElementById('listMeta');
const emptyNoteEl = document.getElementById('emptyNote');
const filterNoteEl = document.getElementById('filterNote');

let doc = null;
let earned = new Set();
let settings = { spoilers: true };
let activeFilter = 'all';
let selectedId = 28; // Positive Mental Attitude, the possibly missable one, is the default guide shown.

function loadStored() {
  try { earned = new Set(JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]')); } catch { earned = new Set(); }
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')); } catch { /* keep defaults */ }
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function isStorySpoiler(t) {
  return settings.spoilers && t.kind === 'story' && !earned.has(t.id);
}

function formatCount(t) {
  if (t.count == null) return null;
  if (t.count >= 10000) return '$' + t.count.toLocaleString('en-US');
  return String(t.count);
}

function trophyMatches(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${KIND_LABELS[t.kind] ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (hideEarnedEl.checked && earned.has(t.id)) return false;
  switch (activeFilter) {
    case 'all': return true;
    case 'story': return t.kind === 'story';
    case 'missable': return t.missable;
    case 'collectible': return t.kind === 'collectible';
    case 'activity': return t.kind === 'activity';
    case 'robbery': return t.kind === 'robbery';
    case 'side': return t.kind === 'side';
    case 'hidden': return t.hidden;
    case 'online': return false;
    default: return true;
  }
}

function sortTrophies(list) {
  const byGrade = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
  if (sortEl.value === 'grade') return [...list].sort((a, b) => (byGrade[a.grade] - byGrade[b.grade]) || (a.id - b.id));
  if (sortEl.value === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function tagEl(text, cls) {
  const s = document.createElement('span');
  s.className = 'tag ' + cls;
  s.textContent = text;
  return s;
}

function renderProgress() {
  const total = doc.trophies.length;
  const n = earned.size;
  document.getElementById('progressText').textContent = `${n} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${Math.round((n / total) * 100)}%`;
  document.getElementById('progressFill').style.width = `${(n / total) * 100}%`;
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = doc.trophies.filter((t) => t.grade === g).length;
    const got = doc.trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `${g} ${got}/${all}`;
  });
  document.getElementById('progressGrades').textContent = parts.join(' · ');
}

function renderChips() {
  const counts = { all: doc.trophies.length };
  for (const t of doc.trophies) {
    counts[t.kind] = (counts[t.kind] ?? 0) + 1;
    if (t.missable) counts.missable = (counts.missable ?? 0) + 1;
    if (t.hidden) counts.hidden = (counts.hidden ?? 0) + 1;
  }
  counts.online = 0;
  for (const span of document.querySelectorAll('[data-count-for]')) {
    span.textContent = `(${counts[span.dataset.countFor] ?? 0})`;
  }
  for (const chip of document.querySelectorAll('#filterChips .chip')) {
    chip.classList.toggle('active', chip.dataset.filter === activeFilter);
  }
  filterNoteEl.textContent = activeFilter === 'online'
    ? 'No online trophies in this list: all 55 are single-player, offline trophies (PowerPyx, 19 Nov 2026).'
    : activeFilter === 'missable'
      ? 'Only one trophy is flagged as possibly missable. See the Missable watch section below for the Chapter 1 step.'
      : '';
}

function renderList() {
  const visible = sortTrophies(doc.trophies.filter(trophyMatches));
  listEl.replaceChildren();
  for (const t of visible) {
    const li = document.createElement('li');
    li.className = 'trophy-card' + (earned.has(t.id) ? ' earned' : '') + (t.id === selectedId ? ' selected' : '');
    li.dataset.id = String(t.id);

    const top = document.createElement('div');
    top.className = 'trophy-top';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', isStorySpoiler(t) ? 'Mark hidden story trophy earned' : `Mark ${t.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveEarned();
      renderAll();
    });
    box.addEventListener('click', (e) => e.stopPropagation());
    top.append(box);

    const head = document.createElement('div');
    head.className = 'trophy-head';
    const name = document.createElement('h3');
    name.className = 'trophy-name';
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    if (isStorySpoiler(t)) {
      name.textContent = 'Hidden story trophy';
      name.classList.add('spoiler-hidden');
      desc.textContent = 'Spoilers hidden — earn it (or switch off “Hide story spoilers”) to reveal its name and description.';
      desc.classList.add('spoiler-hidden');
    } else {
      name.textContent = t.name;
      desc.textContent = t.description;
    }
    head.append(name, desc);

    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    tags.append(tagEl(t.grade, 'grade-' + t.grade));
    tags.append(tagEl(KIND_LABELS[t.kind] ?? t.kind, ''));
    if (t.hidden) tags.append(tagEl('Hidden', 'hidden-tag'));
    if (t.missable) tags.append(tagEl('Possibly missable', 'missable'));
    const count = formatCount(t);
    if (count) tags.append(tagEl('Target: ' + count, 'count-tag'));
    tags.append(tagEl(STAGE_LABELS[t.stage], ''));
    head.append(tags);

    if (!isStorySpoiler(t)) {
      const preview = document.createElement('p');
      preview.className = 'trophy-guide-preview';
      const first = t.guide.split('. ')[0];
      preview.textContent = first.endsWith('.') ? first : first + '.';
      head.append(preview);
    }
    top.append(head);
    li.append(top);
    li.addEventListener('click', () => { selectedId = t.id; renderAll(); });
    listEl.append(li);
  }
  listMetaEl.textContent = `Showing ${visible.length} of ${doc.trophies.length} trophies · ${earned.size} earned`;
  emptyNoteEl.hidden = visible.length > 0;
}

function sourceLink(src) {
  const info = doc.source_library[src];
  if (!info) return null;
  const li = document.createElement('li');
  if (info.url) {
    const a = document.createElement('a');
    a.href = info.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = info.name;
    li.append(a);
  } else {
    li.textContent = info.name;
  }
  const covers = document.createElement('span');
  covers.className = 'source-covers';
  covers.textContent = ` — read ${info.accessed}; ${info.covers}`;
  li.append(covers);
  return li;
}

function renderDetail() {
  const t = doc.trophies.find((x) => x.id === selectedId) ?? doc.trophies[0];
  detailEl.replaceChildren();
  if (isStorySpoiler(t)) {
    const h = document.createElement('h3');
    h.textContent = 'Hidden story trophy';
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'This story trophy is hidden by your spoiler setting. Earn it in the game, tick it off here, or switch off “Hide story spoilers” to read its guide.';
    detailEl.append(h, p);
    return;
  }
  const h = document.createElement('h3');
  h.textContent = t.name;
  const desc = document.createElement('p');
  desc.className = 'official-desc';
  desc.textContent = `“${t.description}” — official description as PlayStation publishes it.`;
  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  meta.append(tagEl(t.grade, 'grade-' + t.grade));
  meta.append(tagEl(KIND_LABELS[t.kind] ?? t.kind, ''));
  if (t.hidden) meta.append(tagEl('Hidden', 'hidden-tag'));
  if (t.missable) meta.append(tagEl('Possibly missable', 'missable'));
  const count = formatCount(t);
  if (count) meta.append(tagEl('Target: ' + count, 'count-tag'));
  meta.append(tagEl(STAGE_LABELS[t.stage], ''));

  const srcLine = document.createElement('p');
  srcLine.className = 'detail-sources-line';
  const srcLabel = document.createElement('strong');
  srcLabel.textContent = 'Sources: ';
  srcLine.append(srcLabel);
  (t.sources ?? []).forEach((s, i) => {
    const info = doc.source_library[s];
    if (!info) return;
    if (i > 0) srcLine.append(document.createTextNode(' · '));
    if (info.url) {
      const a = document.createElement('a');
      a.href = info.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = info.name.split(' — ')[0];
      srcLine.append(a);
    } else {
      srcLine.append(document.createTextNode(info.name.split(' — ')[0]));
    }
  });

  const guideH = document.createElement('h4');
  guideH.textContent = 'Guide — in our own words';
  const guide = document.createElement('p');
  guide.textContent = t.guide;

  const stepsH = document.createElement('h4');
  stepsH.textContent = 'Steps';
  const steps = document.createElement('ol');
  for (const s of t.steps ?? []) {
    const li = document.createElement('li');
    li.textContent = s;
    steps.append(li);
  }

  const srcH = document.createElement('h4');
  srcH.textContent = 'Sources for this guide';
  const srcList = document.createElement('ul');
  srcList.className = 'source-list';
  for (const s of t.sources ?? []) {
    const li = sourceLink(s);
    if (li) srcList.append(li);
  }

  const earnRow = document.createElement('div');
  earnRow.className = 'earn-row';
  const earnBtn = document.createElement('button');
  earnBtn.type = 'button';
  const isEarned = earned.has(t.id);
  earnBtn.textContent = isEarned ? '✓ Earned — click to unmark' : 'Mark as earned';
  earnBtn.className = isEarned ? 'earned-btn' : '';
  earnBtn.addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id);
    else earned.add(t.id);
    saveEarned();
    renderAll();
  });
  earnRow.append(earnBtn);

  detailEl.append(h, desc, meta, srcLine, guideH, guide, srcH, srcList, stepsH, steps, earnRow);
}

function renderRoadmap() {
  const stageList = document.getElementById('stageList');
  stageList.replaceChildren();
  for (const card of STAGE_CARDS) {
    const n = doc.trophies.filter((t) => t.stage === card.stage).length;
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `Stage ${card.stage}`;
    const h = document.createElement('h3');
    h.textContent = card.title;
    const p = document.createElement('p');
    p.textContent = card.body;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${n} troph${n === 1 ? 'y' : 'ies'}`;
    li.append(num, h, p, count);
    stageList.append(li);
  }
}

function renderSources() {
  const rows = document.getElementById('sourceRows');
  rows.replaceChildren();
  for (const info of Object.values(doc.source_library)) {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    if (info.url) {
      const a = document.createElement('a');
      a.href = info.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = info.name;
      nameTd.append(a);
    } else {
      nameTd.textContent = info.name;
    }
    const readTd = document.createElement('td');
    readTd.textContent = info.accessed;
    const coversTd = document.createElement('td');
    coversTd.textContent = info.covers;
    tr.append(nameTd, readTd, coversTd);
    rows.append(tr);
  }
  const withGuide = doc.trophies.filter((t) => t.guide && t.guide.trim()).length;
  const withSources = doc.trophies.filter((t) => (t.sources ?? []).length > 0).length;
  const unconfirmed = doc.trophies.filter((t) => t.id === 49 || t.id === 51).length;
  const strip = document.getElementById('auditCounts');
  strip.replaceChildren();
  const bits = [
    `<strong>${doc.trophies.length}/55</strong> trophies named`,
    `<strong>${withGuide}/55</strong> with a guide`,
    `<strong>${withSources}/55</strong> with named sources`,
    `<strong>${doc.trophies.filter((t) => t.hidden).length}</strong> hidden until earned`,
    `<strong>${unconfirmed}</strong> methods still unconfirmed`,
    `<strong>0</strong> online trophies`,
  ];
  for (const b of bits) {
    const s = document.createElement('span');
    s.innerHTML = b;
    strip.append(s);
  }
  document.getElementById('footerMeta').textContent =
    `List as published by Exophase and PSNProfiles, 18 Nov 2026, cross-checked by PlanetGTA6. ` +
    `Methods and counts from PowerPyx, read 19 Nov 2026. Guides written for this page, 20 Nov 2026.`;
}

function renderAll() {
  renderProgress();
  renderChips();
  renderList();
  renderDetail();
}

function exportProgress() {
  const payload = {
    app: 'Leonida Ledger — GTA VI trophy tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b).map((id) => doc.trophies.find((t) => t.id === id)?.name).filter(Boolean),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-ledger-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function importProgress(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    alert('That file is not valid JSON.');
    return;
  }
  const names = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(names)) {
    alert('That file does not hold a progress list.');
    return;
  }
  const byName = new Map(doc.trophies.map((t) => [t.name, t.id]));
  const next = new Set();
  let unknown = 0;
  for (const name of names) {
    const id = byName.get(name);
    if (id != null) next.add(id);
    else unknown += 1;
  }
  earned = next;
  saveEarned();
  renderAll();
  alert(unknown > 0
    ? `Imported ${next.size} trophies (${unknown} names were not in the list and were skipped).`
    : `Imported ${next.size} trophies.`);
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const spoilers = params.get('spoilers');
  if (spoilers === 'on') settings.spoilers = true;
  if (spoilers === 'off') settings.spoilers = false;
  const filter = params.get('filter');
  if (filter && ['all', 'story', 'missable', 'collectible', 'activity', 'robbery', 'side', 'hidden', 'online'].includes(filter)) {
    activeFilter = filter;
  }
  const trophy = Number(params.get('trophy'));
  if (Number.isInteger(trophy) && doc.trophies.some((t) => t.id === trophy)) selectedId = trophy;
  const earnedParam = params.get('earned');
  if (earnedParam) {
    const ids = earnedParam.split(',').map((s) => Number(s.trim())).filter((n) => doc.trophies.some((t) => t.id === n));
    if (ids.length > 0) {
      earned = new Set(ids);
      saveEarned();
    }
  }
  spoilerEl.checked = settings.spoilers;
  saveSettings();
}

function scrollToView() {
  // Focus views are real layout modes, not scroll tricks: a ?view=roadmap (or missable, or
  // sources) link shows that section on its own so it always paints at the top of the page,
  // and ?view=cover compacts the masthead so the checklist and the open guide fit one screen.
  const view = new URLSearchParams(location.search).get('view');
  if (!view) return;
  if (['roadmap', 'missable', 'sources'].includes(view)) {
    document.body.classList.add('focus-' + view);
    window.scrollTo(0, 0);
  } else if (view === 'cover') {
    document.body.classList.add('compact');
    window.scrollTo(0, 0);
  }
}

async function init() {
  loadStored();
  const response = await fetch('data/trophies.json');
  doc = await response.json();
  applyUrlParams();
  spoilerEl.checked = settings.spoilers;

  for (const chip of document.querySelectorAll('#filterChips .chip')) {
    chip.addEventListener('click', () => { activeFilter = chip.dataset.filter; renderAll(); });
  }
  searchEl.addEventListener('input', renderList);
  gradeEl.addEventListener('change', renderList);
  sortEl.addEventListener('change', renderList);
  hideEarnedEl.addEventListener('change', renderList);
  spoilerEl.addEventListener('change', () => {
    settings.spoilers = spoilerEl.checked;
    saveSettings();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await importProgress(file);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      earned = new Set();
      saveEarned();
      renderAll();
    }
  });

  renderAll();
  renderRoadmap();
  renderSources();
  scrollToView();
}

init();
