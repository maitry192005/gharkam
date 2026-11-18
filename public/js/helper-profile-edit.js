document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.requireRole(['helper']);
  if (!user) return;

  // Sidebar identity
  const nameEl = document.getElementById('helperSideName');
  if (nameEl) nameEl.textContent = user.fullName || 'Helper';
  const avatarEl = document.getElementById('helperSideAvatarContainer');
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" class="avatar-circle" style="object-fit:cover;" alt="${user.fullName}">`;
    } else {
      avatarEl.innerHTML = `<div class="avatar-circle">${window.getInitials(user.fullName || 'Helper')}</div>`;
    }
  }

  // Populate Personal Details
  document.getElementById('fullName').value = user.fullName || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('phone').value = user.phone || '';
  document.getElementById('pincode').value = user.address?.pincode || '';
  document.getElementById('state').value = user.address?.state || '';
  document.getElementById('district').value = user.address?.district || '';
  document.getElementById('addressLine').value = user.address?.line || '';

  document.getElementById('profileFullNameDisplay').textContent = user.fullName || 'Helper Name';
  document.getElementById('profileEmailDisplay').textContent = user.email || '';

  renderAvatarPreview(user.avatar, user.fullName);

  // Fetch Helper Profile Details (bio, experience, languages, areas, status)
  try {
    const dashRes = await api.getHelperDashboard();
    if (dashRes.success && dashRes.data) {
      const p = dashRes.data.profile || {};
      document.getElementById('experience').value = p.experience !== undefined ? p.experience : 1;
      document.getElementById('languages').value = (p.languages || []).join(', ');
      document.getElementById('areas').value = (p.areas || []).join(', ');
      document.getElementById('bio').value = p.bio || '';

      // Verification Badge
      const badgeEl = document.getElementById('verificationBadge');
      const noticeEl = document.getElementById('verificationNotice');
      if (p.status === 'approved') {
        badgeEl.innerHTML = `<span class="badge bg-success p-2 fs-6"><i class="bi bi-patch-check-fill me-1"></i> Verified & Active</span>`;
        noticeEl.innerHTML = `Your identity has been verified. Your profile is live in search and ready for bookings.`;
      } else if (p.status === 'pending') {
        badgeEl.innerHTML = `<span class="badge bg-warning text-dark p-2 fs-6"><i class="bi bi-clock-history me-1"></i> Verification Pending</span>`;
        noticeEl.innerHTML = `Our admin team is reviewing your ID proof. You will be notified once approved.`;
      } else {
        badgeEl.innerHTML = `<span class="badge bg-danger p-2 fs-6"><i class="bi bi-x-circle me-1"></i> ${p.status?.toUpperCase()}</span>`;
        noticeEl.innerHTML = `Your profile is currently ${p.status}. Contact support for assistance.`;
      }
    }
  } catch (err) {
    console.error('Error loading helper profile:', err);
  }

  // Avatar Input Change Preview
  const avatarInput = document.getElementById('avatarInput');
  const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const previewContainer = document.getElementById('avatarPreviewContainer');
        previewContainer.innerHTML = `<img src="${re.target.result}" class="avatar-circle mx-auto" style="width:100px; height:100px; object-fit:cover;" alt="Avatar Preview">`;
      };
      reader.readAsDataURL(file);
      uploadAvatarBtn.disabled = false;
    }
  });

  // Avatar Upload Form
  document.getElementById('avatarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = avatarInput.files[0];
    if (!file) return;

    uploadAvatarBtn.disabled = true;
    uploadAvatarBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Uploading...`;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.updateProfile(formData);
      if (res.success) {
        window.showAlert('Avatar updated successfully!', 'success');
        setTimeout(() => location.reload(), 1000);
      } else {
        window.showAlert(res.message || 'Avatar upload failed', 'danger');
      }
    } catch (err) {
      window.showAlert(err.message || 'Avatar upload error', 'danger');
    } finally {
      uploadAvatarBtn.disabled = false;
      uploadAvatarBtn.textContent = 'Upload Avatar';
    }
  });

  // Personal Info Form Submission
  document.getElementById('personalInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('savePersonalBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      state: document.getElementById('state').value.trim(),
      district: document.getElementById('district').value.trim(),
      pincode: document.getElementById('pincode').value.trim(),
      addressLine: document.getElementById('addressLine').value.trim()
    };

    try {
      const res = await api.updateProfile(payload);
      if (res.success) {
        window.showAlert('Personal details updated successfully!', 'success');
      } else {
        window.showAlert(res.message || 'Update failed', 'danger');
      }
    } catch (err) {
      window.showAlert(err.message || 'Failed to update personal details', 'danger');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Personal Details';
    }
  });

  // Professional Info Form Submission
  document.getElementById('professionalInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveProfessionalBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Updating...`;

    const payload = {
      experience: document.getElementById('experience').value,
      languages: document.getElementById('languages').value,
      areas: document.getElementById('areas').value,
      bio: document.getElementById('bio').value.trim()
    };

    try {
      const res = await api.put('/users/helper-profile', payload);
      if (res.success) {
        window.showAlert('Professional details updated successfully!', 'success');
      } else {
        window.showAlert(res.message || 'Failed to update professional details', 'danger');
      }
    } catch (err) {
      window.showAlert(err.message || 'Update error', 'danger');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Update Professional Details';
    }
  });

  // Change Password Form
  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
      window.showAlert('New passwords do not match.', 'danger');
      return;
    }

    const changeBtn = document.getElementById('changePasswordBtn');
    changeBtn.disabled = true;
    changeBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Updating...`;

    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        window.showAlert('Password updated successfully!', 'success');
        document.getElementById('changePasswordForm').reset();
      } else {
        window.showAlert(res.message || 'Failed to change password.', 'danger');
      }
    } catch (err) {
      window.showAlert(err.message || 'Error updating password', 'danger');
    } finally {
      changeBtn.disabled = false;
      changeBtn.textContent = 'Update Password';
    }
  });
});

function renderAvatarPreview(avatarUrl, name) {
  const container = document.getElementById('avatarPreviewContainer');
  if (avatarUrl) {
    container.innerHTML = `<img src="${avatarUrl}" class="avatar-circle mx-auto" style="width:100px; height:100px; object-fit:cover;" alt="${name}">`;
  } else {
    container.innerHTML = `<div class="avatar-circle mx-auto" style="width: 100px; height: 100px; font-size: 2.2rem;">${window.getInitials(name || 'Helper')}</div>`;
  }
}
