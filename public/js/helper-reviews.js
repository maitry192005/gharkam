document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.requireRole(['helper']);
  if (!user) return;

  // Sidebar identity
  const nameEl = document.getElementById('helperSideName');
  if (nameEl) nameEl.textContent = user.fullName || 'Helper';
  const avatarEl = document.getElementById('helperSideAvatarContainer');
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" class="avatar-circle" style="object-fit:cover;" alt="${user.fullName}">`;
    } else {
      avatarEl.innerHTML = `<div class="avatar-circle">${window.getInitials(user.fullName || 'Helper')}</div>`;
    }
  }

  loadReviews(user._id);
});

async function loadReviews(helperUserId) {
  const listEl = document.getElementById('helperReviewsList');
  const avgEl = document.getElementById('avgRatingDisplay');
  const countEl = document.getElementById('totalReviewsCount');

  try {
    const res = await api.getReviewsForHelper(helperUserId);
    if (!res.success) {
      listEl.innerHTML = `<div class="alert alert-danger">Failed to load reviews.</div>`;
      return;
    }

    const reviews = res.data || [];
    if (reviews.length === 0) {
      if (avgEl) avgEl.textContent = '5.0';
      if (countEl) countEl.textContent = 'Based on 0 verified reviews';
      listEl.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-star text-muted" style="font-size: 3rem;"></i>
          <h5 class="fw-bold text-dark mt-3">No Reviews Yet</h5>
          <p class="text-muted small">Once you complete jobs and customers rate your service, their honest reviews will appear here.</p>
        </div>
      `;
      return;
    }

    const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    if (avgEl) avgEl.textContent = avg;
    if (countEl) countEl.textContent = `Based on ${reviews.length} verified review${reviews.length > 1 ? 's' : ''}`;

    listEl.innerHTML = reviews.map(r => `
      <div class="border-bottom py-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="d-flex align-items-center gap-2">
            ${r.customer?.avatar 
              ? `<img src="${r.customer.avatar}" class="rounded-circle" width="36" height="36" style="object-fit:cover;" alt="Customer">`
              : `<div class="avatar-circle" style="width:36px; height:36px; font-size:13px;">${window.getInitials(r.customer?.fullName || 'Customer')}</div>`
            }
            <div>
              <div class="fw-bold small text-dark">${window.escapeHtml(r.customer?.fullName || 'Verified Customer')}</div>
              <div class="text-muted" style="font-size: 11px;">${window.formatDate(r.createdAt)}</div>
            </div>
          </div>
          <div class="stars-rating small">
            ${renderStars(r.rating)}
          </div>
        </div>
        <p class="text-secondary small mb-0 mt-1">"${window.escapeHtml(r.comment || 'Great service!')}"</p>
      </div>
    `).join('');

  } catch (err) {
    listEl.innerHTML = `<div class="alert alert-danger">Error fetching reviews: ${err.message}</div>`;
  }
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="bi ${i <= rating ? 'bi-star-fill' : 'bi-star'}"></i>`;
  }
  return stars;
}
