const API = (window.API_BASE || '') + '/api/tasks';

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

function initTheme(){
  const saved = localStorage.getItem('cardcatalog-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
}
initTheme();

const CATEGORY_LABELS = {general: 'Общее', client: 'Клиент', design: 'Дизайн', dev: 'Разработка'};

function formatDayLabel(date){
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return 'Сегодня';
  if (sameDay(date, yesterday)) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});
}

function formatTime(date){
  return date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
}

async function loadHistory(){
  const res = await fetch(API, {headers: authHeaders()});
  const allTasks = await res.json();
  const completed = allTasks
    .filter(t => t.done && t.completed_at)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  renderHistory(completed);
}

function renderHistory(tasks){
  const container = document.getElementById('historyContent');

  if (!tasks.length) {
    container.innerHTML = '<div class="history-empty">История пуста — здесь появятся задачи, которые вы закроете.</div>';
    return;
  }

  const groups = new Map(); // dayKey -> {label, entries: []}

  tasks.forEach(task => {
    const date = new Date(task.completed_at);
    const dayKey = date.toDateString();
    if (!groups.has(dayKey)) {
      groups.set(dayKey, {label: formatDayLabel(date), entries: []});
    }
    groups.get(dayKey).entries.push({task, date});
  });

  const html = [...groups.values()].map(group => `
    <div class="history-day">
      <p class="history-day-label">${group.label}</p>
      ${group.entries.map(({task, date}) => `
        <div class="history-entry">
          <span class="history-time">${formatTime(date)}</span>
          <span class="history-title">${escapeHtml(task.title)}</span>
          <span class="history-category">${CATEGORY_LABELS[task.category] || task.category}</span>
        </div>
      `).join('')}
    </div>
  `).join('');

  container.innerHTML = html;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
  const confirmed = confirm('Удалить всю историю выполненных задач без возможности восстановления?');
  if (!confirmed) return;

  const btn = document.getElementById('clearHistoryBtn');
  btn.disabled = true;
  btn.textContent = 'Очищаем…';

  try {
    await fetch(`${API}/completed`, {method: 'DELETE', headers: authHeaders()});
    await loadHistory();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Очистить историю';
  }
});

loadHistory();
