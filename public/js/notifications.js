/**
 * Notifications Page Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadNotificationsPage();
  setupMarkAllRead();
});

async function loadNotificationsPage() {
  const container = document.getElementById('notificationsListCard');
  if (!container) return;

  try {
    const res = await api.get('/notifications');
    if (!res.success || !res.data || !res.data.length) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-bell-slash fs-1 text-muted"></i>
          <h5 class="fw-bold mt-3">No Notifications</h5>
          <p class="text-muted small">You're all caught up! Booking updates will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    res.data.forEach((n) => {
      const icon =
        n.type === 'booking'
          ? 'bi-calendar-event text-primary'
          : n.type === 'payment'
          ? 'bi-cash-coin text-success'
          : n.type === 'review'
          ? 'bi-star-fill text-warning'
          : 'bi-info-circle text-info';

      const itemHtml = `
        <div class="p-3 border-bottom d-flex align-items-start gap-3 ${n.read ? 'bg-white' : 'bg-light'} rounded mb-1 position-relative">
          <div class="rounded-circle p-2 bg-white border fs-5">
            <i class="bi ${icon}"></i>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="fw-bold mb-0 ${n.read ? 'text-dark' : 'text-success'}">${api.escapeHTML(n.title)}</h6>
              <span class="text-muted small" style="font-size: 0.75rem;">${api.formatDateTime(n.createdAt)}</span>
            </div>
            <p class="text-muted small mb-2">${api.escapeHTML(n.message)}</p>
            ${
              n.link
                ? `<a href="${n.link}" class="btn btn-sm btn-outline-secondary py-0 px-2 small" onclick="markOneRead('${n._id}')">View Details</a>`
                : ''
            }
          </div>
          ${!n.read ? '<span class="badge bg-success rounded-pill" style="font-size: 0.6rem;">New</span>' : ''}
        </div>
      `;
      container.insertAdjacentHTML('beforeend', itemHtml);
    });
  } catch (err) {
    container.innerHTML = `<div class="text-center py-5 text-danger">${err.message}</div>`;
  }
}

window.markOneRead = async function (id) {
  try {
    await api.put(`/notifications/${id}/read`);
  } catch (e) {
    // Non-blocking
  }
};

function setupMarkAllRead() {
  const btn = document.getElementById('markAllReadBtn');
  btn?.addEventListener('click', async () => {
    try {
      const res = await api.put('/notifications/all/read');
      if (res.success) {
        api.showToast('All notifications marked as read.', 'success');
        await loadNotificationsPage();
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    }
  });
}
