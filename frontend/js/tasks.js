// ==========================================
// Tasks Module — Kanban board + My Tasks + Dashboard
// ==========================================
const Tasks = (() => {

  let _currentProjectId = null;
  let _currentMembers   = [];

  // ---- Kanban Card (SINGLE CORRECT VERSION) ----
  function renderKanbanCard(task) {
    const isOverdue =
      task.dueDate &&
      new Date() > new Date(task.dueDate) &&
      task.status !== 'done';

    return `
      <div class="kanban-card priority-${task.priority}" data-id="${task._id}">
        <div class="kanban-card-header">
          <span class="card-title">${esc(task.title)}</span>
          <div class="card-actions">
            <button class="btn btn-xs btn-ghost btn-edit-task">✎</button>
            <button class="btn btn-xs btn-danger btn-delete-task">✕</button>
          </div>
        </div>

        ${task.description ? `<p class="card-desc">${esc(task.description)}</p>` : ''}

        <div class="card-meta">
          <span class="badge badge-priority-${task.priority}">
            ${task.priority}
          </span>

          ${task.assignedTo ? `<span class="assignee-chip">${esc(task.assignedTo.name)}</span>` : ''}

          ${task.dueDate ? `
            <span class="due ${isOverdue ? 'overdue' : ''}">
              ${fmtDate(task.dueDate)}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ---- Dashboard ----
  async function loadDashboard() {
    try {
      const data = await api.get('/api/tasks/dashboard'); // ✅ FIXED
      const s = data.data;

      document.getElementById('stat-total').textContent      = s.total;
      document.getElementById('stat-inprogress').textContent = s.inProgress;
      document.getElementById('stat-done').textContent       = s.done;
      document.getElementById('stat-overdue').textContent    = s.overdue;

      const list = document.getElementById('recent-tasks-list');

      if (!s.recentTasks.length) {
        list.innerHTML = '<p class="empty-state">No tasks yet.</p>';
        return;
      }

      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

      s.recentTasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      list.innerHTML = s.recentTasks.map(renderTaskRow).join('');

    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  // ---- My Tasks ----
  async function loadMyTasks() {
    const list = document.getElementById('my-tasks-list');
    list.innerHTML = '<p class="loading">Loading…</p>';

    const status   = document.getElementById('task-filter-status').value;
    const priority = document.getElementById('task-filter-priority').value;

    try {
      const projData = await api.get('/api/projects'); // ✅ FIXED
      const allTasks = [];

      for (const p of projData.data) {
        let url = `/api/tasks?project=${p._id}`; // ✅ FIXED
        if (status)   url += `&status=${status}`;
        if (priority) url += `&priority=${priority}`;

        const tData = await api.get(url);
        allTasks.push(...tData.data.map(t => ({ ...t, projectName: p.name })));
      }

      if (!allTasks.length) {
        list.innerHTML = '<p class="empty-state">No tasks found.</p>';
        return;
      }

      list.innerHTML = allTasks.map(renderTaskRow).join('');

    } catch (err) {
      list.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  // Filters
  document.getElementById('task-filter-status')?.addEventListener('change', loadMyTasks);
  document.getElementById('task-filter-priority')?.addEventListener('change', loadMyTasks);

  // ---- Task Row ----
  function renderTaskRow(t) {
    const isOverdue = t.dueDate && new Date() > new Date(t.dueDate) && t.status !== 'done';

    return `
      <div class="task-row priority-${t.priority}">
        <div class="task-row-main">
          <span class="task-title">${esc(t.title)}</span>
          ${t.projectName ? `<span class="task-project">${esc(t.projectName)}</span>` : ''}
        </div>

        <div class="task-row-meta">

          <select class="status-dropdown" data-id="${t._id}">
            <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>TODO</option>
            <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>IN-PROGRESS</option>
            <option value="in-review" ${t.status === 'in-review' ? 'selected' : ''}>IN-REVIEW</option>
            <option value="done" ${t.status === 'done' ? 'selected' : ''}>DONE</option>
          </select>

          <span class="badge badge-priority-${t.priority}">
            ${t.priority}
          </span>

          <span class="due-date ${isOverdue ? 'overdue' : ''}">
            📅 ${t.dueDate ? `Due: ${fmtDate(t.dueDate)}` : 'No deadline'}
          </span>

          ${t.assignedTo ? `<span class="assignee">${esc(t.assignedTo.name)}</span>` : ''}
        </div>
      </div>
    `;
  }

  // ---- Kanban ----
  async function loadKanban(projectId, members) {
    _currentProjectId = projectId;
    _currentMembers   = members || [];

    const statuses = ['todo', 'in-progress', 'in-review', 'done'];

    statuses.forEach(s => {
      document.getElementById(`tasks-${s}`).innerHTML = '';
      document.getElementById(`count-${s}`).textContent = '0';
    });

    try {
      const data = await api.get(`/api/tasks?project=${projectId}`); // ✅ FIXED
      const tasks = data.data;

      statuses.forEach(status => {
        const col = tasks.filter(t => t.status === status);

        document.getElementById(`count-${status}`).textContent = col.length;

        document.getElementById(`tasks-${status}`).innerHTML =
          col.map(renderKanbanCard).join('') || '<p class="empty-col">No tasks</p>';
      });

      document.querySelectorAll('.kanban-card').forEach(card => {
        card.querySelector('.btn-edit-task')?.addEventListener('click', () => openTaskModal(projectId, card.dataset.id));
        card.querySelector('.btn-delete-task')?.addEventListener('click', () => deleteTask(card.dataset.id, projectId));
      });

      document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.onclick = () => openTaskModal(projectId, null, btn.dataset.status);
      });

    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  // ---- Modal ----
  function openTaskModal(projectId, taskId = null, defaultStatus = 'todo') {
    document.getElementById('task-project-id').value = projectId;
    document.getElementById('task-id').value = taskId || '';

    const sel = document.getElementById('task-assignee');
    sel.innerHTML = '<option value="">Unassigned</option>';

    _currentMembers.forEach(m => {
      const u = m.user;
      sel.innerHTML += `<option value="${u._id}">${esc(u.name)}</option>`;
    });

    document.getElementById('task-modal').classList.remove('hidden');
  }

  async function deleteTask(taskId, projectId) {
    if (!confirm('Delete this task?')) return;

    try {
      await api.delete(`/api/tasks/${taskId}`); // ✅ FIXED
      App.toast('Task deleted.');
       await loadKanban(projectId, _currentMembers);
await Tasks.loadDashboard();
await Tasks.loadMyTasks();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
  // ---- Task Form Submit ----
document.getElementById('task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const projectId = document.getElementById('task-project-id').value;
  const taskId = document.getElementById('task-id').value;

  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    priority: document.getElementById('task-priority').value,
    dueDate: document.getElementById('task-due').value,
    assignedTo: document.getElementById('task-assignee').value,
    status: document.getElementById('task-status').value
  };

  try {
    if (taskId) {
      await api.put(`/api/tasks/${taskId}`, body);
      App.toast('Task updated!');
    } else {
      await api.post('/api/tasks', body);
      App.toast('Task created!');
    }

    document.getElementById('task-modal').classList.add('hidden');

    // ✅ FIX (this was missing)
   await loadKanban(projectId, _currentMembers);
await Tasks.loadDashboard();
await Tasks.loadMyTasks();

  } catch (err) {
    App.toast(err.message, 'error');
  }
});
// ---- Status Change ----
document.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('status-dropdown')) return;

  const taskId = e.target.dataset.id;
  const newStatus = e.target.value;

  try {
    await api.put(`/api/tasks/${taskId}`, { status: newStatus });

    App.toast('Status updated!');

    // ✅ FIX (this was missing)
  await Tasks.loadDashboard();
await Tasks.loadMyTasks();

    if (_currentProjectId) {
      await loadKanban(_currentProjectId, _currentMembers);
    }

  } catch (err) {
    App.toast(err.message, 'error');
  }
});

  return { loadDashboard, loadMyTasks, loadKanban, openTaskModal };

})();