/**
 * Helper Registration Form Handler with Services & File Uploads
 */

let helperStatesData = [];
let availableServices = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadServicesForHelper();
  await loadLocationStates();
  setupHelperForm();
});

async function loadServicesForHelper() {
  const container = document.getElementById('helperServicesSelector');
  if (!container) return;

  try {
    const res = await api.get('/services');
    if (res.success && res.data) {
      availableServices = res.data;
      container.innerHTML = '';

      availableServices.forEach((s) => {
        const itemHtml = `
          <div class="col-md-6">
            <div class="p-3 border rounded-3 h-100 bg-white service-select-card">
              <div class="form-check mb-2">
                <input class="form-check-input helper-service-checkbox" type="checkbox" value="${s._id}" id="serv_${s._id}" data-slug="${s.slug}">
                <label class="form-check-label fw-bold small" for="serv_${s._id}">
                  <i class="bi ${s.icon || 'bi-house'} text-success me-1"></i>${api.escapeHTML(s.name)}
                </label>
              </div>
              <div class="input-group input-group-sm">
                <span class="input-group-text">₹ / day</span>
                <input type="number" class="form-control helper-service-rate" id="rate_${s._id}" min="100" max="5000" value="${s.baseRate || 350}" placeholder="Daily rate" disabled>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
      });

      // Enable rate input only when service checkbox is selected
      document.querySelectorAll('.helper-service-checkbox').forEach((chk) => {
        chk.addEventListener('change', (e) => {
          const rateInput = document.getElementById(`rate_${e.target.value}`);
          if (rateInput) {
            rateInput.disabled = !e.target.checked;
          }
        });
      });
    }
  } catch (e) {
    container.innerHTML = '<div class="col-12 text-danger small">Failed to load services catalogue.</div>';
  }
}

async function loadLocationStates() {
  const stateSelect = document.getElementById('helperState');
  const districtSelect = document.getElementById('helperDistrict');
  if (!stateSelect) return;

  try {
    const res = await fetch('/assets/data/locations.json');
    const data = await res.json();
    helperStatesData = data.states || [];

    helperStatesData.forEach((st) => {
      stateSelect.add(new Option(st.name, st.name));
    });

    stateSelect.addEventListener('change', () => {
      districtSelect.innerHTML = '<option value="">Select District</option>';
      const selected = stateSelect.value;
      const found = helperStatesData.find((s) => s.name === selected);
      if (found && found.districts) {
        found.districts.forEach((d) => {
          districtSelect.add(new Option(d, d));
        });
        districtSelect.disabled = false;
      } else {
        districtSelect.disabled = true;
      }
    });
  } catch (e) {
    console.warn('Could not load locations:', e.message);
  }
}

function setupHelperForm() {
  const form = document.getElementById('helperRegForm');
  const alertBox = document.getElementById('helperRegAlert');
  const submitBtn = document.getElementById('helperSubmitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  const passInput = document.getElementById('helperPassword');
  const confirmPassInput = document.getElementById('helperConfirmPassword');

  confirmPassInput?.addEventListener('input', () => {
    if (confirmPassInput.value !== passInput.value) {
      confirmPassInput.setCustomValidity('Passwords do not match');
    } else {
      confirmPassInput.setCustomValidity('');
    }
  });

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (confirmPassInput.value !== passInput.value) {
      confirmPassInput.setCustomValidity('Passwords do not match');
    } else {
      confirmPassInput.setCustomValidity('');
    }

    // Collect selected services
    const selectedServices = [];
    document.querySelectorAll('.helper-service-checkbox:checked').forEach((chk) => {
      const sId = chk.value;
      const rateVal = document.getElementById(`rate_${sId}`)?.value || 300;
      selectedServices.push({
        serviceId: sId,
        rate: Number(rateVal),
      });
    });

    if (selectedServices.length === 0) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = 'Please select at least one service you can provide.';
      alertBox.classList.remove('d-none');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      return;
    }

    // Build FormData for file uploads (avatar and idProof)
    const formData = new FormData();
    formData.append('fullName', document.getElementById('helperFullName').value.trim());
    formData.append('username', document.getElementById('helperUsername').value.trim());
    formData.append('email', document.getElementById('helperEmail').value.trim());
    formData.append('phone', document.getElementById('helperPhone').value.trim());
    formData.append('gender', document.getElementById('helperGender').value);
    formData.append('experience', document.getElementById('helperExperience').value);
    formData.append('password', passInput.value);
    formData.append('state', document.getElementById('helperState').value);
    formData.append('district', document.getElementById('helperDistrict').value);
    formData.append('addressLine', document.getElementById('helperAddressLine').value.trim());
    formData.append('pincode', document.getElementById('helperPincode').value.trim());
    formData.append('areas', document.getElementById('helperAreas').value.trim());
    formData.append('bio', document.getElementById('helperBio').value.trim());
    formData.append('idProofType', document.getElementById('helperIdProofType').value);

    // Languages
    const checkedLangs = [];
    document.querySelectorAll('.lang-check:checked').forEach((l) => checkedLangs.push(l.value));
    formData.append('languages', JSON.stringify(checkedLangs));

    // Services
    formData.append('services', JSON.stringify(selectedServices));

    // Files
    const avatarFile = document.getElementById('helperAvatar').files[0];
    if (avatarFile) formData.append('avatar', avatarFile);

    const idProofFile = document.getElementById('helperIdProof').files[0];
    if (idProofFile) formData.append('idProof', idProofFile);

    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    alertBox.classList.add('d-none');

    try {
      const res = await api.upload('/auth/register-helper', formData);
      if (res.success && res.data && res.data.user) {
        localStorage.setItem('gk_user', JSON.stringify(res.data.user));
        api.showToast('Helper application submitted!', 'success');
        setTimeout(() => {
          window.location.href = '/helper-waiting.html';
        }, 800);
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Helper registration failed. Check inputs.';
      alertBox.classList.remove('d-none');
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  });
}
