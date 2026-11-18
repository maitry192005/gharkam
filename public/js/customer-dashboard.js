/**
 * Customer Dashboard Dynamic Operations
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkCustomerAuth();
  if (user) {
    setCustomerGreeting(user);
    await loadCustomerDashboardData();
  }
});

async function checkCustomerAuth() {
  try {
    const session = await api.getMe();
    if (!session || !session.user) {
      window.location.href = '/login.html?redirect=customer-dashboard.html';
      return null;
    }
    const user = session.user;
    if (user.role === 'helper') {
      window.location.href = '/helper-dashboard.html';
      return null;
    }
    return user;
  } catch (e) {
    window.location.href = '/login.html?redirect=customer-dashboard.html';
    return null;
  }
}

function setCustomerGreeting(user) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 18
      ? 'Good afternoon'
      : 'Good evening';

  const greetingEl = document.getElementById('dashGreeting');
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, ${user.fullName.split(' ')[0]} 👋`;
  }

  const sideNameEl = document.getElementById('sideUserName');
  if (sideNameEl) sideNameEl.textContent = user.fullName;

  const sideAvatar = document.getElementById('sideAvatarContainer');
  if (sideAvatar) {
    const initials = api.getInitials(user.fullName);
    sideAvatar.innerHTML = user.avatar
      ? `<img src="${user.avatar}" class="avatar-circle" alt="${api.escapeHTML(user.fullName)}">`
      : `<div class="avatar-circle">${initials}</div>`;
  }

  const walletEl = document.getElementById('dashWalletBalance');
  if (walletEl) walletEl.textContent = `₹${user.walletBalance || 0}`;
}

async function loadCustomerDashboardData() {
  try {
    const res = await api.get('/bookings/customer');
    if (!res.success || !res.data) return;

    const bookings = res.data;

    const activeCount = bookings.filter((b) => ['accepted', 'in-progress'].includes(b.status)).length;
    const completedCount = bookings.filter((b) => b.status === 'completed').length;
    const totalSpent = bookings
      .filter((b) => b.status === 'completed' && b.pricing)
      .reduce((sum, b) => sum + (b.pricing.totalAmount || 0), 0);

    const elActive = document.getElementById('dashActiveCount');
    const elCompleted = document.getElementById('dashCompletedCount');
    const elSpent = document.getElementById('dashTotalSpent');

    if (elActive) elActive.textContent = activeCount;
    if (elCompleted) elCompleted.textContent = completedCount;
    if (elSpent) elSpent.textContent = `₹${totalSpent}`;

    // Upcoming Booking
    const upcoming = bookings.find((b) => ['pending', 'accepted', 'in-progress'].includes(b.status));
    const upcomingCard = document.getElementById('upcomingBookingCard');

    if (upcoming && upcomingCard) {
      const helperUser = upcoming.helper || {};
      const initials = api.getInitials(helperUser.fullName);
      const helperAvatar = helperUser.avatar
        ? `<img src="${helperUser.avatar}" class="avatar-circle" alt="${api.escapeHTML(helperUser.fullName)}">`
        : `<div class="avatar-circle">${initials}</div>`;

      const statusBadge = `<span class="badge-status badge-${upcoming.status}"><i class="bi bi-circle-fill" style="font-size: 0.45rem;"></i> ${upcoming.status}</span>`;

      upcomingCard.innerHTML = `
        <div class="row align-items-center g-3">
          <div class="col-md-5 d-flex align-items-center gap-3">
            ${helperAvatar}
            <div>
              <div class="fw-bold">${api.escapeHTML(helperUser.fullName || 'Helper')}</div>
              <div class="text-muted small"><i class="bi bi-telephone me-1"></i>${helperUser.phone || 'Available in booking'}</div>
              <div class="mt-1">${statusBadge}</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="small fw-semibold text-muted">Schedule & Time:</div>
            <div class="small fw-bold">${api.formatDate(upcoming.workFrom)} to ${api.formatDate(upcoming.workTo)} (${upcoming.totalDays} days)</div>
            <div class="small text-muted"><i class="bi bi-clock me-1"></i>${api.escapeHTML(upcoming.preferredTime || 'Morning')}</div>
          </div>
          <div class="col-md-3 text-md-end">
            <div class="fw-bold text-success mb-2">₹${upcoming.pricing?.totalAmount || 0}</div>
            <a href="/booking-detail.html?id=${upcoming._id}" class="btn btn-sm btn-brand-primary w-100 w-md-auto">
              View & Chat
            </a>
          </div>
        </div>
      `;
    } else if (upcomingCard) {
      upcomingCard.innerHTML = `
        <div class="text-center py-4">
          <p class="text-muted small mb-3">You have no active or upcoming bookings scheduled right now.</p>
          <a href="/book.html" class="btn btn-sm btn-brand-primary">Schedule New Domestic Help</a>
        </div>
      `;
    }

    // Recent Bookings Table
    const tbody = document.getElementById('recentBookingsTbody');
    if (!tbody) return;

    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted small">No bookings placed yet. Ready to hire? Click "New Booking".</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    bookings.slice(0, 5).forEach((b) => {
      const helperName = b.helper?.fullName || 'Helper';
      const servicesList = (b.services || [])
        .map((s) => `<span class="badge bg-light text-dark border me-1">${api.escapeHTML(s.service?.name || 'Service')}</span>`)
        .join('');

      const badge = `<span class="badge-status badge-${b.status}">${b.status}</span>`;

      const tr = `
        <tr>
          <td class="fw-bold small">#${b.bookingNumber}</td>
          <td>${api.escapeHTML(helperName)}</td>
          <td>${servicesList || 'Domestic help'}</td>
          <td class="small">${api.formatDate(b.workFrom)}</td>
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
    console.error('Failed to load dashboard data:', err);
  }
}
