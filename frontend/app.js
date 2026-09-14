const API = (window.API_BASE || '') + '/api/tasks';

// ---------- Anonymous per-browser session ----------
// Not real authentication — just keeps each visitor's demo data separate
// without requiring accounts or passwords. Stored once, reused forever
// in this browser (until localStorage is cleared).

function getSessionId(){
  let id = localStorage.getItem('cardcatalog-session-id');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem('cardcatalog-session-id', id);
  }
  return id;
}

const SESSION_ID = getSessionId();

function authHeaders(extra = {}){
  return {'X-Session-Id': SESSION_ID, ...extra};
}

let allTasks = [];
let currentLang = 'ru';

// ---------- i18n ----------

const I18N = {
  ru: {
    eyebrow: 'Картотека задач',
    inProgress: 'в работе',
    titlePlaceholder: 'Новая карточка — что нужно сделать?',
    catGeneral: 'Общее', catClient: 'Клиент', catDesign: 'Дизайн', catDev: 'Разработка',
    addButton: 'Завести карточку',
    inProgressLabel: 'В работе',
    doneLabel: 'Закрыто',
    emptyOpen: 'Пусто. Заведите первую карточку выше.',
    emptyDone: 'Закрытых карточек пока нет.',
    due: 'до',
    overdue: 'просрочено',
  },
  en: {
    eyebrow: 'Task Catalog',
    inProgress: 'in progress',
    titlePlaceholder: 'New card — what needs doing?',
    catGeneral: 'General', catClient: 'Client', catDesign: 'Design', catDev: 'Development',
    addButton: 'Add card',
    inProgressLabel: 'In progress',
    doneLabel: 'Done',
    emptyOpen: 'Empty. Add your first card above.',
    emptyDone: 'No closed cards yet.',
    due: 'due',
    overdue: 'overdue',
  }
};

function t(key){ return I18N[currentLang][key] || key; }

const CATEGORY_KEYS = {general: 'catGeneral', client: 'catClient', design: 'catDesign', dev: 'catDev'};

function applyStaticTranslations(){
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('langLabel').textContent = currentLang === 'ru' ? 'EN' : 'RU';
}

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'ru' ? 'en' : 'ru';
  localStorage.setItem('cardcatalog-lang', currentLang);
  applyStaticTranslations();
  render();
});

// ---------- Theme ----------

function initTheme(){
  const saved = localStorage.getItem('cardcatalog-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
}
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cardcatalog-theme', next);
});

function initLang(){
  currentLang = localStorage.getItem('cardcatalog-lang') || 'ru';
}

// ---------- Icons (inline SVG, no external assets) ----------

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>`;
const ICON_CALENDAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`;

const CATEGORY_ICONS = {
  general: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/></svg>`,
  client: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  design: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>`,
  dev: `<svg class="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
};

// ---------- Data ----------

async function fetchTasks(){
  const res = await fetch(API, {headers: authHeaders()});
  allTasks = await res.json();
  render();
}

function sortByDueDate(tasks){
  return [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return b.id - a.id;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

function render(){
  const open = sortByDueDate(allTasks.filter(t => !t.done));
  const done = allTasks.filter(t => t.done).sort((a, b) => b.id - a.id);

  document.getElementById('openCount').textContent = open.length;

  const openEl = document.getElementById('openCards');
  const doneEl = document.getElementById('doneCards');

  openEl.innerHTML = open.length
    ? open.map((task, i) => cardHtml(task, i)).join('')
    : `<div class="empty">${t('emptyOpen')}</div>`;

  doneEl.innerHTML = done.length
    ? done.map((task, i) => cardHtml(task, i)).join('')
    : `<div class="empty">${t('emptyDone')}</div>`;

  bindCardEvents();
}

function isOverdue(task){
  if (!task.due_date || task.done) return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

function formatDue(dateStr){
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function cardHtml(task, index){
  const overdue = isOverdue(task);
  const categoryLabel = t(CATEGORY_KEYS[task.category] || 'catGeneral');
  const categoryIcon = CATEGORY_ICONS[task.category] || CATEGORY_ICONS.general;

  return `
    <div class="card ${task.done ? 'done' : ''}" data-id="${task.id}" style="--i:${index}">
      <div class="card-top-row">
        <button class="check-circle" data-toggle="${task.id}" data-done="${task.done}" aria-label="toggle">${ICON_CHECK}</button>
        <div class="card-body">
          <div class="card-category">${categoryIcon}${categoryLabel}</div>
          <div class="card-title" data-edit="${task.id}">${escapeHtml(task.title)}</div>
          ${task.due_date ? `<div class="card-due ${overdue ? 'overdue' : ''}">${ICON_CALENDAR}${overdue ? t('overdue') : t('due')} ${formatDue(task.due_date)}</div>` : ''}
        </div>
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-delete="${task.id}" aria-label="delete" title="Delete">${ICON_TRASH}</button>
      </div>
    </div>
  `;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Events ----------

function bindCardEvents(){
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => toggleTask(btn.dataset.toggle, btn.dataset.done === 'true'));
  });
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.delete));
  });
  document.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => startEdit(el));
  });
}

function startEdit(titleEl){
  const id = titleEl.dataset.edit;
  const task = allTasks.find(x => String(x.id) === String(id));
  if (!task) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'card-title-input';
  input.value = task.title;
  input.maxLength = 200;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = async () => {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== task.title) {
      await fetch(`${API}/${id}`, {
        method: 'PATCH',
        headers: authHeaders({'Content-Type': 'application/json'}),
        body: JSON.stringify({title: newTitle})
      });
      await fetchTasks();
    } else {
      render();
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = task.title; input.blur(); }
  });
  input.addEventListener('blur', commit, {once: true});
}

// ---------- Confirmation feedback (visual pulse + soft sound) ----------
// Plays only when marking a task as DONE, not when reopening it — a
// small reward moment, not noise on every click.

function playCompleteSound(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch (err) {
    // Web Audio unsupported or blocked — fail silently, it's a nice-to-have.
  }
}

async function toggleTask(id, currentlyDone){
  const card = document.querySelector(`.card[data-id="${id}"]`);
  const markingDone = !currentlyDone;

  if (markingDone && card) {
    const circle = card.querySelector('.check-circle');
    if (circle) {
      circle.classList.add('pulse');
      circle.addEventListener('animationend', () => circle.classList.remove('pulse'), {once: true});
    }
    playCompleteSound();
  }

  if (card) card.classList.add('removing');
  await new Promise(r => setTimeout(r, card ? 260 : 0));

  await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: authHeaders({'Content-Type': 'application/json'}),
    body: JSON.stringify({done: markingDone})
  });
  fetchTasks();
}

async function deleteTask(id){
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) card.classList.add('removing');
  await new Promise(r => setTimeout(r, card ? 280 : 0));

  await fetch(`${API}/${id}`, {method: 'DELETE', headers: authHeaders()});
  fetchTasks();
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const title = form.title.value.trim();
  const category = form.category.value;
  const due_date = form.due_date.value || null;
  if (!title) return;

  await fetch(API, {
    method: 'POST',
    headers: authHeaders({'Content-Type': 'application/json'}),
    body: JSON.stringify({title, category, due_date})
  });
  form.title.value = '';
  form.due_date.value = '';
  fetchTasks();
});

// ---------- Init ----------

initTheme();
initLang();
applyStaticTranslations();
fetchTasks();
