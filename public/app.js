// Commonplace — front end. Plain JS, no build step.
// Data lives in Cloudflare D1. A copy is kept on the device so the app works offline;
// changes are queued and sent when back online (last change wins).

const STORE_KEY = 'commonplace:v1';
const PASS_KEY = 'commonplace:passcode';
const LASTCAT_KEY = 'commonplace:lastCategory';
const HINT_KEY = 'commonplace:swipes';
const THEME_KEY = 'commonplace:theme'; // 'light' | 'dark' | 'auto' (also read by the inline script in index.html)
const ALL = '__all__';

const PALETTE = [
  ['#ecdcf8', '#c9b2f0'], ['#fde0e6', '#f6b0c4'], ['#e2f5dc', '#ade0bf'], ['#dfeafc', '#abc8f2'],
  ['#fff0cc', '#f9c39a'], ['#dbf5f2', '#a3dbe0'], ['#fff8c9', '#fbdf86'], ['#eeeef3', '#cfcfdc'],
  ['#ffe1ec', '#f59ab8'], ['#dcfbef', '#97e6c6'], ['#dff4ff', '#9fd3f5'], ['#ffe4d9', '#f7a58a'],
  ['#f1e3ff', '#d0a8f5'], ['#eef3e0', '#c5d6a0'], ['#f6eedf', '#dcc59c'], ['#e4e6ff', '#a9b0f5'],
];
const FALLBACK = ['#eeeef3', '#cfcfdc'];

// ---------- Icons ----------
const ic = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICONS = {
  shuffle: ic('<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>'),
  list: ic('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  settings: ic('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  left: ic('<path d="m15 18-6-6 6-6"/>'),
  right: ic('<path d="m9 18 6-6-6-6"/>'),
  pencil: ic('<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  search: ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  cloud: ic('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m9 14 2 2 4-4"/>'),
  cloudOff: ic('<path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2"/><path d="M21.53 16.05A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 9.3 5.07"/>'),
  sync: ic('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>'),
  lock: ic('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  unlock: ic('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'),
  download: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
  upload: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>'),
  sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
  moon: ic('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
  auto: ic('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>'),
  trash: ic('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
};

// ---------- Helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const timeAgo = (t) => {
  if (!t) return 'never';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
};

// ---------- Theme ----------
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const themePref = () => lsGet(THEME_KEY, 'light');
const resolvedTheme = () => (themePref() === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : themePref());
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  $('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#111116' : '#f5f4f9');
  const btn = $('#theme-btn');
  if (btn) {
    btn.innerHTML = t === 'dark' ? ICONS.sun : ICONS.moon;
    btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}
function setTheme(pref) { lsSet(THEME_KEY, pref); applyTheme(); }
darkQuery.addEventListener?.('change', () => themePref() === 'auto' && applyTheme());

// ---------- Store: server snapshot + pending changes ----------
function loadStore() {
  try {
    const s = JSON.parse(lsGet(STORE_KEY));
    if (s && s.server) return { pending: [], lastSync: 0, ...s };
  } catch {}
  return { server: null, pending: [], lastSync: 0 };
}
let store = loadStore();
const saveStore = () => lsSet(STORE_KEY, JSON.stringify(store));

function applyOps(base, ops) {
  const quotes = new Map((base?.quotes || []).map((q) => [q.id, { ...q }]));
  const cats = new Map((base?.categories || []).map((c) => [c.name, { ...c }]));
  for (const op of ops) {
    if (op.type === 'upsertQuote') quotes.set(op.quote.id, { ...op.quote });
    else if (op.type === 'deleteQuote') quotes.delete(op.id);
    else if (op.type === 'upsertCategory') cats.set(op.category.name, { ...op.category });
    else if (op.type === 'deleteCategory') cats.delete(op.name);
  }
  const categories = [...cats.values()].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  return { quotes: [...quotes.values()], categories, byId: quotes, catMap: cats };
}
let view = applyOps(store.server, store.pending);

const colorsOf = (name) => {
  const c = view.catMap.get(name);
  return c ? [c.color1, c.color2] : FALLBACK;
};
const cssVars = (name) => {
  const [c1, c2] = colorsOf(name);
  return `--c1:${c1};--c2:${c2}`;
};

// ---------- UI state ----------
const state = { tab: 'random', filter: ALL, search: '', sort: 'newest', syncing: false, syncError: null };
let deck = { order: [], pos: 0 };
const getPass = () => lsGet(PASS_KEY);
const canEdit = () => !!getPass();

function filtered() {
  return state.filter === ALL ? view.quotes : view.quotes.filter((q) => q.category === state.filter);
}

// ---------- Deck (random order, no repeats until all are shown) ----------
function rebuildDeck(keepId) {
  const ids = filtered().map((q) => q.id);
  const keep = keepId && ids.includes(keepId) ? keepId : null;
  deck = { order: shuffle(ids.filter((i) => i !== keep)), pos: 0 };
  if (keep) deck.order.unshift(keep);
}
function ensureAhead() {
  const ids = filtered().map((q) => q.id);
  if (!ids.length) return;
  while (deck.pos + 1 >= deck.order.length) {
    if (ids.length === 1) { deck.order.push(ids[0]); break; }
    const s = shuffle(ids);
    if (s[0] === deck.order[deck.order.length - 1]) [s[0], s[1]] = [s[1], s[0]];
    deck.order.push(...s);
  }
}
const currentQuote = () => view.byId.get(deck.order[deck.pos]);
const nextQuote = () => { ensureAhead(); return view.byId.get(deck.order[deck.pos + 1]); };
function syncDeckWithData() {
  const ids = new Set(filtered().map((q) => q.id));
  const cur = deck.order[deck.pos];
  const stale = deck.order.some((id) => !ids.has(id));
  const known = new Set(deck.order);
  const missing = [...ids].some((id) => !known.has(id));
  if (stale || missing || !deck.order.length) rebuildDeck(cur);
}

// ---------- Rendering ----------
function cardHTML(q, { compact = false, extraClass = '' } = {}) {
  const len = q.text.length;
  const size = compact ? '' : len > 420 ? 'xlong' : len > 230 ? 'long' : '';
  const bottom = q.book || q.author;
  return `<article class="qcard ${compact ? 'compact' : ''} ${extraClass}" style="${cssVars(q.category)}" data-id="${esc(q.id)}">
    ${compact && canEdit() ? `<span class="edit-badge">${ICONS.pencil}</span>` : ''}
    <div class="qcard-top"><div class="qscroll">
      <p class="qtext ${size}">${esc(q.text)}</p>
      ${q.character ? `<p class="qchar">${esc(q.character)}</p>` : ''}
    </div></div>
    <div class="qcard-bottom ${bottom ? '' : 'empty'}">
      ${q.book ? `<div class="qbook">${esc(q.book)}</div>` : ''}
      ${q.author ? `<div class="qauthor">${esc(q.author)}</div>` : ''}
    </div>
  </article>`;
}

function setAmbient(category) {
  const [c1, c2] = category ? colorsOf(category) : ['#e3d2f5', '#d2e2fa'];
  document.body.style.setProperty('--bg1', c2);
  document.body.style.setProperty('--bg2', c1);
}

function renderChips() {
  const counts = {};
  view.quotes.forEach((q) => (counts[q.category] = (counts[q.category] || 0) + 1));
  const chip = (value, label, count, vars, cls = '') =>
    `<button type="button" class="chip ${cls} ${state.filter === value ? 'active' : ''}" data-filter="${esc(value)}" style="${vars}">
      <span class="dot"></span>${esc(label)}<span class="count">${count}</span></button>`;
  const cats = view.categories.filter((c) => counts[c.name] || state.filter === c.name);
  $('#chips').innerHTML =
    chip(ALL, 'All', view.quotes.length, '', 'all') + cats.map((c) => chip(c.name, c.name, counts[c.name] || 0, cssVars(c.name))).join('');
  const active = $('#chips .chip.active');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function renderTabbar() {
  const tb = $('#tabbar');
  const [r, l, a, s] = $$('button', tb);
  r.innerHTML = ICONS.shuffle; l.innerHTML = ICONS.list; a.innerHTML = ICONS.plus; s.innerHTML = ICONS.settings;
  r.classList.toggle('active', state.tab === 'random');
  l.classList.toggle('active', state.tab === 'list');
  a.hidden = !canEdit();
}

function renderSyncPill() {
  const pill = $('#sync-pill');
  const pending = store.pending.length;
  let icon = ICONS.cloud, text = 'Synced', cls = '';
  if (state.syncing) { icon = ICONS.sync; text = 'Syncing'; cls = 'spin'; }
  else if (!navigator.onLine) { icon = ICONS.cloudOff; text = pending ? `Offline · ${pending} waiting` : 'Offline'; cls = pending ? 'warn' : ''; }
  else if (state.syncError === 'passcode') { icon = ICONS.lock; text = 'Passcode needed'; cls = 'warn'; }
  else if (pending) { icon = ICONS.sync; text = `${pending} waiting`; cls = 'warn'; }
  else if (state.syncError) { icon = ICONS.cloudOff; text = 'Not synced'; cls = 'warn'; }
  pill.className = `sync-pill ${cls}`;
  pill.innerHTML = `${icon}<span>${text}</span>`;
}

function render() {
  $('.app').classList.toggle('fit', state.tab === 'random');
  renderChips();
  renderTabbar();
  renderSyncPill();
  if (state.tab === 'random') renderRandom();
  else renderList();
}

// ----- Random view -----
let renderedSig = '';
function renderRandom(enter = '') {
  const main = $('#main');
  const q = currentQuote();
  if (!q) {
    renderedSig = '';
    setAmbient(state.filter === ALL ? null : state.filter);
    main.innerHTML = emptyHTML();
    return;
  }
  const nq = nextQuote();
  renderedSig = JSON.stringify(q);
  setAmbient(q.category);
  const swipes = Number(lsGet(HINT_KEY, '0'));
  main.innerHTML = `<section class="random">
    <div class="stage" id="stage">
      <div class="deck">
        ${nq ? `<div class="card-back second" style="${cssVars(nq.category)}"></div><div class="card-back" style="${cssVars(nq.category)}"></div>` : ''}
        ${cardHTML(q, { extraClass: `front ${enter}` })}
      </div>
    </div>
    <div class="random-controls">
      <button type="button" class="round-btn" data-act="prev" aria-label="Previous quote" ${deck.pos > 0 ? '' : 'disabled'}>${ICONS.left}</button>
      ${canEdit()
        ? `<button type="button" class="pill-btn" data-act="edit">${ICONS.pencil}Edit</button>`
        : `<span class="swipe-hint">${swipes < 3 ? 'Swipe for another' : ''}</span>`}
      <button type="button" class="round-btn" data-act="next" aria-label="Next quote">${ICONS.right}</button>
    </div>
  </section>`;
  const front = $('.qcard.front', main);
  front.addEventListener('animationend', () => front.classList.remove('enter-back', 'enter-fade'), { once: true });
  fitCard();
  attachSwipe(front);
}

// Long quotes: tighten the card and shrink the text until the card fits on screen.
function fitCard() {
  const stage = $('#stage');
  const card = stage && $('.qcard.front', stage);
  if (!card) return;
  const text = $('.qtext', card);
  const top = $('.qcard-top', card);
  const scroller = $('.qscroll', card);
  stage.style.paddingBottom = '';
  card.classList.remove('tight', 'scrolls');
  card.style.maxHeight = '';
  top.classList.remove('more');
  text.style.fontSize = text.style.lineHeight = '';
  const avail = () => {
    const cs = getComputedStyle(stage);
    return stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  };
  if (card.offsetHeight <= avail()) return;
  stage.style.paddingBottom = '30px';
  card.classList.add('tight');
  let size = parseFloat(getComputedStyle(text).fontSize);
  text.style.lineHeight = '1.42';
  while (card.offsetHeight > avail() && size > 16) {
    size -= 0.5;
    text.style.fontSize = `${size}px`;
  }
  if (card.offsetHeight <= avail()) return;
  // Still too long: cap the card's height and let only the white area scroll, with a fade at its bottom.
  card.classList.add('scrolls');
  card.style.maxHeight = `${Math.floor(avail())}px`;
  scroller.scrollTop = 0;
  const updateFade = () =>
    top.classList.toggle('more', scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 4);
  scroller.onscroll = updateFade;
  updateFade();
}
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => state.tab === 'random' && !busy && fitCard(), 120);
});

function emptyHTML() {
  const inCat = state.filter !== ALL;
  return `<div class="empty"><div class="big">${inCat ? `No quotes in ${esc(state.filter)} yet` : 'No quotes yet'}</div>
    ${!store.server && !navigator.onLine ? 'You are offline. Your quotes will appear once you are connected.' : canEdit() ? 'Tap + to add your first one.' : 'Unlock editing in settings to add quotes.'}</div>`;
}

let busy = false;
function go(dir) {
  if (busy || !currentQuote()) return;
  const front = $('.qcard.front');
  if (dir === 'prev' && deck.pos === 0) return;
  busy = true;
  lsSet(HINT_KEY, String(Number(lsGet(HINT_KEY, '0')) + 1));
  const fly = (x, y, rot) => {
    if (!front) return finish();
    front.classList.remove('dragging', 'enter-back', 'enter-fade');
    void front.offsetWidth; // let the removed enter animation settle so the exit transition always runs
    front.style.transition = 'transform .32s cubic-bezier(.4,0,.6,1), opacity .32s';
    front.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    front.style.opacity = '0';
    setTimeout(finish, 260);
  };
  const finish = () => {
    if (dir === 'next') { ensureAhead(); deck.pos++; renderRandom('enter-back'); }
    else { deck.pos--; renderRandom('enter-fade'); }
    busy = false;
  };
  const w = window.innerWidth;
  if (dir === 'next') fly(-w, -40, -16);
  else fly(w, -20, 14);
}

function attachSwipe(card) {
  if (!card) return;
  let sx = 0, sy = 0, dx = 0, dy = 0, lastX = 0, lastT = 0, vx = 0, vy = 0, lastY = 0, active = false;
  const backs = $$('.card-back');
  card.addEventListener('pointerdown', (e) => {
    if (busy || e.button > 0) return;
    active = true; sx = lastX = e.clientX; sy = lastY = e.clientY; lastT = performance.now(); dx = dy = vx = vy = 0;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
    card.classList.remove('enter-back', 'enter-fade');
  });
  card.addEventListener('pointermove', (e) => {
    if (!active) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    vx = (e.clientX - lastX) / dt; vy = (e.clientY - lastY) / dt;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    dx = e.clientX - sx; dy = e.clientY - sy;
    card.style.transform = `translate(${dx}px, ${dy * 0.6}px) rotate(${dx / 18}deg)`;
    const p = Math.min(1, Math.hypot(dx, dy) / 160);
    if (backs[1]) backs[1].style.transform = `translateY(${22 - 22 * p}px) scale(${0.95 + 0.05 * p})`;
  });
  const end = (e) => {
    if (!active) return;
    active = false;
    card.classList.remove('dragging');
    // pointercancel = the browser took over (e.g. scrolling a long card): just put the card back
    if (e?.type === 'pointercancel') dx = dy = 0;
    const scrolling = card.classList.contains('scrolls');
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const goLeft = horizontal && (dx < -80 || (dx < -25 && vx < -0.45));
    const goRight = horizontal && (dx > 80 || (dx > 25 && vx > 0.45));
    const goUp = !scrolling && !horizontal && (dy < -80 || (dy < -25 && vy < -0.45));
    if (goLeft || goUp || (goRight && deck.pos === 0)) return go('next');
    if (goRight) return go('prev');
    card.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1.3)';
    card.style.transform = '';
    if (backs[1]) backs[1].style.transform = '';
    setTimeout(() => (card.style.transition = ''), 360);
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

// ----- List view -----
function renderList() {
  const main = $('#main');
  setAmbient(state.filter === ALL ? null : state.filter);
  main.innerHTML = `<section class="list">
    <div class="list-tools">
      <label class="search">${ICONS.search}<input id="search" type="search" placeholder="Search quotes, books, authors…" value="${esc(state.search)}" autocomplete="off"></label>
      <select class="select" id="sort" aria-label="Sort">
        ${[['newest', 'Newest'], ['oldest', 'Oldest'], ['book', 'Book'], ['author', 'Author']]
          .map(([v, l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="list-count" id="list-count"></div>
    <div class="list-items" id="list-items"></div>
  </section>`;
  renderListItems();
}

function renderListItems() {
  const box = $('#list-items');
  if (!box) return;
  const qn = norm(state.search);
  let items = filtered();
  if (qn) items = items.filter((q) => norm(`${q.text} ${q.character} ${q.book} ${q.author}`).includes(qn));
  const by = (k) => (a, b) => (a[k] || '￿').localeCompare(b[k] || '￿') || a.created_at - b.created_at;
  items = items.slice().sort(
    state.sort === 'oldest' ? (a, b) => a.created_at - b.created_at
      : state.sort === 'book' ? by('book')
      : state.sort === 'author' ? by('author')
      : (a, b) => b.created_at - a.created_at
  );
  $('#list-count').textContent = `${items.length} ${items.length === 1 ? 'quote' : 'quotes'}${state.filter !== ALL ? ` in ${state.filter}` : ''}`;
  box.innerHTML = items.length
    ? items.map((q) => cardHTML(q, { compact: true })).join('')
    : qn ? `<div class="empty">Nothing matches “${esc(state.search)}”.</div>` : emptyHTML();
}

// ---------- Sheets ----------
function openSheet(html, { vars = '', onMount } = {}) {
  closeSheet(true);
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true" style="${vars}">${html}</div>`;
  const sheet = $('.sheet', root);
  onMount?.(sheet);
  return sheet;
}
function closeSheet(instant = false) {
  const root = $('#sheet-root');
  if (!root.firstChild) return;
  if (instant) { root.innerHTML = ''; return; }
  $$('.sheet, .sheet-backdrop', root).forEach((el) => el.classList.add('closing'));
  setTimeout(() => (root.innerHTML = ''), 200);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ----- Add / edit -----
function openEditor(id) {
  if (!canEdit()) return openSettings();
  const q = id ? view.byId.get(id) : null;
  const lastCat = lsGet(LASTCAT_KEY);
  let category = q?.category
    || (state.filter !== ALL ? state.filter : null)
    || (view.catMap.has(lastCat) ? lastCat : null)
    || view.categories[0]?.name || 'Misc';
  const books = [...new Set(view.quotes.map((x) => x.book).filter(Boolean))].sort();
  const authors = [...new Set(view.quotes.map((x) => x.author).filter(Boolean))].sort();
  const characters = [...new Set(view.quotes.map((x) => x.character).filter(Boolean))].sort();
  const opts = (arr) => arr.map((v) => `<option value="${esc(v)}">`).join('');
  const catChips = () => view.categories
    .map((c) => `<button type="button" class="chip ${c.name === category ? 'active' : ''}" data-cat="${esc(c.name)}" style="${cssVars(c.name)}"><span class="dot"></span>${esc(c.name)}</button>`)
    .join('');

  openSheet(`<form id="quote-form" autocomplete="off">
      <h2>${q ? 'Edit quote' : 'New quote'}</h2>
      <label class="field"><span>Quote</span><textarea name="text" required rows="4">${esc(q?.text)}</textarea></label>
      <label class="field"><span>Character <em>· optional</em></span><input name="character" list="dl-chars" value="${esc(q?.character)}"></label>
      <label class="field"><span>Book <em>· optional</em></span><input name="book" list="dl-books" value="${esc(q?.book)}"></label>
      <label class="field"><span>Author</span><input name="author" list="dl-authors" value="${esc(q?.author)}"></label>
      <div class="field"><span>Category</span><div class="cat-picker" id="cat-picker">${catChips()}</div></div>
      <datalist id="dl-books">${opts(books)}</datalist><datalist id="dl-authors">${opts(authors)}</datalist><datalist id="dl-chars">${opts(characters)}</datalist>
      <div class="actions">
        ${q ? `<button type="button" class="btn danger" id="del-btn">${ICONS.trash}</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn primary">Save</button>
      </div>
    </form>`, {
    vars: cssVars(category),
    onMount(sheet) {
      const form = $('#quote-form', sheet);
      if (!q) setTimeout(() => form.text.focus(), 320);
      $('#cat-picker', sheet).addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        category = b.dataset.cat;
        $$('#cat-picker .chip', sheet).forEach((c) => c.classList.toggle('active', c === b));
        sheet.setAttribute('style', cssVars(category));
      });
      // Picking a known book fills in its author.
      form.book.addEventListener('change', () => {
        if (form.author.value.trim()) return;
        const match = view.quotes.find((x) => x.book && x.book.toLowerCase() === form.book.value.trim().toLowerCase());
        if (match?.author) form.author.value = match.author;
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = form.text.value.trim();
        if (!text) return;
        const now = Date.now();
        const quote = {
          id: q?.id || uuid(),
          text,
          character: form.character.value.trim(),
          book: form.book.value.trim(),
          author: form.author.value.trim(),
          category,
          created_at: q?.created_at || now,
          updated_at: now,
        };
        if (!q) {
          const dup = view.quotes.find((x) => norm(x.text) === norm(text));
          if (dup && !form.dataset.dupOk) {
            form.dataset.dupOk = '1';
            return toast('This quote is already in your collection. Tap Save again to add it anyway.');
          }
        }
        lsSet(LASTCAT_KEY, category);
        commit([{ type: 'upsertQuote', quote }]);
        closeSheet();
        toast(q ? 'Quote updated' : 'Quote added');
        if (!q && state.tab === 'random') {
          // show the new quote right away
          if (state.filter !== ALL && state.filter !== category) state.filter = ALL;
          rebuildDeck(quote.id);
          render();
        }
      });
      const del = $('#del-btn', sheet);
      del?.addEventListener('click', () => {
        if (!del.classList.contains('armed')) {
          del.classList.add('armed');
          del.innerHTML = `${ICONS.trash}Delete?`;
          setTimeout(() => { del.classList.remove('armed'); del.innerHTML = ICONS.trash; }, 3000);
          return;
        }
        commit([{ type: 'deleteQuote', id: q.id, at: Date.now() }]);
        closeSheet();
        toast('Quote deleted');
      });
    },
  });
}

// ----- Settings -----
function openSettings() {
  const pending = store.pending.length;
  const unlocked = canEdit();
  const counts = {};
  view.quotes.forEach((x) => (counts[x.category] = (counts[x.category] || 0) + 1));
  const status = state.syncing ? 'Syncing…'
    : !navigator.onLine ? `Offline${pending ? ` · ${pending} change${pending > 1 ? 's' : ''} waiting` : ''}`
    : state.syncError === 'passcode' ? 'Passcode rejected — unlock again to sync'
    : pending ? `${pending} change${pending > 1 ? 's' : ''} waiting to sync`
    : state.syncError ? 'Could not reach the server' : 'Up to date';

  const catRows = view.categories.map((c) => `
    <div class="cat-row" data-name="${esc(c.name)}">
      <button type="button" class="swatch" data-act="color" style="${cssVars(c.name)}" aria-label="Change colour of ${esc(c.name)}" ${unlocked ? '' : 'disabled'}></button>
      <input class="input" value="${esc(c.name)}" data-act="rename" aria-label="Category name" ${unlocked ? '' : 'readonly'}>
      <span class="count">${counts[c.name] || 0}</span>
      ${unlocked ? `<button type="button" class="icon-btn" data-act="delcat" aria-label="Delete category" ${counts[c.name] ? 'disabled title="Move its quotes to another category first"' : ''}>${ICONS.trash}</button>` : ''}
    </div>`).join('');

  openSheet(`
    <h2>Settings</h2>
    <h3>Appearance</h3>
    <div class="segmented" id="theme-seg">
      ${[['light', 'Light', ICONS.sun], ['dark', 'Dark', ICONS.moon], ['auto', 'Auto', ICONS.auto]]
        .map(([v, l, i]) => `<button type="button" data-theme-pref="${v}" class="${themePref() === v ? 'active' : ''}">${i}${l}</button>`).join('')}
    </div>
    <p class="note" style="margin-top:8px">Auto follows your phone's setting.</p>

    <h3>Sync</h3>
    <div class="status-box">${navigator.onLine ? ICONS.cloud : ICONS.cloudOff}
      <div class="grow">${status}<small>Last synced ${timeAgo(store.lastSync)}</small></div>
      <button type="button" class="btn" id="sync-now">${ICONS.sync}</button>
    </div>

    <h3>Editing</h3>
    ${unlocked
      ? `<div class="status-box">${ICONS.unlock}<div class="grow">Editing is unlocked on this device<small>Others with the link can only read.</small></div>
           <button type="button" class="btn" id="lock-btn">Lock</button></div>`
      : `<p class="note">Anyone with the link can read your quotes. Enter your passcode to add, edit or import on this device.</p>
         <form class="row" id="unlock-form"><input class="input" type="password" name="pass" placeholder="Passcode" autocomplete="current-password" required>
         <button type="submit" class="btn dark">${ICONS.unlock}Unlock</button></form>`}

    <h3>Backup</h3>
    <div class="btn-grid">
      <button type="button" class="btn" id="export-btn">${ICONS.download}Export CSV</button>
      <button type="button" class="btn" id="import-btn" ${unlocked ? '' : 'disabled'}>${ICONS.upload}Import CSV</button>
    </div>
    <input type="file" id="import-file" accept=".csv,text/csv,text/plain" hidden>

    <h3>Categories</h3>
    <div id="cat-list">${catRows}</div>
    <div class="palette" id="palette" hidden></div>
    ${unlocked ? `<form class="row" id="addcat-form" style="margin-top:10px"><input class="input" name="name" placeholder="New category" required maxlength="40">
       <button type="submit" class="btn">${ICONS.plus}Add</button></form>` : ''}

    <div class="footer-note">${view.quotes.length} quotes · Commonplace</div>
  `, {
    onMount(sheet) {
      $('#theme-seg', sheet).addEventListener('click', (e) => {
        const b = e.target.closest('[data-theme-pref]');
        if (!b) return;
        setTheme(b.dataset.themePref);
        $$('#theme-seg button', sheet).forEach((x) => x.classList.toggle('active', x === b));
      });
      $('#sync-now', sheet).onclick = async () => { await sync(); openSettings(); };
      $('#lock-btn', sheet)?.addEventListener('click', () => {
        if (store.pending.length && !confirm(`${store.pending.length} change(s) have not synced yet and will wait until you unlock again. Lock anyway?`)) return;
        lsSet(PASS_KEY, null); render(); openSettings(); toast('Editing locked');
      });
      $('#unlock-form', sheet)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = e.target.pass.value;
        if (!navigator.onLine) return toast('Connect to the internet to unlock');
        try {
          const res = await fetch('/api/auth', { method: 'POST', headers: { authorization: `Bearer ${pass}` } });
          if (!res.ok) return toast('Wrong passcode');
          lsSet(PASS_KEY, pass);
          state.syncError = null;
          render(); openSettings(); toast('Editing unlocked');
          sync();
        } catch { toast('Could not reach the server'); }
      });
      $('#export-btn', sheet).onclick = exportCSV;
      $('#import-btn', sheet).onclick = () => $('#import-file', sheet).click();
      $('#import-file', sheet).onchange = async (e) => {
        const file = e.target.files[0];
        if (file) previewImport(await file.text());
      };

      // Category editing
      const palette = $('#palette', sheet);
      let paletteFor = null;
      $('#cat-list', sheet).addEventListener('click', (e) => {
        const row = e.target.closest('.cat-row');
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!row || !unlocked) return;
        const name = row.dataset.name;
        if (act === 'color') {
          if (paletteFor === name) { palette.hidden = true; paletteFor = null; return; }
          paletteFor = name;
          const [c1] = colorsOf(name);
          palette.innerHTML = PALETTE.map(([a, b], i) => `<button type="button" class="swatch ${a === c1 ? 'selected' : ''}" data-i="${i}" style="--c1:${a};--c2:${b}"></button>`).join('');
          row.after(palette);
          palette.hidden = false;
        } else if (act === 'delcat' && !counts[name]) {
          commit([{ type: 'deleteCategory', name, at: Date.now() }]);
          if (state.filter === name) state.filter = ALL;
          render(); openSettings();
        }
      });
      palette.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b || !paletteFor) return;
        const [color1, color2] = PALETTE[b.dataset.i];
        const c = view.catMap.get(paletteFor);
        commit([{ type: 'upsertCategory', category: { ...c, color1, color2, updated_at: Date.now() } }]);
        render(); openSettings();
      });
      $$('#cat-list [data-act="rename"]', sheet).forEach((input) => {
        input.addEventListener('keydown', (e) => e.key === 'Enter' && input.blur());
        input.addEventListener('change', () => renameCategory(input.closest('.cat-row').dataset.name, input.value.trim()));
      });
      $('#addcat-form', sheet)?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.name.value.trim();
        if (!name) return;
        if ([...view.catMap.keys()].some((n) => n.toLowerCase() === name.toLowerCase())) return toast('That category already exists');
        commit([{ type: 'upsertCategory', category: newCategory(name) }]);
        render(); openSettings(); toast(`Added ${name}`);
      });
    },
  });
}

function newCategory(name) {
  const used = new Set(view.categories.map((c) => c.color1));
  const [color1, color2] = PALETTE.find(([a]) => !used.has(a)) || PALETTE[view.categories.length % PALETTE.length];
  const sort = Math.max(-1, ...view.categories.map((c) => c.sort)) + 1;
  return { name, color1, color2, sort, updated_at: Date.now() };
}

function renameCategory(oldName, newName) {
  if (!newName || newName === oldName) return;
  const now = Date.now();
  const old = view.catMap.get(oldName);
  const existing = [...view.catMap.values()].find((c) => c.name.toLowerCase() === newName.toLowerCase() && c.name !== oldName);
  const target = existing ? existing.name : newName;
  const ops = [];
  if (!existing) ops.push({ type: 'upsertCategory', category: { ...old, name: target, updated_at: now } });
  view.quotes.filter((q) => q.category === oldName).forEach((q) => ops.push({ type: 'upsertQuote', quote: { ...q, category: target, updated_at: now } }));
  ops.push({ type: 'deleteCategory', name: oldName, at: now });
  commit(ops);
  if (state.filter === oldName) state.filter = target;
  render(); openSettings();
  toast(existing ? `Merged into ${target}` : `Renamed to ${target}`);
}

// ---------- CSV ----------
const CSV_HEADER = ['quote', 'character', 'book', 'author', 'category'];
function toCSV(rows) {
  const cell = (v) => { v = String(v ?? ''); return /[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delim = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function exportCSV() {
  const rows = [CSV_HEADER, ...view.quotes.slice().sort((a, b) => a.created_at - b.created_at)
    .map((q) => [q.text, q.character, q.book, q.author, q.category])];
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const name = `commonplace-${new Date().toISOString().slice(0, 10)}.csv`;
  const file = new File([blob], name, { type: 'text/csv' });
  const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (mobile && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: name }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Exported ${view.quotes.length} quotes`);
}

function previewImport(text) {
  const rows = parseCSV(text);
  if (!rows.length) return toast('That file looks empty');
  const ALIASES = {
    text: ['quote', 'text', 'quotation', 'front'], character: ['character', 'speaker', 'said by', 'who'],
    book: ['book', 'title', 'source', 'work'], author: ['author', 'writer', 'by'], category: ['category', 'categories', 'tag', 'tags', 'deck'],
  };
  const head = rows[0].map((h) => norm(h));
  let map = {};
  for (const [k, names] of Object.entries(ALIASES)) { const i = head.findIndex((h) => names.includes(h)); if (i >= 0) map[k] = i; }
  const hasHeader = map.text !== undefined;
  if (!hasHeader) map = { text: 0, character: 1, book: 2, author: 3, category: 4 };
  const data = hasHeader ? rows.slice(1) : rows;

  const existing = new Set(view.quotes.map((q) => norm(q.text)));
  const catByLower = new Map(view.categories.map((c) => [c.name.toLowerCase(), c.name]));
  const fresh = [], newCats = new Map();
  let dupes = 0;
  const now = Date.now();
  data.forEach((r, i) => {
    const get = (k) => (map[k] !== undefined ? String(r[map[k]] ?? '').trim() : '');
    const text = get('text');
    if (!text) return;
    const key = norm(text);
    if (!key || existing.has(key)) { dupes++; return; }
    existing.add(key);
    let cat = get('category') || 'Misc';
    const known = catByLower.get(cat.toLowerCase()) || newCats.get(cat.toLowerCase());
    if (known) cat = known; else newCats.set(cat.toLowerCase(), cat);
    fresh.push({ id: uuid(), text, character: get('character'), book: get('book'), author: get('author'), category: cat, created_at: now + i, updated_at: now + i });
  });

  const newCatNames = [...newCats.values()];
  openSheet(`
    <h2>Import quotes</h2>
    <div class="import-summary">
      <div class="stat"><b>${fresh.length}</b><span>new ${fresh.length === 1 ? 'quote' : 'quotes'}</span></div>
      <div class="stat"><b>${dupes}</b><span>already in your collection (skipped)</span></div>
    </div>
    ${newCatNames.length ? `<p class="note">New categories will be created: <b>${newCatNames.map(esc).join(', ')}</b></p>` : ''}
    ${fresh.length ? `<div class="preview-list">${fresh.slice(0, 5).map((q) => cardHTML({ ...q, category: view.catMap.has(q.category) ? q.category : '' }, { compact: true })).join('')}</div>
      ${fresh.length > 5 ? `<p class="note" style="text-align:center">…and ${fresh.length - 5} more</p>` : ''}` : '<p class="note">Nothing new to import.</p>'}
    <div class="actions"><span class="spacer"></span>
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="button" class="btn primary" id="do-import" ${fresh.length ? '' : 'disabled'}>Import ${fresh.length || ''}</button>
    </div>`, {
    onMount(sheet) {
      $('#do-import', sheet).onclick = () => {
        const ops = [];
        let tmpCats = [...view.categories];
        for (const name of newCatNames) {
          const used = new Set(tmpCats.map((c) => c.color1));
          const [color1, color2] = PALETTE.find(([a]) => !used.has(a)) || PALETTE[tmpCats.length % PALETTE.length];
          const cat = { name, color1, color2, sort: Math.max(-1, ...tmpCats.map((c) => c.sort)) + 1, updated_at: now };
          tmpCats.push(cat);
          ops.push({ type: 'upsertCategory', category: cat });
        }
        fresh.forEach((quote) => ops.push({ type: 'upsertQuote', quote }));
        commit(ops);
        closeSheet();
        toast(`Imported ${fresh.length} quotes`);
      };
    },
  });
}

// ---------- Changes & sync ----------
function commit(ops) {
  store.pending.push(...ops);
  saveStore();
  refreshData();
  scheduleSync(300);
}

function refreshData() {
  view = applyOps(store.server, store.pending);
  if (state.filter !== ALL && !view.catMap.has(state.filter)) state.filter = ALL;
  syncDeckWithData();
  renderChips(); renderTabbar(); renderSyncPill();
  if (state.tab === 'list') renderListItems();
  else {
    const q = currentQuote();
    // Avoid re-rendering the card under the user's finger unless it actually changed.
    if (!q || JSON.stringify(q) !== renderedSig || !$('.qcard.front')) renderRandom();
  }
}

let syncTimer = null, syncAgain = false;
function scheduleSync(ms = 300) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }

async function sync() {
  if (state.syncing) { syncAgain = true; return; }
  if (!navigator.onLine) { renderSyncPill(); return; }
  state.syncing = true; renderSyncPill();
  try {
    const ops = store.pending.slice();
    let res;
    if (ops.length && getPass()) {
      res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${getPass()}` },
        body: JSON.stringify({ ops }),
      });
      if (res.status === 401) { state.syncError = 'passcode'; lsSet(PASS_KEY, null); renderTabbar(); throw new Error('passcode'); }
    } else {
      res = await fetch('/api/data', { cache: 'no-store' });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    store.server = { quotes: data.quotes, categories: data.categories };
    if (ops.length && getPass()) store.pending = store.pending.slice(ops.length);
    store.lastSync = Date.now();
    state.syncError = null;
    saveStore();
    refreshData();
  } catch (err) {
    if (state.syncError !== 'passcode') state.syncError = 'network';
  } finally {
    state.syncing = false;
    renderSyncPill();
    if (syncAgain) { syncAgain = false; scheduleSync(50); }
  }
}

// ---------- Events ----------
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b || b.dataset.filter === state.filter) return;
  state.filter = b.dataset.filter;
  rebuildDeck();
  render();
});
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tab && b.dataset.tab !== state.tab) { state.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
  else if (b.dataset.action === 'add') openEditor();
  else if (b.dataset.action === 'settings') openSettings();
});
$('#sync-pill').addEventListener('click', openSettings);
$('#theme-btn')?.addEventListener('click', () => setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark'));
$('#main').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'next' || act === 'prev') return go(act);
  if (act === 'edit') return openEditor(currentQuote()?.id);
  const card = e.target.closest('.qcard.compact');
  if (card && canEdit()) openEditor(card.dataset.id);
});
$('#main').addEventListener('input', (e) => {
  if (e.target.id === 'search') { state.search = e.target.value; renderListItems(); }
});
$('#main').addEventListener('change', (e) => {
  if (e.target.id === 'sort') { state.sort = e.target.value; renderListItems(); }
});
$('#sheet-root').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeSheet();
  if ($('#sheet-root').firstChild || state.tab !== 'random' || /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go('next'); }
  if (e.key === 'ArrowLeft') go('prev');
});
window.addEventListener('online', () => { renderSyncPill(); sync(); });
window.addEventListener('offline', renderSyncPill);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
setInterval(() => document.visibilityState === 'visible' && sync(), 5 * 60 * 1000);

// ---------- Start ----------
applyTheme();
rebuildDeck();
render();
sync();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
