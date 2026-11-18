/**
 * Helper Services & Rates Configuration Handler
 */

let allServicesMaster = [];
let helperCurrentServices = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkHelperAccess();
  if (user) {
    setupSidebar(user);
    await loadAllServices();
    await loadHelperServices();
    setupSaveBtn();
    setupCustomServiceSuggest();
  }
});

async function checkHelperAccess() {
  try {
    const session = await api.getMe();
    if (!session || !session.user || session.user.role !== 'helper') {
      window.location.href = '/login.html?redirect=helper-services.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=helper-services.html';
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

async function loadAllServices() {
  try {
    const res = await api.get('/services');
    if (res.success && res.data) {
      allServicesMaster = res.data;
    }
  } catch (e) {
    console.error('Failed to load services master:', e);
  }
}

async function loadHelperServices() {
  const container = document.getElementById('activeServicesGrid');
  if (!container) return;

  try {
    const session = await api.getMe();
    if (session && session.helperProfile) {
      helperCurrentServices = session.helperProfile.services || [];
    }

    container.innerHTML = '';
    allServicesMaster.forEach((s) => {
      // Check if helper currently offers this service
      const existing = helperCurrentServices.find((hs) => (hs.service?._id || hs.service) === s._id);
      const isChecked = !!existing;
      const rate = existing ? existing.rate : s.baseRate;

      const card = `
        <div class="col-md-6">
          <div class="p-3 border rounded-3 bg-white h-100">
            <div class="form-check mb-2">
              <input class="form-check-input helper-srv-chk" type="checkbox" value="${s._id}" id="srv_${s._id}" ${isChecked ? 'checked' : ''}>
              <label class="form-check-label fw-bold" for="srv_${s._id}">
                <i class="bi ${s.icon || 'bi-house'} text-success me-1"></i> ${api.escapeHTML(s.name)}
              </label>
            </div>
            <div class="input-group input-group-sm">
              <span class="input-group-text">Your Daily Rate (₹)</span>
              <input type="number" class="form-control helper-srv-rate" id="srv_rate_${s._id}" min="100" max="5000" value="${rate}" ${isChecked ? '' : 'disabled'}>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', card);
    });

    // Toggle rate input disabled state based on check
    document.querySelectorAll('.helper-srv-chk').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const rateInput = document.getElementById(`srv_rate_${e.target.value}`);
        if (rateInput) {
          rateInput.disabled = !e.target.checked;
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-3">${err.message}</div>`;
  }
}

function setupSaveBtn() {
  const saveBtn = document.getElementById('saveRatesBtn');
  const alertBox = document.getElementById('serviceAlert');

  saveBtn?.addEventListener('click', async () => {
    const checked = Array.from(document.querySelectorAll('.helper-srv-chk:checked'));
    if (!checked.length) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = 'Please offer at least one service.';
      alertBox.classList.remove('d-none');
      return;
    }

    const servicesPayload = checked.map((chk) => {
      const sId = chk.value;
      const rate = Number(document.getElementById(`srv_rate_${sId}`)?.value || 300);
      return { serviceId: sId, rate };
    });

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    alertBox.classList.add('d-none');

    try {
      const res = await api.put('/helpers/services', { services: servicesPayload });
      if (res.success) {
        alertBox.className = 'alert alert-success show';
        alertBox.textContent = 'Your services and rates have been saved and updated across search!';
        alertBox.classList.remove('d-none');
        api.showToast('Services & rates saved successfully!', 'success');
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Failed to save services.';
      alertBox.classList.remove('d-none');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Services & Rates';
    }
  });
}

function setupCustomServiceSuggest() {
  const suggestBtn = document.getElementById('suggestServiceBtn');
  const input = document.getElementById('customServiceInput');

  suggestBtn?.addEventListener('click', async () => {
    const text = input?.value.trim();
    if (!text) return;

    try {
      const res = await api.post('/contact/feedback', {
        category: 'New Service Suggestion',
        feedback: `Service Suggestion: ${text}`,
      });
      if (res.success) {
        api.showToast('Suggestion sent to admin team for review!', 'success');
        input.value = '';
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    }
  });
}
