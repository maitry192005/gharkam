/**
 * Login Handler with Role Detection & Redirect
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const togglePassBtn = document.getElementById('togglePasswordBtn');
  const passInput = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');

  // Check URL params for messages or redirects
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');
  const msgParam = urlParams.get('msg');

  if (msgParam === 'unauthorized') {
    alertBox.className = 'alert alert-warning show';
    alertBox.textContent = 'Please log in to access that protected page.';
    alertBox.classList.remove('d-none');
  } else if (msgParam === 'admin_only') {
    alertBox.className = 'alert alert-danger show';
    alertBox.textContent = 'Access restricted: Administrator credentials required.';
    alertBox.classList.remove('d-none');
  }

  // Toggle Password Visibility
  if (togglePassBtn && passInput && eyeIcon) {
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      eyeIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      return;
    }

    const loginId = document.getElementById('loginId').value.trim();
    const password = passInput.value;

    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    alertBox.classList.add('d-none');

    try {
      const res = await api.post('/auth/login', { loginId, password });
      if (res.success && res.data && res.data.user) {
        const user = res.data.user;
        localStorage.setItem('gk_user', JSON.stringify(user));
        api.showToast(`Welcome back, ${user.fullName}!`, 'success');

        // Check if redirect specified
        if (redirectTarget) {
          window.location.href = redirectTarget;
          return;
        }

        // Role-based destination
        if (user.role === 'admin') {
          window.location.href = '/admin/index.html';
        } else if (user.role === 'helper') {
          if (user.status === 'pending') {
            window.location.href = '/helper-waiting.html';
          } else {
            window.location.href = '/helper-dashboard.html';
          }
        } else {
          window.location.href = '/customer-dashboard.html';
        }
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Login failed. Please check your credentials.';
      alertBox.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  });
});
