/**
 * Helper Requests & Job Status Actions
 */

let allHelperBookings = [];
let activeHelperTab = 'pending';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkHelperAccess();
  if (user) {
    setupSidebarUser(user);
    await loadHelperRequests();
    setupTabEvents();
  }
});

async function checkHelperAccess() {
  try {
    const session = await api.getMe();
    if (!session || !session.user || session.user.role !== 'helper') {
      window.location.href = '/login.html?redirect=helper-requests.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=helper-requests.html';
    return null;
  }
}

function setupSidebarUser(user) {
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

async function loadHelperRequests() {
  const container = document.getElementById('helperRequestsContainer');
  if (!container) return;

  try {
    const res = await api.get('/bookings/helper');
    if (res.success && res.data) {
      allHelperBookings = res.data;
      renderHelperBookings();
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load requests: ${err.message}</div>`;
  }
}

function renderHelperBookings() {
  const container = document.getElementById('helperRequestsContainer');
  if (!container) return;

  const filtered = allHelperBookings.filter((b) => {
    if (activeHelperTab === 'declined') return ['declined', 'cancelled', 'expired'].includes(b.status);
    return b.status === activeHelperTab;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-inbox fs-1 text-muted"></i>
        <h5 class="fw-bold mt-3">No ${activeHelperTab} requests</h5>
        <p class="text-muted small">You currently have no jobs under this status tab.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach((b) => {
    const cust = b.customer || {};
    const initials = api.getInitials(cust.fullName);
    const custAvatar = cust.avatar
      ? `<img src="${cust.avatar}" class="avatar-circle" alt="${api.escapeHTML(cust.fullName)}">`
      : `<div class="avatar-circle">${initials}</div>`;

    const servicesList = (b.services || [])
      .map((s) => `<span class="badge bg-light text-dark border me-1">${api.escapeHTML(s.service?.name || 'Service')}</span>`)
      .join('');

    const statusBadge = `<span class="badge-status badge-${b.status}">${b.status}</span>`;

    let actionButtons = '';
    if (b.status === 'pending') {
      actionButtons = `
        <button class="btn btn-sm btn-success fw-bold" onclick="respondRequest('${b._id}', 'accept')">
          <i class="bi bi-check2"></i> Accept
        </button>
        <button class="btn btn-sm btn-outline-danger fw-bold" onclick="respondRequest('${b._id}', 'decline')">
          <i class="bi bi-x"></i> Decline
        </button>
      `;
    } else if (b.status === 'accepted') {
      actionButtons = `
        <button class="btn btn-sm btn-primary fw-bold" onclick="changeStatus('${b._id}', 'in-progress')">
          <i class="bi bi-play-fill"></i> Start Work
        </button>
      `;
    } else if (b.status === 'in-progress') {
      actionButtons = `
        <button class="btn btn-sm btn-success fw-bold" onclick="changeStatus('${b._id}', 'completed')">
          <i class="bi bi-check-all"></i> Mark Completed
        </button>
      `;
    }

    const card = `
      <div class="col-md-6 col-xl-4">
        <div class="gk-card p-4 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small fw-bold text-muted">#${b.bookingNumber}</span>
              ${statusBadge}
            </div>

            <div class="d-flex align-items-center gap-3 mb-3">
              ${custAvatar}
              <div>
                <h6 class="fw-bold mb-0">${api.escapeHTML(cust.fullName || 'Customer')}</h6>
                <div class="text-muted small"><i class="bi bi-telephone me-1 text-success"></i>${cust.phone || 'Contact provided'}</div>
              </div>
            </div>

            <div class="mb-3">
              <div class="small fw-semibold text-muted mb-1">Services:</div>
              <div>${servicesList}</div>
            </div>

            <div class="p-2 bg-light rounded small text-muted mb-3">
              <div><i class="bi bi-calendar-event me-1"></i><strong>Dates:</strong> ${api.formatDate(b.workFrom)} - ${api.formatDate(b.workTo)} (${b.totalDays}d)</div>
              <div><i class="bi bi-clock me-1"></i><strong>Time:</strong> ${api.escapeHTML(b.preferredTime || 'Morning')}</div>
              <div><i class="bi bi-geo-alt me-1"></i><strong>Address:</strong> ${api.escapeHTML(b.address?.addressLine || '')}, ${api.escapeHTML(b.address?.district || '')}</div>
            </div>
          </div>

          <div class="pt-3 border-top">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Your Earnings:</span>
              <span class="fw-bold text-success fs-5">₹${b.pricing?.totalAmount || 0}</span>
            </div>

            <div class="d-flex gap-2">
              <a href="/booking-detail.html?id=${b._id}" class="btn btn-sm btn-outline-secondary flex-grow-1">
                Details & Chat
              </a>
              ${actionButtons}
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

function setupTabEvents() {
  const tabs = document.querySelectorAll('#helperStatusTabs button');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeHelperTab = tab.getAttribute('data-status') || 'pending';
      renderHelperBookings();
    });
  });
}

window.respondRequest = async function (bookingId, action) {
  const comment = prompt(`Enter optional comment for customer on ${action}:`) || '';
  try {
    const res = await api.put(`/bookings/${bookingId}/respond`, { action, comment });
    if (res.success) {
      api.showToast(`Booking ${action}ed!`, 'success');
      await loadHelperRequests();
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};

window.changeStatus = async function (bookingId, status) {
  try {
    const res = await api.put(`/bookings/${bookingId}/status`, { status });
    if (res.success) {
      api.showToast(`Status updated to ${status}!`, 'success');
      await loadHelperRequests();
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};
