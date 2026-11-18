/**
 * Helpers Directory & Filter Handler
 */

let currentPage = 1;
const limit = 9;

document.addEventListener('DOMContentLoaded', async () => {
  await loadFilterServices();
  readUrlParamsIntoFilters();
  await loadHelpers();
  setupFilterEvents();
});

// Load services into the filter dropdown
async function loadFilterServices() {
  const select = document.getElementById('filterService');
  if (!select) return;

  try {
    const res = await api.get('/services');
    if (res.success && res.data) {
      res.data.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.slug;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    // Non-blocking
  }
}

function readUrlParamsIntoFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get('service');
  const district = urlParams.get('district');

  if (service) {
    const serviceSelect = document.getElementById('filterService');
    if (serviceSelect) serviceSelect.value = service;
  }

  if (district) {
    const distSelect = document.getElementById('filterDistrict');
    if (distSelect) {
      // Add option if not present
      if (!Array.from(distSelect.options).some((o) => o.value.toLowerCase() === district.toLowerCase())) {
        const newOpt = new Option(district, district, true, true);
        distSelect.add(newOpt);
      } else {
        distSelect.value = district;
      }
    }
  }
}

async function loadHelpers() {
  const grid = document.getElementById('helpersGrid');
  const paginationUl = document.getElementById('helpersPagination');
  if (!grid) return;

  const service = document.getElementById('filterService')?.value || 'all';
  const district = document.getElementById('filterDistrict')?.value || 'all';
  const minRating = document.getElementById('filterRating')?.value || '';
  const minExp = document.getElementById('filterExp')?.value || '';
  const maxRate = document.getElementById('filterRate')?.value || '';
  const availableOnly = document.getElementById('filterAvailable')?.checked ? 'true' : 'false';
  const sort = document.getElementById('helperSortSelect')?.value || 'rating';

  const params = {
    page: currentPage,
    limit,
    sort,
    availableOnly,
  };

  if (service && service !== 'all') params.service = service;
  if (district && district !== 'all') params.district = district;
  if (minRating) params.minRating = minRating;
  if (minExp) params.minExp = minExp;
  if (maxRate) params.maxRate = maxRate;

  try {
    const res = await api.get('/helpers', params);
    if (!res.success || !res.data || !res.data.length) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-people fs-1 text-muted"></i>
          <h5 class="fw-bold mt-3">No matching helpers found</h5>
          <p class="text-muted small">Try broadening your search criteria or resetting filters.</p>
        </div>
      `;
      if (paginationUl) paginationUl.innerHTML = '';
      return;
    }

    grid.innerHTML = '';
    res.data.forEach((h) => {
      const u = h.user || {};
      const initials = api.getInitials(u.fullName);
      const avatarEl = u.avatar
        ? `<img src="${u.avatar}" alt="${api.escapeHTML(u.fullName)}" class="avatar-circle avatar-lg">`
        : `<div class="avatar-circle avatar-lg">${initials}</div>`;

      const serviceBadges = (h.services || [])
        .map(
          (sv) =>
            `<span class="badge bg-light text-dark border me-1 mb-1">${api.escapeHTML(
              sv.service?.name || 'Service'
            )} (₹${sv.rate})</span>`
        )
        .join('');

      const areasText = (h.areas || []).slice(0, 3).join(', ');

      const cardHtml = `
        <div class="col-md-6 col-xl-4">
          <div class="gk-card gk-card-interactive h-100 p-4 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex align-items-start gap-3 mb-3">
                ${avatarEl}
                <div>
                  <h5 class="fw-bold mb-1 d-flex align-items-center gap-1">
                    ${api.escapeHTML(u.fullName)}
                    ${h.verified ? '<i class="bi bi-patch-check-fill verified-badge" title="ID Verified"></i>' : ''}
                  </h5>
                  <div class="rating-badge mb-1">
                    <i class="bi bi-star-fill"></i> ${(h.ratingAvg || 5.0).toFixed(1)} (${h.ratingCount || 0})
                  </div>
                  <div class="text-muted small">
                    <i class="bi bi-geo-alt me-1"></i>${api.escapeHTML(u.address?.district || 'Central')}, ${api.escapeHTML(u.address?.state || '')}
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <div class="small fw-semibold text-muted mb-1">Services & Rates:</div>
                <div class="d-flex flex-wrap">${serviceBadges || '<span class="text-muted small">Domestic services</span>'}</div>
              </div>

              <div class="small text-muted mb-2">
                <i class="bi bi-chat-left-text me-1"></i><strong>Languages:</strong> ${(h.languages || ['Hindi']).join(', ')}
              </div>

              ${areasText ? `<div class="small text-muted mb-3"><i class="bi bi-pin-map me-1"></i><strong>Areas:</strong> ${api.escapeHTML(areasText)}</div>` : ''}

              <p class="text-muted small text-truncate-2 mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${api.escapeHTML(h.bio || '')}
              </p>
            </div>

            <div class="pt-3 border-top d-flex gap-2">
              <a href="/helper-profile.html?id=${h._id}" class="btn btn-sm btn-brand-outline flex-grow-1">
                View Profile
              </a>
              <a href="/book.html?helperId=${u._id}" class="btn btn-sm btn-brand-primary flex-grow-1">
                Book Helper
              </a>
            </div>
          </div>
        </div>
      `;
      grid.insertAdjacentHTML('beforeend', cardHtml);
    });

    renderPagination(res.page, res.totalPages);
  } catch (err) {
    grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Error loading helpers: ${err.message}</div>`;
  }
}

function renderPagination(current, totalPages) {
  const paginationUl = document.getElementById('helpersPagination');
  if (!paginationUl) return;

  if (totalPages <= 1) {
    paginationUl.innerHTML = '';
    return;
  }

  let html = `
    <li class="page-item ${current === 1 ? 'disabled' : ''}">
      <button class="page-link" onclick="changePage(${current - 1})">Previous</button>
    </li>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="page-item ${i === current ? 'active' : ''}">
        <button class="page-link" onclick="changePage(${i})">${i}</button>
      </li>
    `;
  }

  html += `
    <li class="page-item ${current === totalPages ? 'disabled' : ''}">
      <button class="page-link" onclick="changePage(${current + 1})">Next</button>
    </li>
  `;

  paginationUl.innerHTML = html;
}

window.changePage = function (page) {
  currentPage = page;
  loadHelpers();
  window.scrollTo({ top: 100, behavior: 'smooth' });
};

function setupFilterEvents() {
  const applyBtn = document.getElementById('applyFiltersBtn');
  const resetBtn = document.getElementById('resetFiltersBtn');
  const sortSelect = document.getElementById('helperSortSelect');
  const rateRange = document.getElementById('filterRate');
  const rateDisplay = document.getElementById('rateDisplay');

  if (rateRange && rateDisplay) {
    rateRange.addEventListener('input', (e) => {
      rateDisplay.textContent = `₹${e.target.value}`;
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      currentPage = 1;
      loadHelpers();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentPage = 1;
      loadHelpers();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.getElementById('filterService').value = 'all';
      document.getElementById('filterDistrict').value = 'all';
      document.getElementById('filterRating').value = '';
      document.getElementById('filterExp').value = '';
      document.getElementById('filterRate').value = '1000';
      if (rateDisplay) rateDisplay.textContent = '₹1000';
      document.getElementById('filterAvailable').checked = true;
      document.getElementById('helperSortSelect').value = 'rating';
      currentPage = 1;
      loadHelpers();
    });
  }
}
