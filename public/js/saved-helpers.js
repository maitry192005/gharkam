/**
 * Saved / Favourite Helpers Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkCustomerUser();
  if (user) {
    setupSidebar(user);
    await loadFavourites();
  }
});

async function checkCustomerUser() {
  try {
    const session = await api.getMe();
    if (!session || !session.user) {
      window.location.href = '/login.html?redirect=saved-helpers.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=saved-helpers.html';
    return null;
  }
}

function setupSidebar(user) {
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

async function loadFavourites() {
  const container = document.getElementById('savedHelpersContainer');
  if (!container) return;

  try {
    const res = await api.get('/users/favourites');
    if (!res.success || !res.data || !res.data.length) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-heart fs-1 text-muted"></i>
          <h5 class="fw-bold mt-3">No saved helpers yet</h5>
          <p class="text-muted small">You haven't added any helpers to your favourites. Browse our roster to find someone great!</p>
          <a href="/helpers.html" class="btn btn-brand-primary btn-sm">Find Helpers</a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    res.data.forEach((item) => {
      const u = item.helper || {};
      const prof = item.profile || {};
      const initials = api.getInitials(u.fullName);
      const avatarEl = u.avatar
        ? `<img src="${u.avatar}" class="avatar-circle avatar-lg" alt="${api.escapeHTML(u.fullName)}">`
        : `<div class="avatar-circle avatar-lg">${initials}</div>`;

      const card = `
        <div class="col-md-6 col-xl-4">
          <div class="gk-card p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex align-items-start gap-3 mb-3">
                ${avatarEl}
                <div>
                  <h5 class="fw-bold mb-1">${api.escapeHTML(u.fullName || 'Helper')}</h5>
                  <div class="rating-badge mb-1">
                    <i class="bi bi-star-fill"></i> ${(prof.ratingAvg || 5.0).toFixed(1)} (${prof.ratingCount || 0})
                  </div>
                  <div class="text-muted small"><i class="bi bi-geo-alt me-1"></i>${api.escapeHTML(u.address?.district || 'Central')}</div>
                </div>
              </div>
              <p class="text-muted small text-truncate-2 mb-3">${api.escapeHTML(prof.bio || '')}</p>
            </div>
            <div class="pt-3 border-top d-flex gap-2">
              <a href="/book.html?helperId=${u._id}" class="btn btn-sm btn-brand-primary flex-grow-1">Book Helper</a>
              <button class="btn btn-sm btn-outline-danger" onclick="removeFavourite('${u._id}')" title="Remove"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', card);
    });
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Error loading favourites: ${err.message}</div>`;
  }
}

window.removeFavourite = async function (helperId) {
  try {
    const res = await api.post(`/users/favourites/${helperId}`);
    if (res.success) {
      api.showToast('Helper removed from favourites.', 'info');
      await loadFavourites();
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};
