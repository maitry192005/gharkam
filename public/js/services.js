/**
 * Services Catalogue Page Handler
 */

let allServices = [];
let selectedCategory = 'All';

document.addEventListener('DOMContentLoaded', async () => {
  await fetchServices();
  setupSearchAndFilters();
});

async function fetchServices() {
  const grid = document.getElementById('servicesGrid');
  try {
    const res = await api.get('/services');
    if (res.success && res.data) {
      allServices = res.data;
      renderServices(allServices);
    }
  } catch (err) {
    if (grid) {
      grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load services: ${err.message}</div>`;
    }
  }
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  if (!services.length) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search fs-1 text-muted"></i>
        <h5 class="fw-bold mt-3">No matching services found</h5>
        <p class="text-muted small">Try tweaking your search keywords or choosing "All Categories".</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  services.forEach((s) => {
    const includedBullets = (s.whatIsIncluded || [])
      .slice(0, 3)
      .map((item) => `<li class="small text-muted mb-1"><i class="bi bi-check-circle-fill text-success me-1 small"></i>${api.escapeHTML(item)}</li>`)
      .join('');

    const cardHtml = `
      <div class="col-md-6 col-lg-4">
        <div class="gk-card gk-card-interactive h-100 d-flex flex-column overflow-hidden">
          <div class="position-relative" style="height: 200px;">
            <img src="/assets/images/${s.image || 'service-cleaning.jpg'}" alt="${api.escapeHTML(s.name)}" class="w-100 h-100 object-fit-cover" loading="lazy">
            <span class="position-absolute top-0 end-0 m-3 badge bg-white text-dark shadow-sm fw-bold">
              Starting ₹${s.baseRate}/day
            </span>
          </div>

          <div class="p-4 d-flex flex-column flex-grow-1 justify-content-between">
            <div>
              <div class="d-flex align-items-center gap-2 mb-2 text-success">
                <i class="bi ${s.icon || 'bi-house-heart'} fs-5"></i>
                <span class="small fw-semibold text-uppercase tracking-wider">${api.escapeHTML(s.category || 'Domestic')}</span>
              </div>
              <h3 class="h5 fw-bold mb-2">${api.escapeHTML(s.name)}</h3>
              <p class="text-muted small mb-3">
                ${api.escapeHTML(s.description)}
              </p>

              ${includedBullets ? `<div class="mb-3"><div class="small fw-bold mb-1">What's included:</div><ul class="list-unstyled ps-1 mb-0">${includedBullets}</ul></div>` : ''}
            </div>

            <div class="pt-3 border-top d-flex gap-2">
              <a href="/service-detail.html?slug=${s.slug}" class="btn btn-sm btn-brand-outline flex-grow-1">
                Details & FAQs
              </a>
              <a href="/helpers.html?service=${s.slug}" class="btn btn-sm btn-brand-primary flex-grow-1">
                Find Helpers
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', cardHtml);
  });
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById('serviceSearchInput');
  const catButtons = document.querySelectorAll('.category-btn');

  const applyFilters = () => {
    const term = searchInput?.value.toLowerCase().trim() || '';
    const filtered = allServices.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term);
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
    renderServices(filtered);
  };

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      catButtons.forEach((b) => {
        b.classList.remove('btn-brand-primary', 'active');
        b.classList.add('btn-outline-secondary');
      });
      btn.classList.add('btn-brand-primary', 'active');
      btn.classList.remove('btn-outline-secondary');

      selectedCategory = btn.getAttribute('data-category') || 'All';
      applyFilters();
    });
  });
}
