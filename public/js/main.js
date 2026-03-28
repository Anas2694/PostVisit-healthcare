/**
 * PostVisit — Main Client JS (FIXED)
 * Theme toggle, sidebar, notifications, utilities
 */
(function () {
  'use strict';

  // ========================
  // Theme Toggle — no flash
  // ========================
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const html = document.documentElement;

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('pv-theme', theme);
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // Apply saved theme immediately
  const saved = localStorage.getItem('pv-theme') || 'light';
  applyTheme(saved);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  // ========================
  // Sidebar Mobile Toggle
  // ========================
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
  }

  if (menuBtn) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); openSidebar(); });
  if (sidebarToggle) sidebarToggle.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
      closeSidebar();
    }
  });

  // ========================
  // Notification count
  // ========================
  const notifBadge = document.getElementById('notif-badge');
  const notifDot = document.getElementById('notifDot');

  if (notifBadge || notifDot) {
    fetch('/api/v1/notifications/count', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(data => {
        if (data.count > 0) {
          if (notifBadge) { notifBadge.style.display = 'inline-flex'; notifBadge.textContent = data.count > 9 ? '9+' : data.count; }
          if (notifDot) notifDot.style.display = 'block';
        }
      })
      .catch(() => {});
  }

  // ========================
  // Mark notification as read
  // ========================
  document.querySelectorAll('[data-mark-read]').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id = this.dataset.markRead;
      try {
        await fetch(`/notifications/${id}/read`, { method: 'PUT', credentials: 'same-origin' });
        const item = this.closest('.notif-item');
        if (item) item.classList.remove('notif-item--unread');
        this.remove();
      } catch (e) {}
    });
  });

  // Mark all read
  const markAllReadBtn = document.getElementById('markAllRead');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
      try {
        await fetch('/notifications/read-all', { method: 'PUT', credentials: 'same-origin' });
        document.querySelectorAll('.notif-item--unread').forEach(el => el.classList.remove('notif-item--unread'));
        if (notifBadge) notifBadge.style.display = 'none';
        if (notifDot) notifDot.style.display = 'none';
        markAllReadBtn.style.display = 'none';
      } catch (e) {}
    });
  }

  // ========================
  // Delete notification
  // ========================
  document.querySelectorAll('[data-delete-notif]').forEach(btn => {
    btn.addEventListener('click', async function () {
      if (!confirm('Delete this notification?')) return;
      try {
        const res = await fetch(`/notifications/${this.dataset.deleteNotif}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) {
          const item = this.closest('.notif-item');
          if (item) { item.style.opacity = '0'; item.style.transform = 'translateX(30px)'; item.style.transition = 'all 0.3s'; setTimeout(() => item.remove(), 300); }
        }
      } catch (e) {}
    });
  });

  // ========================
  // Toast helper
  // ========================
  window.showToast = function (message, type = 'success') {
    const c = document.getElementById('flash-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `flash flash--${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span><button class="flash__close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => t.remove(), 400); }, 4500);
  };

  // ========================
  // Auto-dismiss flash
  // ========================
  setTimeout(() => {
    document.querySelectorAll('.flash').forEach(el => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    });
  }, 5000);

  // ========================
  // Risk bar scroll animation
  // ========================
  const riskObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        bar.style.width = bar.dataset.targetWidth || bar.style.width;
        riskObserver.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.risk-bar').forEach(bar => {
    const w = bar.style.width;
    bar.dataset.targetWidth = w;
    bar.style.width = '0';
    riskObserver.observe(bar);
  });

  // ========================
  // Confirm on dangerous actions
  // ========================
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', function (e) {
      if (!confirm(this.dataset.confirm || 'Are you sure?')) {
        e.preventDefault(); e.stopPropagation();
      }
    });
  });

  console.log('🏥 PostVisit ready');
})();
