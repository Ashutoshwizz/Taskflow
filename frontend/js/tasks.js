// ==========================================
// Tasks Module — Kanban board + My Tasks + Dashboard
// ==========================================
const Tasks = (() => {
  let _currentProjectId = null;
  let _currentMembers   = [];

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

  // ---- Create / Update Task ----
  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const taskId = document.getElementById('task-id').value;
    const projectId = document.getElementById('task-project-id').value;

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
        await api.put(`/api/tasks/${taskId}`, body); // ✅ FIXED
        App.toast('Task updated!');
      } else {
        await api.post('/api/tasks', body); // ✅ FIXED
        App.toast('Task created!');
      }

      document.getElementById('task-modal').classList.add('hidden');
      loadKanban(projectId, _currentMembers);

    } catch (err) {
      App.toast(err.message, 'error');
    }
  });

  // ---- Delete ----
  async function deleteTask(taskId, projectId) {
    if (!confirm('Delete this task?')) return;

    try {
      await api.delete(`/api/tasks/${taskId}`); // ✅ FIXED
      App.toast('Task deleted.');
      loadKanban(projectId, _currentMembers);

    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  // ---- Status Change ----
  document.addEventListener('change', async (e) => {
    if (!e.target.classList.contains('status-dropdown')) return;

    const taskId = e.target.dataset.id;
    const newStatus = e.target.value;

    try {
      await api.put(`/api/tasks/${taskId}`, { status: newStatus }); // ✅ FIXED

      App.toast('Status updated!');
      Tasks.loadDashboard();
      Tasks.loadMyTasks();

    } catch (err) {
      App.toast(err.message, 'error');
    }
  });

  return { loadDashboard, loadMyTasks, loadKanban };
})();