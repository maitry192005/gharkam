/**
 * Customer Registration Handler
 */

let locationsStateData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadLocationStates();
  setupFormValidation();
});

async function loadLocationStates() {
  const stateSelect = document.getElementById('state');
  const districtSelect = document.getElementById('district');
  if (!stateSelect) return;

  try {
    const res = await fetch('/assets/data/locations.json');
    const data = await res.json();
    locationsStateData = data.states || [];

    locationsStateData.forEach((st) => {
      const opt = new Option(st.name, st.name);
      stateSelect.add(opt);
    });

    stateSelect.addEventListener('change', () => {
      districtSelect.innerHTML = '<option value="">Select District</option>';
      const selectedStateName = stateSelect.value;
      const foundState = locationsStateData.find((s) => s.name === selectedStateName);

      if (foundState && foundState.districts) {
        foundState.districts.forEach((d) => {
          districtSelect.add(new Option(d, d));
        });
        districtSelect.disabled = false;
      } else {
        districtSelect.disabled = true;
      }
    });
  } catch (e) {
    console.warn('Could not load locations fallback:', e.message);
  }
}

function setupFormValidation() {
  const form = document.getElementById('customerRegForm');
  const alertBox = document.getElementById('regAlert');
  const submitBtn = document.getElementById('regSubmitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  confirmPasswordInput?.addEventListener('input', () => {
    if (confirmPasswordInput.value !== passwordInput.value) {
      confirmPasswordInput.setCustomValidity('Passwords do not match');
    } else {
      confirmPasswordInput.setCustomValidity('');
    }
  });

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (confirmPasswordInput.value !== passwordInput.value) {
      confirmPasswordInput.setCustomValidity('Passwords do not match');
    } else {
      confirmPasswordInput.setCustomValidity('');
    }

    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      return;
    }

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      gender: document.getElementById('gender').value,
      referredBy: document.getElementById('referredBy').value.trim() || undefined,
      password: passwordInput.value,
      state: document.getElementById('state').value,
      district: document.getElementById('district').value,
      addressLine: document.getElementById('addressLine').value.trim(),
      landmark: document.getElementById('landmark').value.trim(),
      pincode: document.getElementById('pincode').value.trim(),
      houseType: document.getElementById('houseType').value,
    };

    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    alertBox.classList.add('d-none');

    try {
      const res = await api.post('/auth/register-customer', payload);
      if (res.success && res.data && res.data.user) {
        localStorage.setItem('gk_user', JSON.stringify(res.data.user));
        api.showToast('Account registered! Welcome to GharKaam 🎉', 'success');
        setTimeout(() => {
          window.location.href = '/customer-dashboard.html';
        }, 800);
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Registration failed. Please check your details.';
      alertBox.classList.remove('d-none');
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  });
}
