/**
 * BIO ANÁLISE — Authentication Module
 * Controla login, sessão e verificação de perfil
 */

const AUTH = (() => {

  const USERS = [
    {
      id: 'u1',
      login: 'omar',
      password: 'bio2024',
      name: 'Dr. Omar',
      role: 'admin',
      initials: 'DO',
      avatar: null
    },
    {
      id: 'u2',
      login: 'adriana',
      password: 'bio2024',
      name: 'Adriana',
      role: 'atendente',
      initials: 'AD',
      avatar: null
    },
    {
      id: 'u3',
      login: 'kaleb',
      password: 'bio2024',
      name: 'Kaleb',
      role: 'atendente',
      initials: 'KA',
      avatar: null
    },
    {
      id: 'u4',
      login: 'cida',
      password: 'bio2024',
      name: 'Cida',
      role: 'atendente',
      initials: 'CI',
      avatar: null
    }
  ];

  const SESSION_KEY = 'bioanalise_session';

  function login(loginStr, password, remember) {
    const user = USERS.find(u =>
      u.login.toLowerCase() === loginStr.toLowerCase() &&
      u.password === password
    );
    if (!user) return { success: false, error: 'Usuário ou senha inválidos.' };

    const session = {
      userId:   user.id,
      login:    user.login,
      name:     user.name,
      role:     user.role,
      initials: user.initials,
      remember: !!remember,
      loginAt:  new Date().toISOString()
    };

    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return { success: true, user: session };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  function isLogged() {
    return !!getSession();
  }

  function isAdmin() {
    const s = getSession();
    return s && s.role === 'admin';
  }

  /**
   * Guard: redirects to login if not authenticated.
   * If adminOnly=true, redirects non-admins.
   */
  function requireAuth(adminOnly = false) {
    const session = getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    if (adminOnly && session.role !== 'admin') {
      window.location.href = 'dashboard.html';
      return null;
    }
    return session;
  }

  /**
   * Renders sidebar user info using session data
   */
  function renderSidebarUser() {
    const session = getSession();
    if (!session) return;
    const nameEl     = document.getElementById('sidebar-user-name');
    const roleEl     = document.getElementById('sidebar-user-role');
    const avatarEl   = document.getElementById('sidebar-user-avatar');
    if (nameEl) nameEl.textContent = session.name;
    if (roleEl) roleEl.textContent = session.role === 'admin' ? 'Administrador' : 'Atendente';
    if (avatarEl) avatarEl.textContent = session.initials;
  }

  /**
   * Show/hide elements based on role
   */
  function applyRoleVisibility() {
    const session = getSession();
    if (!session) return;
    const role = session.role;
    document.querySelectorAll('[data-role]').forEach(el => {
      const allowed = el.dataset.role.split(',').map(r => r.trim());
      if (!allowed.includes(role)) el.style.display = 'none';
    });
  }

  return { login, logout, getSession, isLogged, isAdmin, requireAuth, renderSidebarUser, applyRoleVisibility };
})();
