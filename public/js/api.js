/**
 * GharKaam Centralized API Client & Utilities
 */

const API_BASE = '/api';

const api = {
  // Core request wrapper
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const defaultHeaders = {
      'Accept': 'application/json',
    };

    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
      credentials: 'include', // Automatically passes httpOnly cookie
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
          localStorage.removeItem('gk_user');
          const currentPath = window.location.pathname;
          if (
            currentPath.includes('dashboard') ||
            currentPath.includes('book') ||
            currentPath.includes('profile') ||
            currentPath.includes('admin')
          ) {
            window.location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
          }
        }

        const errorMsg = data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  },

  // HTTP Method Helpers
  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
    });
  },

  uploadPut(endpoint, formData) {
    return this.request(endpoint, {
      method: 'PUT',
      body: formData,
    });
  },

  // Auth Helpers
  async getMe() {
    try {
      const res = await this.get('/auth/me');
      if (res.success && res.data && res.data.user) {
        localStorage.setItem('gk_user', JSON.stringify(res.data.user));
        return res.data;
      }
      return null;
    } catch (e) {
      localStorage.removeItem('gk_user');
      return null;
    }
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem('gk_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (e) {
      // Continue cleanup
    }
    localStorage.removeItem('gk_user');
    window.location.href = '/login.html';
  },

  // UI Toast Notification helper
  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toastId = `toast-${Date.now()}`;
    const bgClass =
      type === 'success'
        ? 'bg-success text-white'
        : type === 'error' || type === 'danger'
        ? 'bg-danger text-white'
        : type === 'warning'
        ? 'bg-warning text-dark'
        : 'bg-primary text-white';

    const icon =
      type === 'success'
        ? 'bi-check-circle-fill'
        : type === 'error' || type === 'danger'
        ? 'bi-exclamation-triangle-fill'
        : type === 'warning'
        ? 'bi-exclamation-circle-fill'
        : 'bi-info-circle-fill';

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${bgClass} border-0 show shadow-lg`;
    toastEl.id = toastId;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon} fs-5"></i>
          <div>${this.escapeHTML(message)}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(toastEl);

    // Auto remove after 4 seconds
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    }, 4000);
  },

  // Utility formatters
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  },

  formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },

  formatDateTime(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  getInitials(name) {
    if (!name) return 'GK';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  },
};

window.api = api;
