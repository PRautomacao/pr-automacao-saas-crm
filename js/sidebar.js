/**
 * BIO ANÁLISE — Shared Sidebar Component
 * Call SIDEBAR.render(activePage) on each page
 */
const SIDEBAR = (() => {

  function render(activePage) {
    const session = AUTH.getSession();
    if (!session) return;
    const isAdmin = session.role === 'admin';

    const navItems = [
      { href: 'dashboard.html',    icon: homeIcon(),        label: 'Dashboard',     always: true  },
      { href: 'caixa.html',        icon: cashIcon(),        label: 'Fluxo de Caixa', adminOnly: true },
      { href: 'pacientes.html',    icon: usersIcon(),       label: 'Pacientes',     always: true  },
      { href: 'atendimentos.html', icon: clipboardIcon(),   label: 'Atendimentos',  always: true  },
      { href: 'exames.html',       icon: flaskIcon(),       label: 'Exames',        always: true  },
      { href: 'funcionarios.html', icon: teamIcon(),        label: 'Funcionários',  adminOnly: true },
      { href: 'relatorios.html',   icon: chartIcon(),       label: 'Relatórios',    adminOnly: true },
      { href: 'configuracoes.html',icon: settingsIcon(),    label: 'Configurações', adminOnly: true },
    ];

    const filtered = navItems.filter(i => i.always || (isAdmin && i.adminOnly) || (!i.adminOnly && !i.always));
    // Actually, atendente can see: dashboard, pacientes, atendimentos, exames
    const visible = navItems.filter(i => {
      if (i.always) return true;
      if (i.adminOnly && !isAdmin) return false;
      return true;
    });

    const navHTML = visible.map(i =>
      `<a href="${i.href}" class="sidebar-nav-item${activePage === i.href ? ' active' : ''}">
        <span class="nav-icon">${i.icon}</span>
        <span>${i.label}</span>
      </a>`
    ).join('');

    const initials = session.initials || session.name.substring(0,2).toUpperCase();
    const roleLabel = isAdmin ? 'Administrador' : 'Atendente';

    const sidebarHTML = `
      <aside class="sidebar" id="mainSidebar">
        <div class="sidebar-brand" style="justify-content:center;padding:20px 14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="background:white;border-radius:14px;padding:16px 20px;width:100%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 18px rgba(0,0,0,0.3);">
            <img src="assets/logo.png" alt="Bio Análise"
              style="width:100%;max-width:210px;height:auto;object-fit:contain;display:block;"
              onerror="this.onerror=null;this.style.display='none'" />
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section-label">Menu Principal</div>
          ${navHTML}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user" onclick="AUTH.logout()">
            <div class="user-avatar" id="sidebar-user-avatar">${initials}</div>
            <div class="user-info">
              <div class="user-name" id="sidebar-user-name">${session.name}</div>
              <div class="user-role" id="sidebar-user-role">${roleLabel} · Sair</div>
            </div>
          </div>
        </div>
      </aside>`;

    document.getElementById('sidebar-mount').innerHTML = sidebarHTML;
  }

  // SVG Icons
  function homeIcon()      { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'; }
  function cashIcon()      { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'; }
  function usersIcon()     { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'; }
  function clipboardIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>'; }
  function flaskIcon()     { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6m-6 0a1 1 0 0 0-1 1v6L4 20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L16 10V4a1 1 0 0 0-1-1m-6 0H9"/></svg>'; }
  function teamIcon()      { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'; }
  function chartIcon()     { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'; }
  function settingsIcon()  { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'; }

  return { render };
})();
