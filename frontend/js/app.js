// ==========================================
// App — Main Orchestrator
// ==========================================
const App = (() => {
  // ---- Utilities ----
  window.esc = (str) => {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  };
  window.fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ---- Toast ----
  let _toastTimer;
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  // ---- Page switching ----
  function showAuth() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('main-page').classList.remove('active');

  // extra safety (ensures UI switch instantly)
  document.getElementById('auth-page').style.display = 'flex';
  document.getElementById('main-page').style.display = 'none';
}
function showMain() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('main-page').classList.add('active');

  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('main-page').style.display = 'flex';

  initMainUI();
  switchView('dashboard');
}

  function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');

    // Update nav highlight
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');

    // Primary action button
    const actionBtn = document.getElementById('primary-action-btn');
    if (view === 'projects' && Auth.isAdmin()) {
      actionBtn.textContent = '+ New Project';
      actionBtn.classList.remove('hidden');
      actionBtn.onclick = () => Projects.openProjectModal();
    } else {
      actionBtn.classList.add('hidden');
    }

    // Load data
    if (view === 'dashboard')  { document.getElementById('page-title').textContent = 'Ethara AI Dashboard'; Tasks.loadDashboard(); }
    if (view === 'projects')   { document.getElementById('page-title').textContent = 'Projects';  Projects.loadProjects(); }
    if (view === 'tasks')      { document.getElementById('page-title').textContent = 'My Tasks';  Tasks.loadMyTasks(); }
    if (view === 'users')      { document.getElementById('page-title').textContent = 'Users';     Users.loadUsers(); }
  }

  // ---- Sidebar nav ----
  function initMainUI() {
    const user = Auth.getUser();
    document.getElementById('sidebar-name').textContent = user?.name || 'User';
    document.getElementById('sidebar-role').textContent = user?.role || 'member';
    document.getElementById('sidebar-avatar').textContent = (user?.name || 'U')[0].toUpperCase();

    // Show admin-only items
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.toggle('hidden', !Auth.isAdmin());
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });
  }

  // ---- Modal close ----
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', () => {
      el.closest('.modal')?.classList.add('hidden');
    });
  });

  // ---- Init ----
async function init() {
  const user = await Auth.loadUser();

  if (user) {
    showMain();   // ✅ stay logged in
  } else {
    showAuth();   // ✅ show login only if not logged in
  }
}

  init();

  return { showAuth, showMain, switchView, toast };
})();
