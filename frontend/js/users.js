// ==========================================
// Users Module — Admin user management
// ==========================================
const Users = (() => {

  async function loadUsers() {
    const list = document.getElementById('users-list');
    list.innerHTML = '<p class="loading">Loading users…</p>';
    try {
      const data = await api.get('/api/users'); // ✅ FIXED

      if (!data.data.length) {
        list.innerHTML = '<p class="empty-state">No users found.</p>';
        return;
      }

      list.innerHTML = data.data.map(renderUserRow).join('');

      list.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', () => toggleRole(btn.dataset.id, btn.dataset.role));
      });

      list.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.id));
      });

    } catch (err) {
      list.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  function renderUserRow(u) {
    const self = Auth.getUser()?._id === u._id;

    return `
      <div class="user-row">
        <div class="user-avatar">${(u.name || 'U')[0].toUpperCase()}</div>
        <div class="user-row-info">
          <div class="user-name">${esc(u.name)} ${self ? '<span class="badge">You</span>' : ''}</div>
          <div class="user-email">${esc(u.email)}</div>
        </div>
        <span class="badge badge-role-${u.role}">${u.role}</span>
        <div class="user-actions">
          ${!self ? `
            <button class="btn btn-sm btn-secondary btn-toggle-role"
              data-id="${u._id}" data-role="${u.role === 'admin' ? 'member' : 'admin'}">
              Make ${u.role === 'admin' ? 'Member' : 'Admin'}
            </button>
            <button class="btn btn-sm btn-danger btn-delete-user" data-id="${u._id}">Delete</button>
          ` : ''}
        </div>
      </div>`;
  }

  async function toggleRole(userId, newRole) {
    try {
      await api.put(`/api/users/${userId}/role`, { role: newRole }); // ✅ FIXED
      App.toast(`Role updated to ${newRole}.`);
      loadUsers();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/api/users/${userId}`); // ✅ FIXED
      App.toast('User deleted.');
      loadUsers();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  return { loadUsers };
})();