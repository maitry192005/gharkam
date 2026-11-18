/**
 * Helper Dashboard Controller
 */

let activeHelper = null;

document.addEventListener('DOMContentLoaded', async () => {
  activeHelper = await checkHelperAuth();
  if (activeHelper) {
    setupHelperGreeting(activeHelper);
    await loadHelperDashboardStats();
    setupAvailabilityToggle();
    setupFeedbackForm();
  }
});

async function checkHelperAuth() {
  try {
    const session = await api.getMe();
    if (!session || !session.user) {
      window.location.href = '/login.html?redirect=helper-dashboard.html';
      return null;
    }
    const user = session.user;
    if (user.role !== 'helper') {
      window.location.href = '/customer-dashboard.html';
      return null;
    }
    if (user.status === 'pending') {
      window.location.href = '/helper-waiting.html';
      return null;
    }
    return user;
  } catch (e) {
    window.location.href = '/login.html?redirect=helper-dashboard.html';
    return null;
  }
}

function setupHelperGreeting(user) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 18
      ? 'Good afternoon'
      : 'Good evening';

  const greetingEl = document.getElementById('helperGreeting');
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, ${user.fullName.split(' ')[0]} 👋`;
  }

  const sideNameEl = document.getElementById('helperSideName');
  if (sideNameEl) sideNameEl.textContent = user.fullName;

  const sideAvatar = document.getElementById('helperSideAvatarContainer');
  if (sideAvatar) {
    const initials = api.getInitials(user.fullName);
    sideAvatar.innerHTML = user.avatar
      ? `<img src="${user.avatar}" class="avatar-circle" alt="${api.escapeHTML(user.fullName)}">`
      : `<div class="avatar-circle">${initials}</div>`;
  }
}

async function loadHelperDashboardStats() {
  try {
    const res = await api.get('/helpers/dashboard');
    if (!res.success || !res.data) return;

    const d = res.data;
    document.getElementById('metricPending').textContent = d.pendingRequests || 0;
    document.getElementById('metricActive').textContent = d.activeJobs || 0;
    document.getElementById('metricEarnings').textContent = `₹${d.totalEarnings || 0}`;
    document.getElementById('metricRating').textContent = `${(d.ratingAvg || 5.0).toFixed(1)} ★`;

    const badgeText = document.getElementById('metricBadgeText');
    if (badgeText) {
      badgeText.textContent = d.verified ? 'Verified ID Partner' : 'Pending Verification';
    }

    // Availability switch state
    const toggle = document.getElementById('availabilityToggle');
    const label = document.getElementById('availabilityLabel');
    if (toggle && label) {
      toggle.checked = !!d.isAvailable;
      label.textContent = d.isAvailable ? 'Available for Work' : 'Busy / Away';
    }

    // Pending Alert Banner
    const banner = document.getElementById('pendingActionBanner');
    if (banner) {
      if (d.pendingRequests > 0) banner.classList.remove('d-none');
      else banner.classList.add('d-none');
    }

    // Recent Jobs
    const tbody = document.getElementById('helperRecentJobsTbody');
    if (!tbody) return;

    if (!d.recentBookings || !d.recentBookings.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted small">No booking requests received yet. Ensure your availability is turned on!</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    d.recentBookings.forEach((b) => {
      const cust = b.customer || {};
      const services = (b.services || []).map((s) => s.service?.name || 'Service').join(', ');
      const badge = `<span class="badge-status badge-${b.status}">${b.status}</span>`;

      const tr = `
        <tr>
          <td class="fw-bold small">#${b.bookingNumber}</td>
          <td>${api.escapeHTML(cust.fullName || 'Customer')}</td>
          <td>${api.escapeHTML(services)}</td>
          <td class="small">${api.formatDate(b.workFrom)} (${b.totalDays}d)</td>
          <td>${badge}</td>
          <td class="fw-bold text-success">₹${b.pricing?.totalAmount || 0}</td>
          <td class="text-end">
            <a href="/booking-detail.html?id=${b._id}" class="btn btn-sm btn-outline-secondary">
              View
            </a>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', tr);
    });
  } catch (err) {
    console.error('Failed to load helper dashboard:', err);
  }
}

function setupAvailabilityToggle() {
  const toggle = document.getElementById('availabilityToggle');
  const label = document.getElementById('availabilityLabel');
  if (!toggle) return;

  toggle.addEventListener('change', async () => {
    try {
      const res = await api.put('/helpers/availability', { isAvailable: toggle.checked });
      if (res.success) {
        label.textContent = res.isAvailable ? 'Available for Work' : 'Busy / Away';
        api.showToast(res.message, 'success');
      }
    } catch (err) {
      toggle.checked = !toggle.checked;
      api.showToast(err.message, 'error');
    }
  });
}

function setupFeedbackForm() {
  const form = document.getElementById('helperFeedbackForm');
  const btn = document.getElementById('fbSubmitBtn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('fbCategory')?.value;
    const feedback = document.getElementById('fbComment')?.value.trim();

    if (!feedback) return;
    btn.disabled = true;

    try {
      const res = await api.post('/contact/feedback', { category, feedback });
      if (res.success) {
        api.showToast(res.message, 'success');
        form.reset();
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}
