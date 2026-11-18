/**
 * Helper Schedule Calendar Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkHelperScheduleAccess();
  if (user) {
    setupSidebar(user);
    await loadScheduleData();
  }
});

async function checkHelperScheduleAccess() {
  try {
    const session = await api.getMe();
    if (!session || !session.user || session.user.role !== 'helper') {
      window.location.href = '/login.html?redirect=helper-schedule.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=helper-schedule.html';
    return null;
  }
}

function setupSidebar(user) {
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

async function loadScheduleData() {
  const container = document.getElementById('scheduleTimelineContainer');
  if (!container) return;

  try {
    const res = await api.get('/helpers/schedule');
    if (!res.success || !res.data || !res.data.length) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-calendar-check fs-1 text-muted"></i>
          <h5 class="fw-bold mt-3">No Upcoming Confirmed Jobs</h5>
          <p class="text-muted small">You have no accepted jobs on your schedule right now. Check "Requests & Jobs" to accept pending work.</p>
          <a href="/helper-requests.html" class="btn btn-sm btn-brand-primary">View Pending Requests</a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    res.data.forEach((b) => {
      const cust = b.customer || {};
      const services = (b.services || []).map((s) => s.service?.name || 'Service').join(', ');

      const item = `
        <div class="p-3 border rounded mb-3 bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge bg-success">${b.status.toUpperCase()}</span>
              <strong class="fs-6">${api.formatDate(b.workFrom)} - ${api.formatDate(b.workTo)} (${b.totalDays} days)</strong>
            </div>
            <div class="fw-bold fs-6 text-dark">${api.escapeHTML(cust.fullName || 'Customer')} &bull; <span class="text-muted small">${api.escapeHTML(services)}</span></div>
            <div class="text-muted small">
              <i class="bi bi-clock me-1"></i>${api.escapeHTML(b.preferredTime || 'Morning')} &bull;
              <i class="bi bi-geo-alt me-1 text-danger"></i>${api.escapeHTML(b.address?.addressLine || '')}, ${api.escapeHTML(b.address?.district || '')}
            </div>
            <div class="text-muted small"><i class="bi bi-telephone me-1 text-success"></i>Phone: ${cust.phone || 'N/A'}</div>
          </div>
          <div class="text-md-end">
            <div class="fw-bold text-success fs-5 mb-1">₹${b.pricing?.totalAmount || 0}</div>
            <a href="/booking-detail.html?id=${b._id}" class="btn btn-sm btn-brand-primary">
              Job Details & Chat
            </a>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', item);
    });
  } catch (err) {
    container.innerHTML = `<div class="text-center py-5 text-danger">${err.message}</div>`;
  }
}
