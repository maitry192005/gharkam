/**
 * Helper Public Profile & Reviews Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    window.location.href = '/helpers.html';
    return;
  }

  await loadHelperProfile(id);
});

async function loadHelperProfile(id) {
  const container = document.getElementById('helperProfileContainer');
  const breadcrumb = document.getElementById('breadcrumbHelperName');

  try {
    const res = await api.get(`/helpers/profile/${id}`);
    if (!res.success || !res.data || !res.data.profile) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-person-x fs-1 text-danger"></i>
          <h4 class="fw-bold mt-3">Helper Not Found</h4>
          <p class="text-muted">The requested helper profile could not be found or has been deactivated.</p>
          <a href="/helpers.html" class="btn btn-brand-primary">Browse All Helpers</a>
        </div>
      `;
      return;
    }

    const { profile, reviews } = res.data;
    const u = profile.user || {};
    document.title = `${u.fullName} - Verified Helper | GharKaam`;
    if (breadcrumb) breadcrumb.textContent = u.fullName;

    const initials = api.getInitials(u.fullName);
    const avatarEl = u.avatar
      ? `<img src="${u.avatar}" alt="${api.escapeHTML(u.fullName)}" class="avatar-circle avatar-xl shadow-sm">`
      : `<div class="avatar-circle avatar-xl shadow-sm">${initials}</div>`;

    const servicesTableRows = (profile.services || [])
      .map((s) => {
        const servName = s.service?.name || 'Domestic Service';
        const servDesc = s.service?.description || '';
        const servIcon = s.service?.icon || 'bi-house';
        return `
          <tr>
            <td class="fw-semibold">
              <i class="bi ${servIcon} text-success me-2"></i>${api.escapeHTML(servName)}
            </td>
            <td class="text-muted small">${api.escapeHTML(servDesc)}</td>
            <td class="text-end fw-bold text-success">₹${s.rate} / day</td>
          </tr>
        `;
      })
      .join('');

    let reviewsHtml = '';
    if (reviews && reviews.length > 0) {
      reviewsHtml = reviews
        .map((r) => {
          const cust = r.customer || {};
          const cInitials = api.getInitials(cust.fullName);
          const cAvatar = cust.avatar
            ? `<img src="${cust.avatar}" class="avatar-circle" style="width: 36px; height: 36px;">`
            : `<div class="avatar-circle" style="width: 36px; height: 36px; font-size: 0.8rem;">${cInitials}</div>`;

          const stars = Array(r.rating)
            .fill('<i class="bi bi-star-fill"></i>')
            .join('');

          return `
            <div class="p-3 border-bottom">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="d-flex align-items-center gap-2">
                  ${cAvatar}
                  <div>
                    <span class="fw-bold small">${api.escapeHTML(cust.fullName || 'Customer')}</span>
                    <span class="text-muted ms-1" style="font-size: 0.75rem;">&bull; Verified Booking</span>
                  </div>
                </div>
                <div class="stars-rating small">${stars}</div>
              </div>
              <p class="text-muted small mb-1">${api.escapeHTML(r.comment)}</p>
              <div class="text-muted" style="font-size: 0.75rem;">${api.formatDate(r.createdAt)}</div>
            </div>
          `;
        })
        .join('');
    } else {
      reviewsHtml = `<div class="text-muted text-center py-3 small">No customer reviews yet. Be the first to book and review!</div>`;
    }

    container.innerHTML = `
      <div class="row g-4">
        <!-- Main Profile Info -->
        <div class="col-lg-8">
          <div class="gk-card p-4 mb-4">
            <div class="d-flex flex-column flex-md-row align-items-start gap-4">
              ${avatarEl}
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <h2 class="h3 fw-bold mb-1 d-flex align-items-center gap-2">
                      ${api.escapeHTML(u.fullName)}
                      ${profile.verified ? '<i class="bi bi-patch-check-fill verified-badge fs-5" title="Police & ID Verified"></i>' : ''}
                    </h2>
                    <div class="text-muted small mb-2">
                      <i class="bi bi-geo-alt me-1"></i>${api.escapeHTML(u.address?.district || 'Central')}, ${api.escapeHTML(u.address?.state || '')}
                    </div>
                  </div>
                  <div>
                    <span class="badge ${profile.isAvailable ? 'bg-success' : 'bg-secondary'} px-3 py-2">
                      <i class="bi bi-circle-fill me-1 small"></i>${profile.isAvailable ? 'Available for Booking' : 'Currently Busy / Unavailable'}
                    </span>
                  </div>
                </div>

                <div class="d-flex flex-wrap gap-3 my-3">
                  <div class="rating-badge py-1 px-3 fs-6">
                    <i class="bi bi-star-fill"></i> ${(profile.ratingAvg || 5.0).toFixed(1)} <span class="fw-normal text-muted small ms-1">(${profile.ratingCount || 0} reviews)</span>
                  </div>
                  <div class="badge bg-light text-dark border py-2 px-3 fw-semibold">
                    <i class="bi bi-briefcase me-1 text-primary"></i> ${profile.experience || 1}+ Years Experience
                  </div>
                  <div class="badge bg-light text-dark border py-2 px-3 fw-semibold">
                    <i class="bi bi-check-all me-1 text-success"></i> ${profile.totalCompletedJobs || 0} Jobs Done
                  </div>
                </div>

                <p class="text-muted mb-0">${api.escapeHTML(profile.bio || '')}</p>
              </div>
            </div>
          </div>

          <!-- Services & Pricing Table -->
          <div class="gk-card p-4 mb-4">
            <h4 class="fw-bold mb-3">Services Offered & Daily Rates</h4>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light small">
                  <tr>
                    <th>Service Name</th>
                    <th>Scope Preview</th>
                    <th class="text-end">Daily Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${servicesTableRows || '<tr><td colspan="3" class="text-muted text-center">No services configured.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Areas & Languages -->
          <div class="gk-card p-4 mb-4">
            <h4 class="fw-bold mb-3">Service Areas & Languages</h4>
            <div class="row g-3">
              <div class="col-md-6">
                <h6 class="fw-semibold text-muted small text-uppercase">Localities Served</h6>
                <div class="d-flex flex-wrap gap-1 mt-2">
                  ${(profile.areas || [u.address?.district || 'Local Area'])
                    .map((a) => `<span class="badge bg-light text-dark border px-2 py-1">${api.escapeHTML(a)}</span>`)
                    .join('')}
                </div>
              </div>
              <div class="col-md-6">
                <h6 class="fw-semibold text-muted small text-uppercase">Languages Spoken</h6>
                <div class="d-flex flex-wrap gap-1 mt-2">
                  ${(profile.languages || ['Hindi'])
                    .map((l) => `<span class="badge bg-light text-dark border px-2 py-1">${api.escapeHTML(l)}</span>`)
                    .join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- Customer Reviews Section -->
          <div class="gk-card p-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4 class="fw-bold mb-0">Customer Reviews</h4>
              <span class="small text-muted">${reviews.length} Verified Reviews</span>
            </div>
            <div>
              ${reviewsHtml}
            </div>
          </div>
        </div>

        <!-- Right: Action Sidebar -->
        <div class="col-lg-4">
          <div class="gk-card p-4 sticky-top" style="top: 100px;">
            <h5 class="fw-bold mb-3">Book ${api.escapeHTML(u.fullName)}</h5>
            <p class="small text-muted mb-4">
              Select your required household tasks, dates, and review transparent daily rates.
            </p>

            <a href="/book.html?helperId=${u._id}" class="btn btn-brand-primary w-100 py-2 fw-bold mb-2 ${profile.isAvailable ? '' : 'disabled'}">
              <i class="bi bi-calendar-check me-1"></i> Book This Helper
            </a>

            <button type="button" class="btn btn-brand-outline w-100 py-2 fw-bold mb-3" onclick="toggleSaveHelper('${u._id}')">
              <i class="bi bi-heart me-1"></i> Save to Favourites
            </button>

            <!-- Verification Guarantees -->
            <div class="border-top pt-3">
              <div class="d-flex align-items-center gap-2 mb-2 small text-muted">
                <i class="bi bi-shield-check text-success fs-5"></i>
                <span>ID Proof verified (${profile.idProofType || 'Government ID'})</span>
              </div>
              <div class="d-flex align-items-center gap-2 mb-2 small text-muted">
                <i class="bi bi-clock-history text-success fs-5"></i>
                <span>Responds within 2 hours</span>
              </div>
              <div class="d-flex align-items-center gap-2 small text-muted">
                <i class="bi bi-cash-coin text-success fs-5"></i>
                <span>Pay online or cash on delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-center py-5 text-danger">Error: ${err.message}</div>`;
  }
}

window.toggleSaveHelper = async function (helperId) {
  try {
    const res = await api.post(`/users/favourites/${helperId}`);
    if (res.success) {
      api.showToast(res.message, 'success');
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};
