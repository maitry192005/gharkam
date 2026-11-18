/**
 * Helper Earnings Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkHelperAccess();
  if (user) {
    setupSidebar(user);
    await loadEarnings();
  }
});

async function checkHelperAccess() {
  try {
    const session = await api.getMe();
    if (!session || !session.user || session.user.role !== 'helper') {
      window.location.href = '/login.html?redirect=helper-earnings.html';
      return null;
    }
    return session.user;
  } catch (e) {
    window.location.href = '/login.html?redirect=helper-earnings.html';
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

async function loadEarnings() {
  try {
    const res = await api.get('/helpers/earnings');
    if (!res.success || !res.data) return;

    const { totalEarned, totalPayments, monthlyBreakdown, recentPayments } = res.data;

    document.getElementById('earnTotal').textContent = `₹${totalEarned || 0}`;
    document.getElementById('earnTxCount').textContent = totalPayments || 0;

    // Monthly breakdown
    const mContainer = document.getElementById('monthlyBreakdownContainer');
    if (mContainer) {
      const keys = Object.keys(monthlyBreakdown || {});
      if (!keys.length) {
        mContainer.innerHTML = '<div class="col-12 text-muted small">No monthly earnings data recorded yet.</div>';
      } else {
        mContainer.innerHTML = '';
        keys.forEach((k) => {
          const col = `
            <div class="col-sm-6 col-md-4">
              <div class="p-3 bg-light rounded text-center">
                <span class="small text-muted d-block">${api.escapeHTML(k)}</span>
                <span class="fs-5 fw-bold text-success">₹${monthlyBreakdown[k]}</span>
              </div>
            </div>
          `;
          mContainer.insertAdjacentHTML('beforeend', col);
        });
      }
    }

    // Recent payments table
    const tbody = document.getElementById('earningsTableTbody');
    if (!tbody) return;

    if (!recentPayments || !recentPayments.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted small">No settled transactions yet. Complete jobs to start earning!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    recentPayments.forEach((p) => {
      const tr = `
        <tr>
          <td class="fw-bold small text-primary">${api.escapeHTML(p.invoiceNumber || 'INV')}</td>
          <td class="small">#${p.booking?.bookingNumber || 'Ref'}</td>
          <td class="small">${api.formatDate(p.paidAt || p.createdAt)}</td>
          <td><span class="badge bg-light text-dark border text-uppercase">${p.method}</span></td>
          <td><span class="badge bg-success bg-opacity-10 text-success">Completed</span></td>
          <td class="text-end fw-bold text-success">₹${p.amount}</td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', tr);
    });
  } catch (err) {
    console.error('Error loading earnings:', err);
  }
}
