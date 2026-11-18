/**
 * Contact Us Form Submission Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const alertBox = document.getElementById('contactAlert');
  const submitBtn = document.getElementById('contactSubmitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      return;
    }

    const payload = {
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      phone: document.getElementById('contactPhone').value.trim(),
      subject: document.getElementById('contactSubject').value,
      message: document.getElementById('contactMessage').value.trim(),
    };

    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    alertBox.classList.add('d-none');

    try {
      const res = await api.post('/contact', payload);
      if (res.success) {
        alertBox.className = 'alert alert-success show';
        alertBox.textContent = res.message || 'Thank you! Your inquiry has been registered in our system.';
        alertBox.classList.remove('d-none');

        form.reset();
        form.classList.remove('was-validated');
        api.showToast('Message sent to GharKaam support team!', 'success');
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Failed to submit form. Please try again.';
      alertBox.classList.remove('d-none');
      api.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  });
});
