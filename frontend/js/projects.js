// ==========================================
// Projects Module — CRUD + Kanban navigation
// ==========================================
const Projects = (() => {
  let _editingId = null;

  // ---- Load & render project cards ----
  async function loadProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '<p class="loading">Loading projects…</p>';
    try {
      const data = await api.get('/projects');
      if (!data.data.length) {
        grid.innerHTML = '<p class="empty-state">No projects yet. Create one to get started.</p>';
        return;
      }
      grid.innerHTML = data.data.map(renderProjectCard).join('');
      grid.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          openProjectDetail(card.dataset.id);
        });
      });
      grid.querySelectorAll('.btn-edit-project').forEach(btn => {
        btn.addEventListener('click', () => openProjectModal(btn.dataset.id));
      });
      grid.querySelectorAll('.btn-delete-project').forEach(btn => {
        btn.addEventListener('click', () => deleteProject(btn.dataset.id));
      });
    } catch (err) {
      grid.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  function renderProjectCard(p) {
    const s = p.taskStats || {};
    const progress = s.total ? Math.round((s.done / s.total) * 100) : 0;
    const isAdmin = Auth.isAdmin();
    return `
      <div class="project-card" data-id="${p._id}" style="--project-color:${p.color || '#6366f1'}">
        <div class="project-card-top">
          <div class="project-color-bar" style="background:${p.color || '#6366f1'}"></div>
          <div class="project-title">${esc(p.name)}</div>
          ${isAdmin ? `<div class="card-actions">
            <button class="btn btn-sm btn-ghost btn-edit-project" data-id="${p._id}">✎</button>
            <button class="btn btn-sm btn-danger btn-delete-project" data-id="${p._id}">✕</button>
          </div>` : ''}
        </div>
        <p class="project-desc">${esc(p.description || 'No description')}</p>
        <div class="project-stats">
          <span class="badge badge-${p.status}">${p.status}</span>
          <span>${s.total || 0} tasks</span>
          <span class="overdue">${s.overdue || 0} overdue</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="progress-label">${progress}% complete</div>
      </div>`;
  }

  // ---- Project Detail / Kanban ----
  async function openProjectDetail(projectId) {
    App.switchView('project-detail');
    document.getElementById('page-title').textContent = 'Loading…';
    try {
      const data = await api.get(`/projects/${projectId}`);
      const p = data.data;
      document.getElementById('page-title').textContent = p.name;
      document.getElementById('project-detail-meta').innerHTML =
        `<span class="badge badge-${p.status}">${p.status}</span>
         <span class="badge badge-priority-${p.priority}">${p.priority}</span>`;

      // Back button
      document.getElementById('back-to-projects').onclick = () => App.switchView('projects');

      // Load tasks into kanban
      await Tasks.loadKanban(projectId, p.members);

      // Members
      renderMembers(p, projectId);

      // Add member button
      document.getElementById('add-member-btn').onclick = () => openMemberModal(projectId);

    } catch (err) {
      App.toast(err.message, 'error');
      App.switchView('projects');
    }
  }

  function renderMembers(project, projectId) {
    const list = document.getElementById('members-list');
    const allMembers = [
      { user: project.owner, role: 'owner' },
      ...project.members.filter(m => m.user._id !== project.owner._id)
    ];
    list.innerHTML = allMembers.map(m => `
      <div class="member-item">
        <div class="user-avatar sm">${(m.user.name || 'U')[0].toUpperCase()}</div>
        <div class="member-info">
          <div class="member-name">${esc(m.user.name)}</div>
          <div class="member-email">${esc(m.user.email)}</div>
        </div>
        <span class="badge">${m.role}</span>
        ${Auth.isAdmin() && m.role !== 'owner' ? `
          <button class="btn btn-sm btn-danger" onclick="Projects.removeMember('${projectId}','${m.user._id}')">Remove</button>
        ` : ''}
      </div>`).join('');
  }

  // ---- Project Modal (create/edit) ----
  function openProjectModal(id = null) {
    _editingId = id;
    document.getElementById('project-modal-title').textContent = id ? 'Edit Project' : 'New Project';
    document.getElementById('project-form-error').classList.add('hidden');

    if (id) {
      api.get(`/projects/${id}`).then(data => {
        const p = data.data;
        document.getElementById('proj-name').value    = p.name;
        document.getElementById('proj-desc').value    = p.description || '';
        document.getElementById('proj-status').value  = p.status;
        document.getElementById('proj-priority').value = p.priority;
        document.getElementById('proj-duedate').value = p.dueDate ? p.dueDate.split('T')[0] : '';
        document.getElementById('proj-color').value   = p.color || '#6366f1';
      });
    } else {
      document.getElementById('project-form').reset();
      document.getElementById('proj-color').value = '#6366f1';
    }
    document.getElementById('project-modal').classList.remove('hidden');
  }

  document.getElementById('project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('project-form-error');
    errEl.classList.add('hidden');
    const body = {
      name:        document.getElementById('proj-name').value,
      description: document.getElementById('proj-desc').value,
      status:      document.getElementById('proj-status').value,
      priority:    document.getElementById('proj-priority').value,
      dueDate:     document.getElementById('proj-duedate').value || null,
      color:       document.getElementById('proj-color').value,
    };
    try {
      if (_editingId) {
        await api.put(`/projects/${_editingId}`, body);
        App.toast('Project updated!');
      } else {
        await api.post('/projects', body);
        App.toast('Project created!');
      }
      document.getElementById('project-modal').classList.add('hidden');
      loadProjects();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  async function deleteProject(id) {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      App.toast('Project deleted.');
      loadProjects();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  // ---- Member Modal ----
  function openMemberModal(projectId) {
    document.getElementById('member-form').reset();
    document.getElementById('member-form-error').classList.add('hidden');
    document.getElementById('member-modal').classList.remove('hidden');
    document.getElementById('member-form').onsubmit = async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('member-form-error');
      errEl.classList.add('hidden');
      try {
        await api.post(`/projects/${projectId}/members`, {
          email: document.getElementById('member-email').value,
          role:  document.getElementById('member-role').value
        });
        document.getElementById('member-modal').classList.add('hidden');
        App.toast('Member added!');
        openProjectDetail(projectId);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    };
  }

  async function removeMember(projectId, userId) {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      App.toast('Member removed.');
      openProjectDetail(projectId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  return { loadProjects, openProjectModal, openProjectDetail, removeMember };
})();
