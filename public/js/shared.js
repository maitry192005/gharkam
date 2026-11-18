/**
 * GharKaam Shared Layout & Navigation Manager
 */

// Immediate unregister & cache clearing
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await initTranslations();
  await renderNavbar();
  renderFooter();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('gk_theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', target);
  localStorage.setItem('gk_theme', target);

  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.className = target === 'dark' ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars-fill';
  }
}

// Translations / i18n
let currentLang = localStorage.getItem('gk_lang') || 'en';
let translationsData = null;

async function initTranslations() {
  try {
    const res = await fetch('/assets/data/translations.json');
    translationsData = await res.json();
    applyTranslations(currentLang);
  } catch (e) {
    console.warn('Could not load translations:', e.message);
  }
}

function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('gk_lang', lang);
  applyTranslations(lang);
  const langLabel = document.getElementById('current-lang-label');
  if (langLabel) {
    langLabel.textContent = lang === 'hi' ? 'हिन्दी' : lang === 'gu' ? 'ગુજરાતી' : 'English';
  }
}

function applyTranslations(lang) {
  if (!translationsData || !translationsData[lang]) return;
  const dict = translationsData[lang];

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

// Render Universal Navbar
async function renderNavbar() {
  const placeholder = document.getElementById('navbar-placeholder');
  if (!placeholder) return;

  const currentPath = window.location.pathname;
  let user = api.getCurrentUser();

  // Try to sync fresh user status if needed
  try {
    const sessionData = await api.getMe();
    if (sessionData && sessionData.user) {
      user = sessionData.user;
    }
  } catch (e) {
    user = null;
  }

  const isDark = (localStorage.getItem('gk_theme') || 'light') === 'dark';
  const themeIcon = isDark ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars-fill';

  let userSectionHtml = '';

  if (user) {
    const initials = api.getInitials(user.fullName);
    const avatarImg = user.avatar
      ? `<img src="${user.avatar}" alt="${api.escapeHTML(user.fullName)}" class="avatar-circle">`
      : `<div class="avatar-circle">${initials}</div>`;

    const dashboardLink =
      user.role === 'admin'
        ? '/admin/index.html'
        : user.role === 'helper'
        ? '/helper-dashboard.html'
        : '/customer-dashboard.html';

    const bookingsLink =
      user.role === 'helper' ? '/helper-requests.html' : '/my-bookings.html';

    const profileLink =
      user.role === 'helper' ? '/helper-profile-edit.html' : '/customer-profile.html';

    userSectionHtml = `
      <!-- Notification Dropdown -->
      <div class="dropdown me-2">
        <button class="btn btn-light rounded-circle position-relative" type="button" id="notifDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="width: 40px; height: 40px;">
          <i class="bi bi-bell-fill fs-6 text-secondary"></i>
          <span id="nav-notif-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.65rem;">
            0
          </span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg py-2" aria-labelledby="notifDropdown" style="width: 300px; max-height: 380px; overflow-y: auto;" id="nav-notif-list">
          <li class="dropdown-header d-flex justify-content-between align-items-center">
            <span class="fw-bold">Notifications</span>
            <a href="/notifications.html" class="text-primary text-decoration-none small">View All</a>
          </li>
          <li><hr class="dropdown-divider my-1"></li>
          <li class="px-3 py-2 text-muted small text-center" id="nav-notif-empty">No unread notifications</li>
        </ul>
      </div>

      <!-- User Account Dropdown -->
      <div class="dropdown">
        <button class="btn p-0 d-flex align-items-center gap-2 border-0 bg-transparent" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
          ${avatarImg}
          <span class="fw-semibold d-none d-md-inline-block text-truncate" style="max-width: 120px;">
            ${api.escapeHTML(user.fullName)}
          </span>
          <i class="bi bi-chevron-down small text-muted"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg" aria-labelledby="userMenuButton">
          <li class="px-3 py-2 border-bottom">
            <div class="fw-bold">${api.escapeHTML(user.fullName)}</div>
            <div class="text-muted small">@${api.escapeHTML(user.username)} &bull; <span class="badge bg-secondary text-uppercase">${user.role}</span></div>
            ${user.role === 'customer' ? `<div class="text-success small fw-semibold mt-1"><i class="bi bi-wallet2 me-1"></i>Wallet: ₹${user.walletBalance || 0}</div>` : ''}
          </li>
          <li><a class="dropdown-item py-2" href="${dashboardLink}"><i class="bi bi-speedometer2 me-2 text-primary"></i>Dashboard</a></li>
          ${user.role === 'customer' ? `<li><a class="dropdown-item py-2" href="/book.html"><i class="bi bi-calendar-plus me-2 text-success"></i>Book a Helper</a></li>` : ''}
          <li><a class="dropdown-item py-2" href="${bookingsLink}"><i class="bi bi-calendar-check me-2 text-info"></i>Bookings & Requests</a></li>
          ${user.role === 'customer' ? `<li><a class="dropdown-item py-2" href="/saved-helpers.html"><i class="bi bi-heart-fill me-2 text-danger"></i>Saved Helpers</a></li>` : ''}
          <li><a class="dropdown-item py-2" href="${profileLink}"><i class="bi bi-person-gear me-2 text-secondary"></i>Account Settings</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item py-2 text-danger" onclick="api.logout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>
        </ul>
      </div>
    `;

    // Load unread count
    loadNavbarNotifications();
  } else {
    userSectionHtml = `
      <div class="d-flex align-items-center gap-2">
        <a href="/login.html" class="btn btn-outline-secondary px-3 py-1 btn-sm">Login</a>
        <a href="/register.html" class="btn btn-brand-primary px-3 py-1 btn-sm">Sign Up</a>
      </div>
    `;
  }

  placeholder.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-gharkaam">
      <div class="container">
        <!-- Logo -->
        <a class="navbar-brand d-flex align-items-center gap-2" href="/index.html">
          <img src="/assets/images/Gharkaam Logo.png" alt="GharKaam Logo" class="navbar-brand-img">
        </a>

        <!-- Mobile Toggler -->
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#gharkaamNavContent" aria-controls="gharkaamNavContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Navbar Links -->
        <div class="collapse navbar-collapse" id="gharkaamNavContent">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0 gap-1">
            <li class="nav-item">
              <a class="nav-link ${currentPath.endsWith('index.html') || currentPath === '/' ? 'active' : ''}" href="/index.html" data-i18n="home">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('services') ? 'active' : ''}" href="/services.html" data-i18n="services">Services</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('helpers.html') ? 'active' : ''}" href="/helpers.html" data-i18n="helpers">Find Helpers</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('pricing') ? 'active' : ''}" href="/pricing.html" data-i18n="pricing">Pricing</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('about') ? 'active' : ''}" href="/about.html" data-i18n="about">About Us</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('faq') ? 'active' : ''}" href="/faq.html" data-i18n="faq">FAQ</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${currentPath.includes('contact') ? 'active' : ''}" href="/contact.html" data-i18n="contact">Contact</a>
            </li>
          </ul>

          <!-- Actions: Language, Dark Mode, User Account -->
          <div class="d-flex align-items-center gap-2 mt-3 mt-lg-0">
            <!-- Language Dropdown -->
            <div class="dropdown">
              <button class="btn btn-sm btn-light border dropdown-toggle d-flex align-items-center gap-1" type="button" id="langDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-translate text-secondary"></i>
                <span id="current-lang-label">${currentLang === 'hi' ? 'हिन्दी' : currentLang === 'gu' ? 'ગુજરાતી' : 'English'}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="langDropdown">
                <li><button class="dropdown-item ${currentLang === 'en' ? 'active' : ''}" onclick="switchLanguage('en')">English</button></li>
                <li><button class="dropdown-item ${currentLang === 'hi' ? 'active' : ''}" onclick="switchLanguage('hi')">हिन्दी (Hindi)</button></li>
                <li><button class="dropdown-item ${currentLang === 'gu' ? 'active' : ''}" onclick="switchLanguage('gu')">ગુજરાતી (Gujarati)</button></li>
              </ul>
            </div>

            <!-- Dark Mode Toggle -->
            <button class="btn btn-sm btn-light border rounded-circle" type="button" onclick="toggleTheme()" title="Toggle Dark/Light Mode" style="width: 36px; height: 36px;">
              <i id="theme-toggle-icon" class="${themeIcon}"></i>
            </button>

            <!-- User Auth Profile Section -->
            ${userSectionHtml}
          </div>
        </div>
      </div>
    </nav>
  `;
}

// Load unread notifications for navbar bell
async function loadNavbarNotifications() {
  try {
    const res = await api.get('/notifications');
    if (res.success) {
      const badge = document.getElementById('nav-notif-badge');
      const list = document.getElementById('nav-notif-list');
      const emptyLi = document.getElementById('nav-notif-empty');

      if (badge && res.unreadCount > 0) {
        badge.textContent = res.unreadCount > 9 ? '9+' : res.unreadCount;
        badge.classList.remove('d-none');
      }

      if (list && res.data && res.data.length > 0) {
        if (emptyLi) emptyLi.remove();
        const itemsHtml = res.data.slice(0, 5).map(n => `
          <li>
            <a class="dropdown-item py-2 px-3 ${n.read ? '' : 'bg-light'} border-bottom text-wrap" href="${n.link || '/notifications.html'}">
              <div class="fw-semibold small text-truncate">${api.escapeHTML(n.title)}</div>
              <div class="text-muted small" style="font-size: 0.8rem;">${api.escapeHTML(n.message)}</div>
            </a>
          </li>
        `).join('');

        list.insertAdjacentHTML('beforeend', itemsHtml);
      }
    }
  } catch (e) {
    // Non-blocking
  }
}

// Render Universal Footer
function renderFooter() {
  const placeholder = document.getElementById('footer-placeholder');
  if (!placeholder) return;

  placeholder.innerHTML = `
    <footer class="footer-gharkaam">
      <div class="container">
        <div class="row g-4 mb-4">
          <!-- Col 1: Brand & Mission -->
          <div class="col-lg-4 col-md-6">
            <div class="d-flex align-items-center gap-2 mb-3">
              <span class="fs-4 fw-bold text-white">GharKaam</span>
            </div>
            <p class="text-light-50 small mb-3">
              India's trusted marketplace connecting responsible households with verified domestic cooks, cleaners, utensil maids, plumbers, and electricians. Safety, dignity, and transparent pricing at your doorstep.
            </p>
            <div class="d-flex gap-3 fs-5">
              <a href="#" class="text-light"><i class="bi bi-facebook"></i></a>
              <a href="#" class="text-light"><i class="bi bi-instagram"></i></a>
              <a href="#" class="text-light"><i class="bi bi-twitter-x"></i></a>
              <a href="#" class="text-light"><i class="bi bi-linkedin"></i></a>
            </div>
          </div>

          <!-- Col 2: Services -->
          <div class="col-lg-2 col-md-3 col-6">
            <h6 class="text-white text-uppercase fw-bold mb-3 small">Services</h6>
            <ul class="list-unstyled small d-flex flex-column gap-2 mb-0">
              <li><a href="/service-detail.html?slug=cooking">Cooking</a></li>
              <li><a href="/service-detail.html?slug=cleaning">House Cleaning</a></li>
              <li><a href="/service-detail.html?slug=utensil-cleaning">Utensil Washing</a></li>
              <li><a href="/service-detail.html?slug=laundry">Laundry & Ironing</a></li>
              <li><a href="/service-detail.html?slug=electrician">Electrician</a></li>
              <li><a href="/service-detail.html?slug=plumber">Plumber</a></li>
            </ul>
          </div>

          <!-- Col 3: Quick Links -->
          <div class="col-lg-2 col-md-3 col-6">
            <h6 class="text-white text-uppercase fw-bold mb-3 small">Explore</h6>
            <ul class="list-unstyled small d-flex flex-column gap-2 mb-0">
              <li><a href="/helpers.html">Find Helpers</a></li>
              <li><a href="/pricing.html">Transparent Rates</a></li>
              <li><a href="/about.html">About GharKaam</a></li>
              <li><a href="/faq.html">Help & FAQs</a></li>
              <li><a href="/contact.html">Contact Support</a></li>
              <li><a href="/admin/index.html">Admin Portal</a></li>
            </ul>
          </div>

          <!-- Col 4: Trust, Safety & App -->
          <div class="col-lg-4 col-md-6">
            <h6 class="text-white text-uppercase fw-bold mb-3 small">Trust & Security</h6>
            <div class="p-3 rounded mb-3" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
              <div class="d-flex align-items-center gap-2 mb-2 text-warning">
                <i class="bi bi-shield-check fs-5"></i>
                <span class="fw-bold small text-white">100% ID Verified Professionals</span>
              </div>
              <p class="small text-light-50 mb-0" style="font-size: 0.8rem;">
                Every helper undergoes government Aadhaar/Voter ID verification, address confirmation, and reference screening before profile activation.
              </p>
            </div>
            <div class="small text-muted">
              <span>Customer Care: +91 98765 43210</span><br>
              <span>Email: support@gharkaam.com</span>
            </div>
          </div>
        </div>

        <hr class="border-secondary my-4">

        <div class="row align-items-center small text-light-50">
          <div class="col-md-6 text-center text-md-start mb-2 mb-md-0" data-i18n="copyright">
            © 2026 GharKaam Services Pvt Ltd. All rights reserved.
          </div>
          <div class="col-md-6 text-center text-md-end">
            <a href="/terms.html" class="me-3">Terms of Service</a>
            <a href="/privacy.html" class="me-3">Privacy Policy</a>
            <a href="/sitemap.xml">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

// Clear stale Service Worker caches to guarantee fresh CSS on all page navigations
function clearStaleServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let reg of registrations) {
        reg.unregister();
      }
    });
  }
  if (window.caches) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}
