// ==========================================
// Tasks Module — Kanban board + My Tasks + Dashboard
// ==========================================
const Tasks = (() => {

  function renderKanbanCard(task) {
  const isOverdue =
    task.dueDate &&
    new Date() > new Date(task.dueDate) &&
    task.status !== 'done';

  return `
    <div class="kanban-card" data-id="${task._id}">
      <div class="task-title">${esc(task.title)}</div>

      <div class="task-meta">
        <span class="badge badge-priority-${task.priority}">
          ${task.priority}
        </span>

        <span class="due-date ${isOverdue ? 'overdue' : ''}">
          ${task.dueDate ? fmtDate(task.dueDate) : ''}
        </span>
      </div>

      <div class="card-actions">
        <button class="btn-edit-task" data-id="${task._id}">Edit</button>
        <button class="btn-delete-task" data-id="${task._id}">Delete</button>
      </div>
    </div>
  `;
}
  let _currentProjectId = null;
  let _currentMembers   = [];

  // ---- Dashboard ----
async function loadDashboard() {
  try {
    const data = await api.get('/tasks/dashboard');
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

    // ⭐ SORT BY PRIORITY
    const priorityOrder = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    s.recentTasks.sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // render after sorting
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
      // Get all projects user has access to, then fetch their tasks
      const projData = await api.get('/projects');
      const allTasks = [];
      for (const p of projData.data) {
        let url = `/tasks?project=${p._id}`;
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

  // Wire up filters
  document.getElementById('task-filter-status')?.addEventListener('change', loadMyTasks);
  document.getElementById('task-filter-priority')?.addEventListener('change', loadMyTasks);

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

        <!-- ⭐ DEADLINE (always visible) -->
        <span class="due-date ${isOverdue ? 'overdue' : ''}">
          📅 ${t.dueDate ? `Due: ${fmtDate(t.dueDate)}` : 'No deadline'}
        </span>

        ${t.assignedTo ? `<span class="assignee">${esc(t.assignedTo.name)}</span>` : ''}

      </div>
    </div>
  `;
}

  // ---- Kanban Board ----
  async function loadKanban(projectId, members) {
    _currentProjectId = projectId;
    _currentMembers   = members || [];

    const statuses = ['todo', 'in-progress', 'in-review', 'done'];
    statuses.forEach(s => {
      document.getElementById(`tasks-${s}`).innerHTML = '';
      document.getElementById(`count-${s}`).textContent = '0';
    });

    try {
      const data = await api.get(`/tasks?project=${projectId}`);
      const tasks = data.data;

      statuses.forEach(status => {
        const col = tasks.filter(t => t.status === status);
        document.getElementById(`count-${status}`).textContent = col.length;
        document.getElementById(`tasks-${status}`).innerHTML =
          col.map(renderKanbanCard).join('') || '<p class="empty-col">No tasks</p>';
      });

      // Edit / delete listeners
      document.querySelectorAll('.kanban-card').forEach(card => {
        card.querySelector('.btn-edit-task')?.addEventListener('click', () => openTaskModal(projectId, card.dataset.id));
        card.querySelector('.btn-delete-task')?.addEventListener('click', () => deleteTask(card.dataset.id, projectId));
      });

      // Add task buttons
      document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.onclick = () => openTaskModal(projectId, null, btn.dataset.status);
      });

    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  function renderKanbanCard(t) {
    return `
      <div class="kanban-card priority-${t.priority}" data-id="${t._id}">
        <div class="kanban-card-header">
          <span class="card-title">${esc(t.title)}</span>
          <div class="card-actions">
            <button class="btn btn-xs btn-ghost btn-edit-task">✎</button>
            <button class="btn btn-xs btn-danger btn-delete-task">✕</button>
          </div>
        </div>
        ${t.description ? `<p class="card-desc">${esc(t.description)}</p>` : ''}
        <div class="card-meta">
          <span class="badge badge-priority-${t.priority}">${t.priority}</span>
          ${t.assignedTo ? `<span class="assignee-chip">${esc(t.assignedTo.name)}</span>` : ''}
          ${t.dueDate ? `<span class="due ${new Date() > new Date(t.dueDate) && t.status !== 'done' ? 'overdue' : ''}">${fmtDate(t.dueDate)}</span>` : ''}
        </div>
      </div>`;
  }

  // ---- Task Modal ----
  function openTaskModal(projectId, taskId = null, defaultStatus = 'todo') {
    document.getElementById('task-project-id').value = projectId;
    document.getElementById('task-id').value          = taskId || '';
    document.getElementById('task-modal-title').textContent = taskId ? 'Edit Task' : 'New Task';
    document.getElementById('task-form-error').classList.add('hidden');

    // Populate assignee dropdown
    const sel = document.getElementById('task-assignee');
    sel.innerHTML = '<option value="">Unassigned</option>';
    _currentMembers.forEach(m => {
      const u = m.user;
      sel.innerHTML += `<option value="${u._id}">${esc(u.name)}</option>`;
    });

    if (taskId) {
      api.get(`/tasks?project=${projectId}`).then(data => {
        const task = data.data.find(t => t._id === taskId);
        if (!task) return;
        document.getElementById('task-title').value    = task.title;
        document.getElementById('task-desc').value     = task.description || '';
        document.getElementById('task-status').value   = task.status;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-duedate').value  = task.dueDate ? task.dueDate.split('T')[0] : '';
        document.getElementById('task-assignee').value = task.assignedTo?._id || '';
      });
    } else {
      document.getElementById('task-form').reset();
      document.getElementById('task-status').value   = defaultStatus;
      document.getElementById('task-priority').value = 'medium';
    }

    document.getElementById('task-modal').classList.remove('hidden');
  }

  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl    = document.getElementById('task-form-error');
    const taskId   = document.getElementById('task-id').value;
    const projectId = document.getElementById('task-project-id').value;
    errEl.classList.add('hidden');

    const body = {
      title:       document.getElementById('task-title').value,
      description: document.getElementById('task-desc').value,
      status:      document.getElementById('task-status').value,
      priority:    document.getElementById('task-priority').value,
      assignedTo:  document.getElementById('task-assignee').value || null,
      dueDate:     document.getElementById('task-duedate').value || null,
      project:     projectId
    };

    try {
      if (taskId) {
        await api.put(`/tasks/${taskId}`, body);
        App.toast('Task updated!');
      } else {
        await api.post('/tasks', body);
        App.toast('Task created!');
      }
      document.getElementById('task-modal').classList.add('hidden');
      loadKanban(projectId, _currentMembers);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  async function deleteTask(taskId, projectId) {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      App.toast('Task deleted.');
      loadKanban(projectId, _currentMembers);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
document.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('status-dropdown')) return;

  const taskId = e.target.dataset.id;
  const newStatus = e.target.value;

  try {
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    App.toast('Status updated!');

    // ✅ THIS IS THE FIX
    Tasks.loadDashboard();
    Tasks.loadMyTasks();

  } catch (err) {
    App.toast(err.message, 'error');
  }
});
  return { loadDashboard, loadMyTasks, loadKanban, openTaskModal };
})();
