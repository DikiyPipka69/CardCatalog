const API = (window.API_BASE || 'http://localhost:8000') + '/api/tasks';

async function fetchTasks(){
  const res = await fetch(API);
  const tasks = await res.json();
  render(tasks);
}

function render(tasks){
  const open = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  document.getElementById('openCount').textContent = open.length;

  const openEl = document.getElementById('openCards');
  const doneEl = document.getElementById('doneCards');

  openEl.innerHTML = open.length
    ? open.map(cardHtml).join('')
    : '<div class="empty">Пусто. Заведите первую карточку выше.</div>';

  doneEl.innerHTML = done.length
    ? done.map(cardHtml).join('')
    : '<div class="empty">Закрытых карточек пока нет.</div>';

  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => toggleTask(btn.dataset.toggle, btn.dataset.done === 'true'));
  });
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.delete));
  });
}

const CATEGORY_LABELS = {general: 'Общее', client: 'Клиент', design: 'Дизайн', dev: 'Разработка'};

function cardHtml(t){
  return `
    <div class="card ${t.done ? 'done' : ''}">
      ${t.done ? '<span class="stamp">DONE</span>' : ''}
      <div class="card-category">${CATEGORY_LABELS[t.category] || t.category}</div>
      <div class="card-title">${escapeHtml(t.title)}</div>
      ${t.note ? `<div class="card-note">${escapeHtml(t.note)}</div>` : ''}
      <div class="card-actions">
        <button data-toggle="${t.id}" data-done="${t.done}">${t.done ? 'Вернуть в работу' : 'Закрыть'}</button>
        <button class="del" data-delete="${t.id}">Удалить</button>
      </div>
    </div>
  `;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function toggleTask(id, currentlyDone){
  await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({done: !currentlyDone})
  });
  fetchTasks();
}

async function deleteTask(id){
  await fetch(`${API}/${id}`, {method: 'DELETE'});
  fetchTasks();
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const title = form.title.value.trim();
  const category = form.category.value;
  if(!title) return;

  await fetch(API, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title, category, note: ''})
  });
  form.title.value = '';
  fetchTasks();
});

fetchTasks();
