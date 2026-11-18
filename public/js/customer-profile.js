/**
 * Customer Profile Management Controller
 */

let activeCustomer = null;

document.addEventListener('DOMContentLoaded', async () => {
  activeCustomer = await checkAuthAndLoadProfile();
  if (activeCustomer) {
    setupSidebar(activeCustomer);
    populateProfileForm(activeCustomer);
    setupProfileSubmit();
    setupChangePasswordSubmit();
    await loadAddresses();
    setupAddAddressModal();
  }
});

async function checkAuthAndLoadProfile() {
  try {
    const session = await api.getMe();
    if (!session || !session.user) {
      window.location.href = '/login.html?redirect=customer-profile.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=customer-profile.html';
    return null;
  }
}

function setupSidebar(user) {
  const sideNameEl = document.getElementById('sideUserName');
  if (sideNameEl) sideNameEl.textContent = user.fullName;
  const sideAvatar = document.getElementById('sideAvatarContainer');
  if (sideAvatar) {
    const initials = api.getInitials(user.fullName);
    sideAvatar.innerHTML = user.avatar
      ? `<img src="${user.avatar}" class="avatar-circle" alt="${api.escapeHTML(user.fullName)}">`
      : `<div class="avatar-circle">${initials}</div>`;
  }
  const refCodeEl = document.getElementById('displayReferralCode');
  if (refCodeEl) refCodeEl.textContent = user.referralCode || 'GK2026';
}

function populateProfileForm(u) {
  document.getElementById('profFullName').value = u.fullName || '';
  document.getElementById('profPhone').value = u.phone || '';
  document.getElementById('profEmail').value = u.email || '';
  document.getElementById('profGender').value = u.gender || 'prefer-not-to-say';

  const addr = u.address || {};
  document.getElementById('profDistrict').value = addr.district || '';
  document.getElementById('profState').value = addr.state || '';
  document.getElementById('profAddressLine').value = addr.addressLine || '';
  document.getElementById('profPincode').value = addr.pincode || '';
}

function setupProfileSubmit() {
  const form = document.getElementById('profileEditForm');
  const alertBox = document.getElementById('profileAlert');
  const saveBtn = document.getElementById('saveProfBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    alertBox.classList.add('d-none');

    const formData = new FormData();
    formData.append('fullName', document.getElementById('profFullName').value.trim());
    formData.append('phone', document.getElementById('profPhone').value.trim());
    formData.append('gender', document.getElementById('profGender').value);
    formData.append('district', document.getElementById('profDistrict').value.trim());
    formData.append('state', document.getElementById('profState').value.trim());
    formData.append('addressLine', document.getElementById('profAddressLine').value.trim());
    formData.append('pincode', document.getElementById('profPincode').value.trim());

    const avatarFile = document.getElementById('profAvatarFile')?.files[0];
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
      const res = await api.uploadPut('/users/profile', formData);
      if (res.success && res.data) {
        localStorage.setItem('gk_user', JSON.stringify(res.data));
        alertBox.className = 'alert alert-success show';
        alertBox.textContent = 'Profile updated successfully!';
        alertBox.classList.remove('d-none');
        api.showToast('Profile updated!', 'success');
        setupSidebar(res.data);
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Failed to update profile.';
      alertBox.classList.remove('d-none');
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function setupChangePasswordSubmit() {
  const form = document.getElementById('changePasswordForm');
  const alertBox = document.getElementById('passwordAlert');
  const btn = document.getElementById('changePassBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    btn.disabled = true;
    alertBox.classList.add('d-none');

    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (res.success) {
        alertBox.className = 'alert alert-success show';
        alertBox.textContent = 'Password updated successfully!';
        alertBox.classList.remove('d-none');
        form.reset();
        api.showToast('Password updated!', 'success');
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Failed to update password.';
      alertBox.classList.remove('d-none');
    } finally {
      btn.disabled = false;
    }
  });
}

// Saved Addresses
async function loadAddresses() {
  const container = document.getElementById('savedAddressesList');
  if (!container) return;

  try {
    const res = await api.get('/users/addresses');
    if (res.success && res.data) {
      if (!res.data.length) {
        container.innerHTML = `<div class="text-muted text-center py-2 small">No additional saved addresses.</div>`;
        return;
      }

      container.innerHTML = '';
      res.data.forEach((addr) => {
        const item = `
          <div class="p-2 border rounded bg-light d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-bold">${api.escapeHTML(addr.title)} ${addr.isDefault ? '<span class="badge bg-success small" style="font-size: 0.65rem;">Default</span>' : ''}</div>
              <div class="text-muted small">${api.escapeHTML(addr.addressLine)}, ${api.escapeHTML(addr.district)} - ${addr.pincode}</div>
            </div>
            <button class="btn btn-sm text-danger p-0 ms-2" onclick="deleteSavedAddress('${addr._id}')" title="Delete"><i class="bi bi-x-circle"></i></button>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', item);
      });
    }
  } catch (e) {
    // Non-blocking
  }
}

window.openAddressModal = function () {
  new bootstrap.Modal(document.getElementById('addAddressModal')).show();
};

function setupAddAddressModal() {
  const form = document.getElementById('addAddressForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('addrTitle').value.trim(),
      addressLine: document.getElementById('addrLine').value.trim(),
      district: document.getElementById('addrDistrict').value.trim(),
      state: document.getElementById('addrState').value.trim(),
      pincode: document.getElementById('addrPincode').value.trim(),
      isDefault: document.getElementById('addrIsDefault').checked,
    };

    try {
      const res = await api.post('/users/addresses', payload);
      if (res.success) {
        api.showToast('Address added!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addAddressModal'))?.hide();
        form.reset();
        await loadAddresses();
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    }
  });
}

window.deleteSavedAddress = async function (id) {
  try {
    const res = await api.delete(`/users/addresses/${id}`);
    if (res.success) {
      api.showToast('Address removed', 'info');
      await loadAddresses();
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};

window.copyReferralLink = function () {
  const code = activeCustomer?.referralCode || '';
  const link = `${window.location.origin}/register.html?ref=${code}`;
  navigator.clipboard.writeText(link).then(() => {
    api.showToast('Referral link copied to clipboard!', 'success');
  });
};
