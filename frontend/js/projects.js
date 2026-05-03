// ==========================================
// Projects Module — CRUD + Kanban navigation
// ==========================================
const Projects = (() => {
  let _editingId = null;

  async function loadProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '<p class="loading">Loading projects…</p>';
    try {
      const data = await api.get('/api/projects');
      if (!data.data.length) {
        grid.innerHTML = '<p class="empty-state">No projects yet.</p>';
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
    <div class="project-card" data-id="${p._id}">
      
      <div class="project-card-header">
        <div class="project-name">${esc(p.name)}</div>
      </div>

      <div class="project-desc">
        ${p.description ? esc(p.description) : 'No description'}
      </div>

      <div class="project-meta">
        <span class="badge badge-status">${p.status || 'ACTIVE'}</span>
        <span>${s.total || 0} tasks ${s.overdue || 0} overdue</span>
      </div>

      <div class="project-footer">
        ${isAdmin ? `
          <button class="btn btn-sm btn-secondary btn-edit-project" data-id="${p._id}">
            Edit
          </button>
        ` : ''}
        <span>${progress}% complete</span>
      </div>

    </div>
  `;
}

  async function openProjectDetail(projectId) {
    App.switchView('project-detail');

    try {
      const data = await api.get(`/api/projects/${projectId}`);
      const p = data.data;

      document.getElementById('page-title').textContent = p.name;

      await Tasks.loadKanban(projectId, p.members);
      renderMembers(p, projectId);

    } catch (err) {
      App.toast(err.message, 'error');
      App.switchView('projects');
    }
  }

  function renderMembers(project, projectId) {
    const list = document.getElementById('members-list');

    list.innerHTML = project.members.map(m => `
      <div>${esc(m.user.name)}</div>
    `).join('');
  }

  function openProjectModal(id = null) {
    _editingId = id;
    document.getElementById('project-modal').classList.remove('hidden');
  }

  document.getElementById('project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      name: document.getElementById('proj-name').value,
    };

    try {
      if (_editingId) {
        // ✅ FIXED HERE
        await api.put(`/api/projects/${_editingId}`, body);
      } else {
        await api.post('/api/projects', body);
      }

      loadProjects();

    } catch (err) {
      console.error(err);
    }
  });

  async function deleteProject(id) {
    await api.delete(`/api/projects/${id}`);
    loadProjects();
  }

  return { loadProjects, openProjectModal, openProjectDetail };
})();