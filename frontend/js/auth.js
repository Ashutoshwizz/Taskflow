// ==========================================
// Auth Module — login, signup, logout, session
// ==========================================
const Auth = (() => {
  const TOKEN_KEY = 'tf_token';
  const USER_KEY  = 'tf_user';

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  }

  function isAdmin() {
    return getUser()?.role === 'admin';
  }

  async function loadUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const data = await api.get('/api/auth/me');
      saveSession(token, data.user);
      return data.user;
    } catch {
      clearSession();
      return null;
    }
  }

  // ---- Tab switching ----
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`)?.classList.add('active');
    });
  });

  // ---- Login ----
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    try {
      const data = await api.post('/api/auth/login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      });
      saveSession(data.token, data.user);
      App.showMain();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  // ---- Signup ----
  document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('signup-error');
    errEl.classList.add('hidden');
    try {
     const data = await api.post('/api/auth/signup', {
        name:     document.getElementById('signup-name').value,
        email:    document.getElementById('signup-email').value,
        password: document.getElementById('signup-password').value,
        role:     document.getElementById('signup-role').value
      });
      saveSession(data.token, data.user);
      App.showMain();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  // ---- Logout ----
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearSession();
    App.showAuth();
  });

  return { loadUser, getUser, isAdmin, saveSession, clearSession };
})();
