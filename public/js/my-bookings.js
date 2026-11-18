/**
 * Customer Bookings List & Filter Management
 */

let allCustomerBookings = [];
let currentFilter = 'all';
let selectedCancelBookingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkCustomerAccess();
  if (user) {
    setupSidebarUser(user);
    await loadBookings();
    setupStatusTabs();
    setupCancelModal();
  }
});

async function checkCustomerAccess() {
  try {
    const session = await api.getMe();
    if (!session || !session.user) {
      window.location.href = '/login.html?redirect=my-bookings.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=my-bookings.html';
    return null;
  }
}

function setupSidebarUser(user) {
  const sideNameEl = document.getElementById('sideUserName');
  if (sideNameEl) sideNameEl.textContent = user.fullName;

  const sideAvatar = document.getElementById('sideAvatarContainer');
  if (sideAvatar) {
    const initials = api.getInitials(user.fullName);
    sideAvatar.innerHTML = user.avatar
      ? `<img src="${user.avatar}" class="avatar-circle" alt="${api.escapeHTML(user.fullName)}">`
      : `<div class="avatar-circle">${initials}</div>`;
  }
}

async function loadBookings() {
  const container = document.getElementById('bookingsListContainer');
  if (!container) return;

  try {
    const res = await api.get('/bookings/customer');
    if (res.success && res.data) {
      allCustomerBookings = res.data;
      renderFilteredBookings();
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load bookings: ${err.message}</div>`;
  }
}

function renderFilteredBookings() {
  const container = document.getElementById('bookingsListContainer');
  if (!container) return;

  const filtered = allCustomerBookings.filter((b) => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'cancelled') return ['cancelled', 'declined', 'expired'].includes(b.status);
    return b.status === currentFilter;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-calendar-x fs-1 text-muted"></i>
        <h5 class="fw-bold mt-3">No bookings found</h5>
        <p class="text-muted small">You don't have any ${currentFilter !== 'all' ? currentFilter : ''} bookings currently.</p>
        <a href="/book.html" class="btn btn-sm btn-brand-primary">Schedule New Help</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach((b) => {
    const helperUser = b.helper || {};
    const initials = api.getInitials(helperUser.fullName);
    const helperAvatar = helperUser.avatar
      ? `<img src="${helperUser.avatar}" class="avatar-circle" alt="${api.escapeHTML(helperUser.fullName)}">`
      : `<div class="avatar-circle">${initials}</div>`;

    const statusBadge = `<span class="badge-status badge-${b.status}">${b.status}</span>`;

    const servicesList = (b.services || [])
      .map(
        (s) =>
          `<span class="badge bg-light text-dark border me-1">${api.escapeHTML(
            s.service?.name || 'Service'
          )}</span>`
      )
      .join('');

    const canCancel = ['pending', 'accepted'].includes(b.status);

    const card = `
      <div class="col-md-6 col-xl-4">
        <div class="gk-card p-4 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small fw-bold text-muted">#${b.bookingNumber}</span>
              ${statusBadge}
            </div>

            <div class="d-flex align-items-center gap-3 mb-3">
              ${helperAvatar}
              <div>
                <h6 class="fw-bold mb-0">${api.escapeHTML(helperUser.fullName || 'Helper')}</h6>
                <div class="text-muted small"><i class="bi bi-geo-alt me-1"></i>${api.escapeHTML(b.address?.district || 'Local')}</div>
              </div>
            </div>

            <div class="mb-3">
              <div class="small fw-semibold text-muted mb-1">Services:</div>
              <div>${servicesList || 'Domestic services'}</div>
            </div>

            <div class="p-2 bg-light rounded-2 small text-muted mb-3">
              <div><i class="bi bi-calendar-event me-1"></i><strong>Dates:</strong> ${api.formatDate(b.workFrom)} - ${api.formatDate(b.workTo)} (${b.totalDays} days)</div>
              <div><i class="bi bi-clock me-1"></i><strong>Time:</strong> ${api.escapeHTML(b.preferredTime || 'Morning')}</div>
            </div>
          </div>

          <div class="pt-3 border-top">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Amount:</span>
              <span class="fw-bold text-success fs-5">₹${b.pricing?.totalAmount || 0}</span>
            </div>

            <div class="d-flex gap-2">
              <a href="/booking-detail.html?id=${b._id}" class="btn btn-sm btn-brand-primary flex-grow-1">
                View & Chat
              </a>
              ${
                canCancel
                  ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="openCancelModal('${b._id}')">Cancel</button>`
                  : ''
              }
              ${
                b.status === 'completed' && !b.hasReview
                  ? `<a href="/booking-detail.html?id=${b._id}#review" class="btn btn-sm btn-outline-warning">Review</a>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

function setupStatusTabs() {
  const tabs = document.querySelectorAll('#bookingStatusTabs button');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active', 'btn-brand-primary'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-status') || 'all';
      renderFilteredBookings();
    });
  });
}

window.openCancelModal = function (bookingId) {
  selectedCancelBookingId = bookingId;
  const modal = new bootstrap.Modal(document.getElementById('cancelBookingModal'));
  modal.show();
};

function setupCancelModal() {
  const confirmBtn = document.getElementById('confirmCancelBtn');
  if (!confirmBtn) return;

  confirmBtn.addEventListener('click', async () => {
    if (!selectedCancelBookingId) return;
    const reason = document.getElementById('cancelReasonInput')?.value || 'Customer cancelled';

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Cancelling...';

    try {
      const res = await api.put(`/bookings/${selectedCancelBookingId}/cancel`, { reason });
      if (res.success) {
        api.showToast('Booking cancelled successfully.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('cancelBookingModal'))?.hide();
        await loadBookings();
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Cancellation';
    }
  });
}
