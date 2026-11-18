/**
 * Homepage Dynamic Loader & Interaction
 */

document.addEventListener('DOMContentLoaded', async () => {
  loadLiveStats();
  loadHomeServices();
  loadTopHelpers();
  setupHeroSearch();
});

// 1. Fetch live stats from API
async function loadLiveStats() {
  try {
    const res = await api.get('/admin/public-stats');
    if (res.success && res.data) {
      const { verifiedHelpers, completedJobs, citiesCount, avgRating } = res.data;
      const elHelpers = document.getElementById('statHelpers');
      const elJobs = document.getElementById('statJobs');
      const elCities = document.getElementById('statCities');
      const elRating = document.getElementById('statRating');

      if (elHelpers) elHelpers.textContent = `${verifiedHelpers}+`;
      if (elJobs) elJobs.textContent = `${completedJobs}+`;
      if (elCities) elCities.textContent = `${citiesCount}+`;
      if (elRating) elRating.textContent = `${avgRating} ★`;
    }
  } catch (e) {
    // Keep seeded fallbacks if offline
  }
}

// 2. Fetch and render 6 featured services
async function loadHomeServices() {
  const container = document.getElementById('homeServicesGrid');
  if (!container) return;

  try {
    const res = await api.get('/services');
    if (res.success && res.data && res.data.length > 0) {
      container.innerHTML = '';
      res.data.slice(0, 6).forEach((s) => {
        const cardHtml = `
          <div class="col-md-6 col-lg-4">
            <div class="gk-card gk-card-interactive h-100 overflow-hidden d-flex flex-column">
              <div class="position-relative overflow-hidden" style="height: 180px;">
                <img src="/assets/images/${s.image || 'service-cleaning.jpg'}" alt="${api.escapeHTML(s.name)}" class="w-100 h-100 object-fit-cover" loading="lazy">
                <span class="position-absolute top-0 end-0 m-3 badge bg-white text-dark shadow-sm fw-bold">
                  From ₹${s.baseRate}/day
                </span>
              </div>
              <div class="p-4 d-flex flex-column flex-grow-1 justify-content-between">
                <div>
                  <div class="d-flex align-items-center gap-2 mb-2 text-success">
                    <i class="bi ${s.icon || 'bi-house-heart'} fs-5"></i>
                    <span class="small fw-semibold text-uppercase tracking-wider">${api.escapeHTML(s.category || 'Domestic')}</span>
                  </div>
                  <h4 class="h5 fw-bold mb-2">${api.escapeHTML(s.name)}</h4>
                  <p class="text-muted small mb-3 text-truncate-3" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${api.escapeHTML(s.description)}
                  </p>
                </div>
                <div class="pt-3 border-top d-flex justify-content-between align-items-center">
                  <a href="/service-detail.html?slug=${s.slug}" class="text-success fw-bold text-decoration-none small d-inline-flex align-items-center gap-1">
                    Details & Included <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="/helpers.html?service=${s.slug}" class="btn btn-sm btn-brand-primary">
                    Find Helpers
                  </a>
                </div>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
      });
    } else {
      container.innerHTML = '<div class="col-12 text-center text-muted py-4">No services available currently.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load services: ${err.message}</div>`;
  }
}

// 3. Fetch and render top 3 rated helpers
async function loadTopHelpers() {
  const container = document.getElementById('homeHelpersGrid');
  if (!container) return;

  try {
    const res = await api.get('/helpers', { sort: 'rating', limit: 3 });
    if (res.success && res.data && res.data.length > 0) {
      container.innerHTML = '';
      res.data.forEach((h) => {
        const u = h.user || {};
        const initials = api.getInitials(u.fullName);
        const avatarEl = u.avatar
          ? `<img src="${u.avatar}" alt="${api.escapeHTML(u.fullName)}" class="avatar-circle avatar-lg">`
          : `<div class="avatar-circle avatar-lg">${initials}</div>`;

        const serviceTags = (h.services || [])
          .slice(0, 3)
          .map(
            (sv) =>
              `<span class="badge bg-light text-dark border me-1 mb-1">${api.escapeHTML(
                sv.service?.name || 'Service'
              )}</span>`
          )
          .join('');

        const cardHtml = `
          <div class="col-md-4">
            <div class="gk-card gk-card-interactive h-100 p-4 d-flex flex-column justify-content-between">
              <div>
                <div class="d-flex align-items-start gap-3 mb-3">
                  ${avatarEl}
                  <div>
                    <h5 class="fw-bold mb-1 d-flex align-items-center gap-1">
                      ${api.escapeHTML(u.fullName || 'Helper')}
                      ${h.verified ? '<i class="bi bi-patch-check-fill verified-badge" title="ID & Police Verified"></i>' : ''}
                    </h5>
                    <div class="rating-badge mb-1">
                      <i class="bi bi-star-fill"></i> ${h.ratingAvg.toFixed(1)} (${h.ratingCount} reviews)
                    </div>
                    <div class="text-muted small">
                      <i class="bi bi-geo-alt me-1"></i>${api.escapeHTML(u.address?.district || 'City')}, ${api.escapeHTML(u.address?.state || '')}
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <div class="small fw-semibold text-muted mb-1">Services Offered:</div>
                  <div class="d-flex flex-wrap">${serviceTags}</div>
                </div>

                <p class="text-muted small text-truncate-2 mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${api.escapeHTML(h.bio || '')}
                </p>
              </div>

              <div class="pt-3 border-top d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="bi bi-briefcase me-1"></i>${h.experience || 1}+ yrs exp</span>
                <a href="/helper-profile.html?id=${h._id}" class="btn btn-sm btn-brand-primary">
                  View Profile & Book
                </a>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
      });
    } else {
      container.innerHTML = '<div class="col-12 text-center text-muted py-4">No helpers currently listed.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-4">Helpers directory loading.</div>`;
  }
}

// 4. Hero Search Handler
function setupHeroSearch() {
  const form = document.getElementById('heroSearchForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const keyword = document.getElementById('heroKeyword')?.value.trim() || '';
    const district = document.getElementById('heroDistrict')?.value || 'all';

    const params = new URLSearchParams();
    if (keyword) params.set('service', keyword);
    if (district && district !== 'all') params.set('district', district);

    window.location.href = `/helpers.html?${params.toString()}`;
  });
}
