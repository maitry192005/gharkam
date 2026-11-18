let adminUser = null;
let monthlyChartInstance = null;
let statusChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  adminUser = await window.requireRole(['admin']);
  if (!adminUser) return;

  const adminNameEl = document.getElementById('adminUserName');
  if (adminNameEl) adminNameEl.textContent = adminUser.fullName || 'Administrator';

  // Setup sidebar navigation clicks
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach((nav) => {
    nav.addEventListener('click', () => {
      const tab = nav.getAttribute('data-tab');
      adminSwitchTab(tab);
    });
  });

  // User filters
  const userSearch = document.getElementById('userSearchInput');
  const userRole = document.getElementById('userRoleFilter');
  const userStatus = document.getElementById('userStatusFilter');
  if (userSearch) userSearch.addEventListener('input', debounce(loadUsers, 400));
  if (userRole) userRole.addEventListener('change', loadUsers);
  if (userStatus) userStatus.addEventListener('change', loadUsers);

  // Booking filter
  const bookingFilter = document.getElementById('bookingStatusFilter');
  if (bookingFilter) bookingFilter.addEventListener('change', loadAdminBookings);

  // Service form submission
  const serviceForm = document.getElementById('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', handleSaveService);
  }

  // Coupon form submission
  const couponForm = document.getElementById('couponForm');
  if (couponForm) {
    couponForm.addEventListener('submit', handleCreateCoupon);
  }

  // Initial load
  loadDashboardStats();
});

// Tab Switcher
function adminSwitchTab(tabId) {
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach((n) => {
    n.classList.toggle('active', n.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.admin-tab-pane').forEach((p) => {
    p.classList.toggle('active', p.id === `tab-${tabId}`);
  });

  const titles = {
    dashboard: 'Executive Dashboard',
    approvals: 'Helper Verification Queue',
    users: 'User Management Directory',
    bookings: 'Platform Bookings',
    services: 'Service Catalogue Management',
    messages: 'Contact & Support Inquiries',
    complaints: 'Dispute & Complaint Handling',
    reviews: 'Customer Reviews Moderation',
    coupons: 'Promotions & Coupons',
  };
  const titleEl = document.getElementById('adminPageTitle');
  if (titleEl) titleEl.textContent = titles[tabId] || 'Admin Console';

  // Load tab-specific data
  if (tabId === 'dashboard') loadDashboardStats();
  if (tabId === 'approvals') loadPendingHelpers();
  if (tabId === 'users') loadUsers();
  if (tabId === 'bookings') loadAdminBookings();
  if (tabId === 'services') loadAdminServices();
  if (tabId === 'messages') loadContactMessages();
  if (tabId === 'complaints') loadComplaints();
  if (tabId === 'reviews') loadReviewModeration();
  if (tabId === 'coupons') loadCoupons();
}
window.adminSwitchTab = adminSwitchTab;

// 1. Dashboard Stats & Charts
async function loadDashboardStats() {
  try {
    const res = await api.get('/admin/stats');
    if (!res.success) return;

    const data = res.data;
    document.getElementById('statRevenue').textContent = window.formatCurrency(data.totalRevenue);
    document.getElementById('statBookings').textContent = data.totalBookings;
    document.getElementById('statActiveBookings').textContent = data.activeBookings;
    document.getElementById('statHelpers').textContent = data.approvedHelpers;
    document.getElementById('statPendingHelpers').textContent = data.pendingHelpers;
    document.getElementById('statCustomers').textContent = data.totalCustomers;

    // Badges
    document.getElementById('pendingApprovalBadge').textContent = data.pendingHelpers;
    document.getElementById('unreadMessagesBadge').textContent = data.unreadMessages;
    document.getElementById('openComplaintsBadge').textContent = data.openComplaints;

    // Render Charts
    renderMonthlyChart(data.monthlyBookings || {});
    renderStatusChart(data.bookingStatusCounts || {});
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function renderMonthlyChart(monthlyData) {
  const ctx = document.getElementById('monthlyBookingsChart');
  if (!ctx) return;

  const labels = Object.keys(monthlyData);
  const counts = Object.values(monthlyData);

  if (labels.length === 0) {
    labels.push('Current Month');
    counts.push(0);
  }

  if (monthlyChartInstance) monthlyChartInstance.destroy();

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Bookings Created',
          data: counts,
          backgroundColor: '#34775f',
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: '#f1f5f9' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}

function renderStatusChart(statusCounts) {
  const ctx = document.getElementById('statusDonutChart');
  if (!ctx) return;

  const labels = ['Pending', 'Accepted', 'In-Progress', 'Completed', 'Declined', 'Cancelled'];
  const values = [
    statusCounts['pending'] || 0,
    statusCounts['accepted'] || 0,
    statusCounts['in-progress'] || 0,
    statusCounts['completed'] || 0,
    statusCounts['declined'] || 0,
    statusCounts['cancelled'] || 0,
  ];

  if (statusChartInstance) statusChartInstance.destroy();

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#64748b'],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 } },
        },
      },
      cutout: '70%',
    },
  });
}

// 2. Helper Approvals Queue
let pendingHelpersList = [];

async function loadPendingHelpers() {
  const tbody = document.getElementById('pendingHelpersTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Loading pending queue...</td></tr>`;

  try {
    const res = await api.get('/admin/helpers/pending');
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">Failed to load helpers</td></tr>`;
      return;
    }

    pendingHelpersList = res.data || [];
    document.getElementById('pendingApprovalBadge').textContent = pendingHelpersList.length;

    if (pendingHelpersList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-check-circle text-success fs-4 d-block mb-2"></i> All caught up! No pending helper verifications.</td></tr>`;
      return;
    }

    tbody.innerHTML = pendingHelpersList
      .map((hp) => {
        const u = hp.user || {};
        const serviceNames = (hp.services || []).map((s) => s.service?.name).filter(Boolean).join(', ') || 'General Help';
        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                ${
                  u.avatar
                    ? `<img src="${u.avatar}" class="rounded-circle" width="36" height="36" style="object-fit:cover;">`
                    : `<div class="avatar-circle" style="width:36px; height:36px; font-size:12px;">${window.getInitials(u.fullName || 'Helper')}</div>`
                }
                <div>
                  <div class="fw-bold text-dark">${window.escapeHtml(u.fullName || 'N/A')}</div>
                  <div class="text-muted small">@${window.escapeHtml(u.username || '')}</div>
                </div>
              </div>
            </td>
            <td>
              <div><i class="bi bi-telephone text-muted me-1"></i>${u.phone || 'N/A'}</div>
              <div class="small text-muted"><i class="bi bi-envelope text-muted me-1"></i>${u.email || 'N/A'}</div>
            </td>
            <td>
              <div>${u.address?.district || 'N/A'}, ${u.address?.state || ''}</div>
              <div class="small text-muted">PIN: ${u.address?.pincode || 'N/A'}</div>
            </td>
            <td>
              <div class="small fw-semibold text-truncate" style="max-width: 180px;">${window.escapeHtml(serviceNames)}</div>
              <div class="small text-muted">${hp.experience || 0} years exp</div>
            </td>
            <td>
              ${
                hp.idProof
                  ? `<a href="${hp.idProof}" target="_blank" class="badge bg-light text-primary border text-decoration-none"><i class="bi bi-file-earmark-image me-1"></i> View ID</a>`
                  : `<span class="badge bg-secondary">No ID file</span>`
              }
            </td>
            <td class="text-end">
              <button class="btn btn-outline-primary btn-sm" onclick="openVerifyModal('${hp._id}')">
                <i class="bi bi-shield-check me-1"></i> Inspect & Verify
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadPendingHelpers = loadPendingHelpers;

function openVerifyModal(helperProfileId) {
  const hp = pendingHelpersList.find((p) => p._id === helperProfileId);
  if (!hp) return;

  const u = hp.user || {};
  document.getElementById('vHelperProfileId').value = hp._id;
  document.getElementById('vHelperName').textContent = u.fullName || 'N/A';
  document.getElementById('vHelperPhone').textContent = u.phone || 'N/A';
  document.getElementById('vHelperEmail').textContent = u.email || 'N/A';
  document.getElementById('vHelperAddress').textContent = `${u.address?.line || ''}, ${u.address?.district || ''}, ${u.address?.state || ''} - ${u.address?.pincode || ''}`;
  document.getElementById('vHelperExperience').textContent = hp.experience || 0;
  document.getElementById('vHelperLanguages').textContent = (hp.languages || []).join(', ') || 'Not specified';
  document.getElementById('vHelperBio').textContent = hp.bio || 'No bio provided';

  const servicesContainer = document.getElementById('vHelperServices');
  servicesContainer.innerHTML = (hp.services || [])
    .map((s) => `<span class="badge bg-light text-dark border me-1 mb-1">${s.service?.name || 'Service'} (₹${s.customRate || s.service?.baseRate}/day)</span>`)
    .join('');

  const imgEl = document.getElementById('vHelperIdImage');
  const linkEl = document.getElementById('vHelperIdDownloadLink');
  if (hp.idProof) {
    imgEl.src = hp.idProof;
    imgEl.style.display = 'block';
    linkEl.href = hp.idProof;
    linkEl.style.display = 'inline-block';
  } else {
    imgEl.style.display = 'none';
    linkEl.style.display = 'none';
  }

  document.getElementById('vRejectReason').value = '';

  const modal = new bootstrap.Modal(document.getElementById('helperVerifyModal'));
  modal.show();
}
window.openVerifyModal = openVerifyModal;

async function submitApproveHelper() {
  const id = document.getElementById('vHelperProfileId').value;
  if (!id) return;

  try {
    const res = await api.put(`/admin/helpers/${id}/approve`);
    if (res.success) {
      window.showAlert('Helper approved and activated successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('helperVerifyModal')).hide();
      loadPendingHelpers();
      loadDashboardStats();
    } else {
      window.showAlert(res.message || 'Approval failed', 'danger');
    }
  } catch (err) {
    window.showAlert(err.message || 'Approval error', 'danger');
  }
}
window.submitApproveHelper = submitApproveHelper;

async function submitRejectHelper() {
  const id = document.getElementById('vHelperProfileId').value;
  const reason = document.getElementById('vRejectReason').value.trim();

  try {
    const res = await api.put(`/admin/helpers/${id}/reject`, { reason });
    if (res.success) {
      window.showAlert('Helper marked as rejected.', 'warning');
      bootstrap.Modal.getInstance(document.getElementById('helperVerifyModal')).hide();
      loadPendingHelpers();
      loadDashboardStats();
    } else {
      window.showAlert(res.message || 'Action failed', 'danger');
    }
  } catch (err) {
    window.showAlert(err.message || 'Reject error', 'danger');
  }
}
window.submitRejectHelper = submitRejectHelper;

// 3. User Directory
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Loading users...</td></tr>`;

  const role = document.getElementById('userRoleFilter').value;
  const status = document.getElementById('userStatusFilter').value;
  const search = document.getElementById('userSearchInput').value.trim();

  try {
    const res = await api.get('/admin/users', { role, status, search, limit: 30 });
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">Failed to load users</td></tr>`;
      return;
    }

    const users = res.data || [];
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center py-4">No matching users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users
      .map((u) => {
        const roleBadge =
          u.role === 'admin'
            ? 'bg-danger'
            : u.role === 'helper'
            ? 'bg-success'
            : 'bg-primary';

        const statusBadge =
          u.status === 'active'
            ? 'bg-success-subtle text-success'
            : u.status === 'pending'
            ? 'bg-warning-subtle text-warning'
            : 'bg-danger-subtle text-danger';

        const isMe = adminUser && adminUser._id === u._id;

        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                ${
                  u.avatar
                    ? `<img src="${u.avatar}" class="rounded-circle" width="34" height="34" style="object-fit:cover;">`
                    : `<div class="avatar-circle" style="width:34px; height:34px; font-size:12px;">${window.getInitials(u.fullName || 'User')}</div>`
                }
                <div>
                  <div class="fw-semibold text-dark">${window.escapeHtml(u.fullName || 'N/A')}</div>
                  <div class="text-muted small">@${window.escapeHtml(u.username || '')}</div>
                </div>
              </div>
            </td>
            <td><span class="badge ${roleBadge}">${u.role.toUpperCase()}</span></td>
            <td>
              <div class="small">${u.phone || 'N/A'}</div>
              <div class="small text-muted">${u.email || 'N/A'}</div>
            </td>
            <td class="small">${u.address?.district || 'N/A'}, ${u.address?.state || ''}</td>
            <td class="small text-muted">${window.formatDate(u.createdAt)}</td>
            <td><span class="badge ${statusBadge}">${u.status.toUpperCase()}</span></td>
            <td class="text-end">
              ${
                isMe || u.role === 'admin'
                  ? `<span class="text-muted small">Protected</span>`
                  : u.status === 'active'
                  ? `<button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="toggleUserStatus('${u._id}', 'suspended')">Suspend</button>`
                  : `<button class="btn btn-outline-success btn-sm py-0 px-2" onclick="toggleUserStatus('${u._id}', 'active')">Activate</button>`
              }
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadUsers = loadUsers;

async function toggleUserStatus(userId, newStatus) {
  if (!confirm(`Are you sure you want to mark this user as ${newStatus}?`)) return;

  try {
    const res = await api.put(`/admin/users/${userId}/status`, { status: newStatus });
    if (res.success) {
      window.showAlert(`User marked as ${newStatus}.`, 'success');
      loadUsers();
    } else {
      window.showAlert(res.message || 'Status update failed', 'danger');
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  }
}
window.toggleUserStatus = toggleUserStatus;

// 4. All Bookings
async function loadAdminBookings() {
  const tbody = document.getElementById('adminBookingsTableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Loading bookings...</td></tr>`;

  const status = document.getElementById('bookingStatusFilter').value;

  try {
    const res = await api.get('/admin/bookings', { status, limit: 30 });
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center py-3">Failed to load bookings</td></tr>`;
      return;
    }

    const bookings = res.data || [];
    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-muted text-center py-4">No bookings found.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings
      .map((b) => {
        const srvNames = (b.services || []).map((s) => s.service?.name).filter(Boolean).join(', ') || 'Service';
        const stBadge = window.getStatusBadgeClass ? window.getStatusBadgeClass(b.status) : 'bg-secondary';
        const payBadge = b.payment?.status === 'completed' ? 'badge bg-success' : 'badge bg-warning text-dark';

        return `
          <tr>
            <td>
              <a href="/booking-detail.html?id=${b._id}" class="fw-bold text-dark text-decoration-none">
                #${b.bookingNumber}
              </a>
              <div class="small text-muted">${window.formatDate(b.createdAt)}</div>
            </td>
            <td>
              <div class="fw-semibold small">${window.escapeHtml(b.customer?.fullName || 'Customer')}</div>
              <div class="small text-muted">${b.customer?.phone || ''}</div>
            </td>
            <td>
              <div class="fw-semibold small">${window.escapeHtml(b.helper?.fullName || 'Helper')}</div>
              <div class="small text-muted">${b.helper?.phone || ''}</div>
            </td>
            <td class="small fw-semibold text-truncate" style="max-width: 160px;">
              ${window.escapeHtml(srvNames)}
            </td>
            <td class="small">
              ${window.formatDate(b.workFrom)}<br>
              <span class="text-muted">${b.timeSlot || ''}</span>
            </td>
            <td class="small fw-bold">${window.formatCurrency(b.pricing?.totalAmount)}</td>
            <td><span class="${payBadge}">${b.payment?.status?.toUpperCase() || 'UNPAID'}</span></td>
            <td><span class="badge ${stBadge}">${b.status.toUpperCase()}</span></td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadAdminBookings = loadAdminBookings;

// 5. Services Catalogue CRUD
let servicesList = [];

async function loadAdminServices() {
  const tbody = document.getElementById('adminServicesTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Loading catalogue...</td></tr>`;

  try {
    const res = await api.get('/services');
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">Failed to load services</td></tr>`;
      return;
    }

    servicesList = res.data || [];
    tbody.innerHTML = servicesList
      .map(
        (s) => `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <i class="bi ${s.icon || 'bi-gear'} text-primary fs-5"></i>
              <div>
                <div class="fw-bold text-dark">${window.escapeHtml(s.name)}</div>
                <div class="small text-muted">${window.escapeHtml(s.description?.substring(0, 50))}...</div>
              </div>
            </div>
          </td>
          <td><span class="badge bg-light text-dark border">${s.category || 'General'}</span></td>
          <td class="fw-bold">₹${s.baseRate}</td>
          <td class="text-muted small">per ${s.unit || 'day'}</td>
          <td>
            <span class="badge ${s.isActive ? 'bg-success' : 'bg-secondary'}">
              ${s.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-outline-secondary btn-sm py-0 px-2 me-1" onclick="openEditServiceModal('${s._id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteService('${s._id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadAdminServices = loadAdminServices;

function openAddServiceModal() {
  document.getElementById('serviceModalTitle').textContent = 'Add New Service';
  document.getElementById('serviceId').value = '';
  document.getElementById('serviceForm').reset();
  const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
  modal.show();
}
window.openAddServiceModal = openAddServiceModal;

function openEditServiceModal(serviceId) {
  const s = servicesList.find((x) => x._id === serviceId);
  if (!s) return;

  document.getElementById('serviceModalTitle').textContent = 'Edit Service';
  document.getElementById('serviceId').value = s._id;
  document.getElementById('sName').value = s.name;
  document.getElementById('sCategory').value = s.category;
  document.getElementById('sIcon').value = s.icon;
  document.getElementById('sBaseRate').value = s.baseRate;
  document.getElementById('sUnit').value = s.unit || 'day';
  document.getElementById('sDescription').value = s.description;
  document.getElementById('sIncludes').value = (s.includes || []).join('\n');

  const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
  modal.show();
}
window.openEditServiceModal = openEditServiceModal;

async function handleSaveService(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveServiceBtn');
  saveBtn.disabled = true;

  const id = document.getElementById('serviceId').value;
  const payload = {
    name: document.getElementById('sName').value.trim(),
    category: document.getElementById('sCategory').value,
    icon: document.getElementById('sIcon').value.trim(),
    baseRate: Number(document.getElementById('sBaseRate').value),
    unit: document.getElementById('sUnit').value,
    description: document.getElementById('sDescription').value.trim(),
    includes: document
      .getElementById('sIncludes')
      .value.split('\n')
      .map((x) => x.trim())
      .filter(Boolean),
  };

  try {
    let res;
    if (id) {
      res = await api.put(`/services/${id}`, payload);
    } else {
      res = await api.post('/services', payload);
    }

    if (res.success) {
      window.showAlert(`Service ${id ? 'updated' : 'created'} successfully!`, 'success');
      bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
      loadAdminServices();
    } else {
      window.showAlert(res.message || 'Operation failed', 'danger');
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteService(id) {
  if (!confirm('Are you sure you want to deactivate or remove this service?')) return;
  try {
    const res = await api.delete(`/services/${id}`);
    if (res.success) {
      window.showAlert('Service deleted', 'success');
      loadAdminServices();
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  }
}
window.deleteService = deleteService;

// 6. Contact Messages
async function loadContactMessages() {
  const tbody = document.getElementById('messagesTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Loading messages...</td></tr>`;

  try {
    const res = await api.get('/admin/messages');
    if (!res.success) return;

    const msgs = res.data || [];
    document.getElementById('unreadMessagesBadge').textContent = msgs.filter((m) => m.status === 'unread').length;

    if (msgs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No contact inquiries yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = msgs
      .map(
        (m) => `
        <tr>
          <td>
            <div class="fw-semibold text-dark">${window.escapeHtml(m.name)}</div>
            <div class="small text-muted">${m.email} | ${m.phone || 'No phone'}</div>
          </td>
          <td class="fw-semibold small">${window.escapeHtml(m.subject)}</td>
          <td class="small text-muted" style="max-width: 280px;">${window.escapeHtml(m.message)}</td>
          <td class="small text-muted">${window.formatDate(m.createdAt)}</td>
          <td>
            <span class="badge ${m.status === 'unread' ? 'bg-danger' : m.status === 'responded' ? 'bg-success' : 'bg-warning'}">
              ${m.status.toUpperCase()}
            </span>
          </td>
          <td class="text-end">
            ${
              m.status !== 'responded'
                ? `<button class="btn btn-outline-success btn-sm py-0 px-2" onclick="resolveMessage('${m._id}')">Mark Responded</button>`
                : `<span class="text-success small"><i class="bi bi-check2"></i> Closed</span>`
            }
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadContactMessages = loadContactMessages;

async function resolveMessage(id) {
  try {
    const res = await api.put(`/admin/messages/${id}`, { status: 'responded' });
    if (res.success) {
      window.showAlert('Message marked as responded.', 'success');
      loadContactMessages();
      loadDashboardStats();
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  }
}
window.resolveMessage = resolveMessage;

// 7. Complaints
async function loadComplaints() {
  const tbody = document.getElementById('complaintsTableBody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Loading complaints...</td></tr>`;

  try {
    const res = await api.get('/admin/complaints');
    if (!res.success) return;

    const complaints = res.data || [];
    document.getElementById('openComplaintsBadge').textContent = complaints.filter((c) => c.status === 'open').length;

    if (complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No open complaints found. Platform harmony is high!</td></tr>`;
      return;
    }

    tbody.innerHTML = complaints
      .map(
        (c) => `
        <tr>
          <td>
            <div class="fw-semibold small">${window.escapeHtml(c.complaintBy?.fullName || 'User')}</div>
            <div class="text-muted small">${c.complaintBy?.role?.toUpperCase()}</div>
          </td>
          <td>
            ${
              c.booking
                ? `<a href="/booking-detail.html?id=${c.booking._id}" target="_blank" class="fw-bold small text-decoration-none">#${c.booking.bookingNumber}</a>`
                : 'General'
            }
          </td>
          <td class="fw-semibold small">${window.escapeHtml(c.subject || 'Complaint')}</td>
          <td class="small text-muted" style="max-width: 260px;">${window.escapeHtml(c.description)}</td>
          <td class="small text-muted">${window.formatDate(c.createdAt)}</td>
          <td>
            <span class="badge ${c.status === 'open' ? 'bg-danger' : c.status === 'resolved' ? 'bg-success' : 'bg-warning'}">
              ${c.status.toUpperCase()}
            </span>
          </td>
          <td class="text-end">
            ${
              c.status !== 'resolved'
                ? `<button class="btn btn-outline-success btn-sm py-0 px-2" onclick="resolveComplaint('${c._id}')">Resolve</button>`
                : `<span class="text-success small"><i class="bi bi-check-all"></i> Resolved</span>`
            }
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadComplaints = loadComplaints;

async function resolveComplaint(id) {
  const notes = prompt('Enter resolution summary / action taken:');
  if (notes === null) return;

  try {
    const res = await api.put(`/admin/complaints/${id}`, { status: 'resolved', resolutionNotes: notes });
    if (res.success) {
      window.showAlert('Complaint marked as resolved.', 'success');
      loadComplaints();
      loadDashboardStats();
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  }
}
window.resolveComplaint = resolveComplaint;

// 8. Reviews Moderation
async function loadReviewModeration() {
  const tbody = document.getElementById('adminReviewsTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Loading reviews...</td></tr>`;

  try {
    const res = await api.get('/admin/reviews');
    if (!res.success) return;

    const reviews = res.data || [];
    if (reviews.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No reviews found.</td></tr>`;
      return;
    }

    tbody.innerHTML = reviews
      .map(
        (r) => `
        <tr>
          <td>${window.escapeHtml(r.customer?.fullName || 'Customer')}</td>
          <td>${window.escapeHtml(r.helper?.fullName || 'Helper')}</td>
          <td><span class="text-warning fw-bold">${r.rating} <i class="bi bi-star-fill"></i></span></td>
          <td class="small text-muted" style="max-width: 300px;">"${window.escapeHtml(r.comment)}"</td>
          <td>
            <span class="badge ${r.status === 'approved' ? 'bg-success' : r.status === 'hidden' ? 'bg-secondary' : 'bg-warning'}">
              ${r.status.toUpperCase()}
            </span>
          </td>
          <td class="text-end">
            ${
              r.status === 'approved'
                ? `<button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="setReviewStatus('${r._id}', 'hidden')">Hide</button>`
                : `<button class="btn btn-outline-success btn-sm py-0 px-2" onclick="setReviewStatus('${r._id}', 'approved')">Approve</button>`
            }
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadReviewModeration = loadReviewModeration;

async function setReviewStatus(id, newStatus) {
  try {
    const res = await api.put(`/admin/reviews/${id}`, { status: newStatus });
    if (res.success) {
      window.showAlert(`Review status updated to ${newStatus}.`, 'success');
      loadReviewModeration();
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  }
}
window.setReviewStatus = setReviewStatus;

// 9. Coupons & Offers
async function loadCoupons() {
  const tbody = document.getElementById('couponsTableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Loading coupons...</td></tr>`;

  try {
    const res = await api.get('/admin/coupons');
    if (!res.success) return;

    const coupons = res.data || [];
    if (coupons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No coupons created yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = coupons
      .map(
        (c) => `
        <tr>
          <td><span class="badge bg-light text-dark border fs-6 fw-bold">${c.code}</span></td>
          <td class="small text-capitalize">${c.discountType}</td>
          <td class="fw-bold">${c.discountType === 'percentage' ? c.discountValue + '%' : '₹' + c.discountValue}</td>
          <td class="small">₹${c.minBookingAmount || 0}</td>
          <td class="small">₹${c.maxDiscount || 0}</td>
          <td class="small text-muted">${window.formatDate(c.validTo)}</td>
          <td><span class="badge ${c.active ? 'bg-success' : 'bg-secondary'}">${c.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
          <td class="text-end">
            <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteCoupon('${c._id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center py-3">${err.message}</td></tr>`;
  }
}
window.loadCoupons = loadCoupons;

function openCreateCouponModal() {
  document.getElementById('couponForm').reset();
  const modal = new bootstrap.Modal(document.getElementById('couponModal'));
  modal.show();
}
window.openCreateCouponModal = openCreateCouponModal;

async function handleCreateCoupon(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveCouponBtn');
  saveBtn.disabled = true;

  const payload = {
    code: document.getElementById('cCode').value.trim(),
    discountType: document.getElementById('cDiscountType').value,
    discountValue: Number(document.getElementById('cDiscountValue').value),
    minBookingAmount: Number(document.getElementById('cMinBookingAmount').value),
    maxDiscount: Number(document.getElementById('cMaxDiscount').value),
    validTo: document.getElementById('cValidTo').value || null,
  };

  try {
    const res = await api.post('/admin/coupons', payload);
    if (res.success) {
      window.showAlert('Coupon code created successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('couponModal')).hide();
      loadCoupons();
    } else {
      window.showAlert(res.message || 'Failed to create coupon', 'danger');
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteCoupon(id) {
  if (!confirm('Are you sure you want to delete this coupon?')) return;
  try {
    const res = await api.delete(`/admin/coupons/${id}`);
    if (res.success) {
      window.showAlert('Coupon deleted', 'success');
      loadCoupons();
    }
  } catch (err) {
    window.showAlert(err.message, 'danger');
  }
}
window.deleteCoupon = deleteCoupon;

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
