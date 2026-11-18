/**
 * Service Detail Page Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    window.location.href = '/services.html';
    return;
  }

  await loadServiceDetail(slug);
});

async function loadServiceDetail(slug) {
  const container = document.getElementById('serviceDetailContainer');
  const breadcrumb = document.getElementById('breadcrumbServiceName');

  try {
    const res = await api.get(`/services/${slug}`);
    if (!res.success || !res.data || !res.data.service) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-exclamation-circle text-danger fs-1"></i>
          <h4 class="fw-bold mt-3">Service Not Found</h4>
          <p class="text-muted">The requested service could not be found or is currently inactive.</p>
          <a href="/services.html" class="btn btn-brand-primary">Browse All Services</a>
        </div>
      `;
      return;
    }

    const { service, helpers } = res.data;
    document.title = `${service.name} Services | GharKaam`;
    if (breadcrumb) breadcrumb.textContent = service.name;

    const includedItems = (service.whatIsIncluded || [])
      .map((item) => `<li class="d-flex align-items-start gap-2 mb-2"><i class="bi bi-check-circle-fill text-success fs-6 mt-1"></i><span>${api.escapeHTML(item)}</span></li>`)
      .join('');

    let helpersHtml = '';
    if (helpers && helpers.length > 0) {
      helpersHtml = helpers
        .map((h) => {
          const u = h.user || {};
          const initials = api.getInitials(u.fullName);
          const avatarEl = u.avatar
            ? `<img src="${u.avatar}" alt="${api.escapeHTML(u.fullName)}" class="avatar-circle">`
            : `<div class="avatar-circle">${initials}</div>`;

          // Find this service's specific rate in helper profile
          const servRateObj = (h.services || []).find((s) => s.service?.toString() === service._id.toString());
          const rate = servRateObj ? servRateObj.rate : service.baseRate;

          return `
            <div class="col-md-6 col-lg-4">
              <div class="gk-card p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex align-items-center gap-3 mb-2">
                    ${avatarEl}
                    <div>
                      <h6 class="fw-bold mb-0">${api.escapeHTML(u.fullName)}</h6>
                      <div class="rating-badge py-0 px-2 mt-1" style="font-size: 0.75rem;">
                        <i class="bi bi-star-fill"></i> ${h.ratingAvg?.toFixed(1) || '5.0'} (${h.ratingCount || 0})
                      </div>
                    </div>
                  </div>
                  <div class="text-muted small mb-2">
                    <i class="bi bi-geo-alt me-1"></i>${api.escapeHTML(u.address?.district || 'Local Area')}
                  </div>
                </div>
                <div class="pt-2 border-top d-flex justify-content-between align-items-center">
                  <div class="fw-bold text-success">₹${rate}/day</div>
                  <a href="/book.html?helperId=${u._id}&serviceId=${service._id}" class="btn btn-sm btn-brand-primary">
                    Book Helper
                  </a>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    } else {
      helpersHtml = `
        <div class="col-12 text-center py-4 bg-light rounded-3">
          <p class="text-muted small mb-2">No helpers currently listed exclusively for this service in this area.</p>
          <a href="/helpers.html" class="btn btn-sm btn-brand-primary">Search All Available Helpers</a>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="row g-5">
        <!-- Left: Image & Description -->
        <div class="col-lg-8">
          <div class="position-relative overflow-hidden rounded-4 mb-4" style="max-height: 400px;">
            <img src="/assets/images/${service.image || 'service-cleaning.jpg'}" alt="${api.escapeHTML(service.name)}" class="w-100 h-100 object-fit-cover shadow-sm">
          </div>

          <div class="d-flex align-items-center gap-2 mb-2 text-success">
            <i class="bi ${service.icon || 'bi-house-heart'} fs-4"></i>
            <span class="fw-bold text-uppercase tracking-wider small">${api.escapeHTML(service.category || 'Household')}</span>
          </div>

          <h1 class="display-6 fw-bold mb-3">${api.escapeHTML(service.name)}</h1>
          <p class="lead text-muted mb-4">${api.escapeHTML(service.description)}</p>

          <hr class="my-4">

          <h4 class="fw-bold mb-3">What's Included in This Service</h4>
          <ul class="list-unstyled mb-4">
            ${includedItems || '<li class="text-muted">Standard domestic quality assurance.</li>'}
          </ul>

          <h4 class="fw-bold mb-3">Safety & Trust Assurance</h4>
          <div class="p-3 rounded-3 gk-card mb-4 bg-light border-0">
            <div class="row g-3">
              <div class="col-md-6 d-flex align-items-center gap-2">
                <i class="bi bi-shield-lock-fill text-success fs-4"></i>
                <span class="small fw-semibold">Government Aadhaar/Voter ID verified</span>
              </div>
              <div class="col-md-6 d-flex align-items-center gap-2">
                <i class="bi bi-clock-history text-success fs-4"></i>
                <span class="small fw-semibold">Punctual & professional service delivery</span>
              </div>
              <div class="col-md-6 d-flex align-items-center gap-2">
                <i class="bi bi-arrow-repeat text-success fs-4"></i>
                <span class="small fw-semibold">Free replacement if helper is unavailable</span>
              </div>
              <div class="col-md-6 d-flex align-items-center gap-2">
                <i class="bi bi-wallet2 text-success fs-4"></i>
                <span class="small fw-semibold">Pay securely online or after service</span>
              </div>
            </div>
          </div>

          <!-- Helpers Offering This Service -->
          <div class="mt-5">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4 class="fw-bold mb-0">Verified Helpers for ${api.escapeHTML(service.name)}</h4>
              <a href="/helpers.html?service=${service.slug}" class="text-success small fw-bold text-decoration-none">View All Helpers →</a>
            </div>
            <div class="row g-3">
              ${helpersHtml}
            </div>
          </div>
        </div>

        <!-- Right Sidebar: Quick Booking Card -->
        <div class="col-lg-4">
          <div class="gk-card p-4 sticky-top" style="top: 100px;">
            <div class="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-1 mb-2">Transparent Pricing</div>
            <div class="d-flex align-items-baseline gap-1 mb-3">
              <span class="display-6 fw-bold">₹${service.baseRate}</span>
              <span class="text-muted small">/ day base rate</span>
            </div>
            <p class="small text-muted mb-4">
              Daily rate varies slightly based on chosen verified helper experience and customized household requirements.
            </p>

            <a href="/helpers.html?service=${service.slug}" class="btn btn-brand-primary w-100 py-2 fw-bold mb-2">
              <i class="bi bi-person-check me-1"></i> Choose Helper for ${api.escapeHTML(service.name)}
            </a>
            <a href="/book.html" class="btn btn-brand-outline w-100 py-2 fw-bold">
              Instant Booking Wizard
            </a>

            <div class="mt-4 pt-3 border-top small text-muted">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-telephone-inbound text-success"></i>
                <span>Need assistance? Call: +91 98765 43210</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-chat-dots text-success"></i>
                <span><a href="/contact.html" class="text-success text-decoration-none">Write to our customer support</a></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-center py-5 text-danger">Failed to load service detail: ${err.message}</div>`;
  }
}
