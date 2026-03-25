/**
 * BIO ANÁLISE — Shared Utilities
 */

const UTILS = (() => {

  // Format currency BRL
  function currency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }

  // Format date BR
  function date(iso) {
    if (!iso) return '—';
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('pt-BR');
  }

  function datetime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function dateInput(iso) {
    if (!iso) return '';
    return iso.slice(0,10);
  }

  function today() {
    return new Date().toISOString().slice(0,10);
  }

  function todayFormatted() {
    return new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  function age(birthIso) {
    if (!birthIso) return '—';
    const birth = new Date(birthIso);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age + ' anos';
  }

  // Badge HTML
  function paymentBadge(forma) {
    const map = {
      'Pix':      'info',
      'Dinheiro': 'success',
      'Cartão':   'warning',
      'Parcelado':'warning',
      'Pendente': 'gray'
    };
    const cls = map[forma] || 'gray';
    return `<span class="badge badge-${cls}">${forma}</span>`;
  }

  function situacaoBadge(sit) {
    const map = { 'pago':'success', 'parcial':'warning', 'pendente':'danger' };
    const labels = { 'pago':'Pago', 'parcial':'Parcial', 'pendente':'Pendente' };
    return `<span class="badge badge-${map[sit]||'gray'}">${labels[sit]||sit}</span>`;
  }

  function statusBadge(s) {
    return s === 'ativo'
      ? `<span class="badge badge-success">Ativo</span>`
      : `<span class="badge badge-gray">Inativo</span>`;
  }

  // Escape HTML
  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Toast notifications
  function toast(message, type = 'success', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
      info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#1a4fa0' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.style.color = colors[type] || colors.info;
    t.innerHTML = `${icons[type]||''}<span style="color:#374151;font-size:13px">${esc(message)}</span>`;
    container.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'none';
      t.style.opacity = '0';
      t.style.transform = 'translateX(100%)';
      t.style.transition = '0.3s ease';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  // Modal helpers
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  // Confirm dialog
  function confirm(msg) {
    return window.confirm(msg);
  }

  // Pagination helper
  function paginate(arr, page, perPage) {
    const start = (page - 1) * perPage;
    return { items: arr.slice(start, start + perPage), total: arr.length, pages: Math.ceil(arr.length / perPage) };
  }

  // Sidebar active link
  function setActiveSidebarLink(href) {
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === href);
    });
  }

  // Render pagination controls
  function renderPagination(containerId, total, page, perPage, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) { container.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
      html += `<button class="page-btn${i===page?' active':''}" onclick="(${onChange})(${i})">${i}</button>`;
    }
    container.innerHTML = `<div class="pagination">${html}</div>`;
  }

  // Generic table row count info
  function rowCountText(shown, total) {
    return `Exibindo <strong>${shown}</strong> de <strong>${total}</strong> registros`;
  }

  return {
    currency, date, datetime, dateInput, today, todayFormatted, age,
    paymentBadge, situacaoBadge, statusBadge,
    esc, toast, openModal, closeModal, confirm, paginate,
    setActiveSidebarLink, renderPagination, rowCountText
  };
})();
