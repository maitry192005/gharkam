/**
 * Booking Details, Chat & Review Controller
 */

let currentBooking = null;
let chatPollingInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');

  if (!bookingId) {
    window.location.href = '/my-bookings.html';
    return;
  }

  await loadBookingDetail(bookingId);
  setupReviewModalEvents();
  setupComplaintModalEvents();
});

async function loadBookingDetail(bookingId) {
  const container = document.getElementById('bookingDetailView');
  const badgeContainer = document.getElementById('bookingStatusBadgeContainer');

  try {
    const res = await api.get(`/bookings/${bookingId}`);
    if (!res.success || !res.data) {
      container.innerHTML = `<div class="text-center py-5 text-danger">Booking not found.</div>`;
      return;
    }

    currentBooking = res.data;
    const b = currentBooking;
    const currentUser = api.getCurrentUser();
    const isCustomer = currentUser && b.customer && b.customer._id === currentUser.id;
    const isHelper = currentUser && b.helper && b.helper._id === currentUser.id;

    if (badgeContainer) {
      badgeContainer.innerHTML = `<span class="badge-status badge-${b.status} fs-6 px-3 py-1">${b.status}</span>`;
    }

    // Timeline Calculation
    const steps = ['pending', 'accepted', 'in-progress', 'completed'];
    const currentIdx = steps.indexOf(b.status);
    const isCancelled = ['declined', 'cancelled', 'expired'].includes(b.status);

    const timelineHtml = `
      <div class="p-4 bg-white gk-card mb-4 position-relative">
        <div class="timeline-connector"></div>
        <div class="d-flex justify-content-between align-items-center position-relative">
          ${steps
            .map((st, idx) => {
              const done = !isCancelled && idx <= currentIdx;
              const active = !isCancelled && idx === currentIdx;
              const colorClass = done ? 'bg-success text-white shadow-sm' : 'bg-light text-muted border';
              return `
                <div class="text-center timeline-step">
                  <div class="rounded-circle d-inline-flex align-items-center justify-content-center ${colorClass}" style="width: 40px; height: 40px; font-size: 1rem;">
                    <i class="bi ${done ? 'bi-check2' : 'bi-circle'}"></i>
                  </div>
                  <div class="small fw-semibold mt-2 text-capitalize ${active ? 'text-success fw-bold' : 'text-muted'}">${st}</div>
                </div>
              `;
            })
            .join('')}
        </div>
        ${isCancelled ? `<div class="alert alert-danger text-center small mt-3 mb-0"><strong>Status Alert:</strong> This booking has been marked <strong>${b.status}</strong>. ${b.cancellationReason || b.helperResponseComment || ''}</div>` : ''}
      </div>
    `;

    // Service List
    const servicesRows = (b.services || [])
      .map((s) => `
        <tr>
          <td><i class="bi ${s.service?.icon || 'bi-house'} text-success me-2"></i><strong>${api.escapeHTML(s.service?.name || 'Service')}</strong></td>
          <td class="text-end">₹${s.rate || 0} / day</td>
          <td class="text-center">${b.totalDays} days</td>
          <td class="text-end fw-bold">₹${(s.rate || 0) * b.totalDays}</td>
        </tr>
      `)
      .join('');

    // Parties display
    const otherParty = isCustomer ? b.helper : b.customer;
    const otherRole = isCustomer ? 'Assigned Helper' : 'Client Customer';
    const otherInitials = api.getInitials(otherParty?.fullName);
    const otherAvatar = otherParty?.avatar
      ? `<img src="${otherParty.avatar}" class="avatar-circle avatar-lg" alt="${api.escapeHTML(otherParty.fullName)}">`
      : `<div class="avatar-circle avatar-lg">${otherInitials}</div>`;

    const pr = b.pricing || {};

    container.innerHTML = `
      ${timelineHtml}

      <div class="row g-4">
        <!-- Main Details Column -->
        <div class="col-lg-8">
          <!-- Other Party Contact Card -->
          <div class="gk-card p-4 mb-4">
            <div class="d-flex align-items-center gap-3">
              ${otherAvatar}
              <div class="flex-grow-1">
                <span class="badge bg-light text-dark border small mb-1">${otherRole}</span>
                <h4 class="fw-bold mb-1">${api.escapeHTML(otherParty?.fullName || 'User')}</h4>
                <div class="text-muted small">
                  <i class="bi bi-telephone me-1 text-success"></i> ${otherParty?.phone || 'Contact visible'} &bull;
                  <i class="bi bi-geo-alt me-1 text-danger"></i> ${api.escapeHTML(b.address?.district || '')}
                </div>
              </div>
            </div>
          </div>

          <!-- Schedule & Address Card -->
          <div class="gk-card p-4 mb-4">
            <h5 class="fw-bold mb-3">Service Schedule & Location</h5>
            <div class="row g-3">
              <div class="col-md-6">
                <span class="small text-muted d-block">Scheduled Dates:</span>
                <strong>${api.formatDate(b.workFrom)} - ${api.formatDate(b.workTo)} (${b.totalDays} days)</strong>
              </div>
              <div class="col-md-6">
                <span class="small text-muted d-block">Preferred Time:</span>
                <strong>${api.escapeHTML(b.preferredTime || 'Morning')}</strong>
              </div>
              <div class="col-12">
                <span class="small text-muted d-block">Service Address:</span>
                <span>${api.escapeHTML(b.address?.addressLine || '')}, ${api.escapeHTML(b.address?.landmark ? b.address.landmark + ', ' : '')}${api.escapeHTML(b.address?.district || '')}, ${api.escapeHTML(b.address?.state || '')} - ${b.address?.pincode || ''}</span>
              </div>
              ${b.cookingDetails?.isCooking ? `
                <div class="col-12 p-3 bg-light rounded-3 mt-2">
                  <h6 class="fw-bold small text-success mb-1"><i class="bi bi-egg-fried me-1"></i> Cooking Preferences</h6>
                  <div class="small text-muted">Meal Type: <strong>${b.cookingDetails.preference.toUpperCase()}</strong> &bull; Cooking for: <strong>${b.cookingDetails.peopleCount} people</strong></div>
                </div>
              ` : ''}
              ${b.notes ? `
                <div class="col-12">
                  <span class="small text-muted d-block">Customer Notes:</span>
                  <div class="p-2 bg-light rounded text-muted small fst-italic">"${api.escapeHTML(b.notes)}"</div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Financial Breakdown Table -->
          <div class="gk-card p-4 mb-4">
            <h5 class="fw-bold mb-3">Itemized Bill & Financial Breakdown</h5>
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead class="table-light small">
                  <tr>
                    <th>Service</th>
                    <th class="text-end">Daily Rate</th>
                    <th class="text-center">Days</th>
                    <th class="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${servicesRows}
                  <tr>
                    <td colspan="3" class="text-end small">Services Subtotal:</td>
                    <td class="text-end fw-semibold">₹${pr.subtotal || 0}</td>
                  </tr>
                  ${pr.emergencySurcharge > 0 ? `
                    <tr>
                      <td colspan="3" class="text-end small text-danger">Emergency Surcharge:</td>
                      <td class="text-end text-danger fw-semibold">+₹${pr.emergencySurcharge}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td colspan="3" class="text-end small">Platform Facilitation (5%):</td>
                    <td class="text-end fw-semibold">+₹${pr.platformFee || 0}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="text-end small">GST (18%):</td>
                    <td class="text-end fw-semibold">+₹${pr.tax || 0}</td>
                  </tr>
                  ${pr.discount > 0 ? `
                    <tr class="text-success">
                      <td colspan="3" class="text-end small">Coupon Discount:</td>
                      <td class="text-end fw-semibold">-₹${pr.discount}</td>
                    </tr>
                  ` : ''}
                  ${pr.walletUsed > 0 ? `
                    <tr class="text-success">
                      <td colspan="3" class="text-end small">Wallet Credits Applied:</td>
                      <td class="text-end fw-semibold">-₹${pr.walletUsed}</td>
                    </tr>
                  ` : ''}
                  <tr class="table-success fw-bold fs-6">
                    <td colspan="3" class="text-end">Total Amount:</td>
                    <td class="text-end text-success">₹${pr.totalAmount || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- In-App Messaging / Chat Box -->
          <div class="gk-card p-4">
            <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
              <i class="bi bi-chat-dots-fill text-success"></i> Direct Chat with ${api.escapeHTML(otherParty?.fullName || 'Helper')}
            </h5>
            <div class="chat-window">
              <div class="chat-messages" id="chatMessagesBox">
                <div class="text-center text-muted small py-4">Connecting to chat thread...</div>
              </div>
              <form id="chatSendForm" class="chat-input-bar">
                <input type="text" class="form-control" id="chatMessageInput" placeholder="Type a message..." required>
                <button type="submit" class="btn btn-brand-primary btn-sm px-3">
                  <i class="bi bi-send-fill"></i>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Right: Actions Sidebar -->
        <div class="col-lg-4">
          <div class="gk-card p-4 sticky-top mb-4" style="top: 100px;">
            <h5 class="fw-bold mb-3">Booking Actions</h5>

            <!-- Invoice Download Button -->
            ${b.payment ? `
              <a href="/api/payments/invoice/${b.payment._id || b.payment}" target="_blank" class="btn btn-brand-outline w-100 mb-2 btn-sm fw-bold">
                <i class="bi bi-file-earmark-pdf-fill me-1 text-danger"></i> Download Tax Invoice (PDF)
              </a>
            ` : `
              <div class="alert alert-light border small text-muted mb-3">
                <i class="bi bi-info-circle me-1"></i> Tax invoice available upon payment.
              </div>
            `}

            <!-- Helper Actions: Accept / Decline / Complete -->
            ${isHelper && b.status === 'pending' ? `
              <button class="btn btn-success w-100 mb-2 fw-bold" onclick="respondBooking('accept')">
                <i class="bi bi-check2-circle me-1"></i> Accept Booking
              </button>
              <button class="btn btn-outline-danger w-100 mb-2 fw-bold" onclick="respondBooking('decline')">
                <i class="bi bi-x-circle me-1"></i> Decline Booking
              </button>
            ` : ''}

            ${isHelper && b.status === 'accepted' ? `
              <button class="btn btn-primary w-100 mb-2 fw-bold" onclick="updateProgress('in-progress')">
                <i class="bi bi-play-fill me-1"></i> Start Service (In-Progress)
              </button>
            ` : ''}

            ${isHelper && b.status === 'in-progress' ? `
              <button class="btn btn-success w-100 mb-2 fw-bold" onclick="updateProgress('completed')">
                <i class="bi bi-check-all me-1"></i> Mark Service Completed
              </button>
            ` : ''}

            <!-- Customer Review Action -->
            ${isCustomer && b.status === 'completed' ? `
              <button class="btn btn-warning w-100 mb-2 fw-bold text-dark" onclick="openReviewModal()" ${b.hasReview ? 'disabled' : ''}>
                <i class="bi bi-star-fill me-1"></i> ${b.hasReview ? 'Review Submitted' : 'Leave Helper Review'}
              </button>
            ` : ''}

            <!-- Customer Complaint Action -->
            <button class="btn btn-outline-secondary btn-sm w-100 mt-2" onclick="openComplaintModal()">
              <i class="bi bi-flag-fill me-1 text-danger"></i> Report an Issue
            </button>
          </div>
        </div>
      </div>
    `;

    // Start Chat Messages & Polling
    await loadChatMessages(b._id);
    startChatPolling(b._id);
    setupChatSend(b._id);
  } catch (err) {
    container.innerHTML = `<div class="text-center py-5 text-danger">${err.message}</div>`;
  }
}

// Chat Operations
async function loadChatMessages(bookingId) {
  const box = document.getElementById('chatMessagesBox');
  if (!box) return;

  try {
    const res = await api.get(`/chat/${bookingId}`);
    if (res.success && res.data) {
      if (!res.data.length) {
        box.innerHTML = `<div class="text-center text-muted small py-4">No messages yet. Send a greeting to start communicating!</div>`;
        return;
      }

      const currentUser = api.getCurrentUser();
      box.innerHTML = '';
      res.data.forEach((m) => {
        const isMine = currentUser && m.sender?._id === currentUser.id;
        const bubble = `
          <div class="chat-bubble ${isMine ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'}">
            <div class="small fw-bold" style="font-size: 0.75rem;">${isMine ? 'You' : api.escapeHTML(m.sender?.fullName || 'Helper')}</div>
            <div>${api.escapeHTML(m.message)}</div>
            <div class="text-end" style="font-size: 0.65rem; opacity: 0.8;">${api.formatDateTime(m.createdAt)}</div>
          </div>
        `;
        box.insertAdjacentHTML('beforeend', bubble);
      });
      box.scrollTop = box.scrollHeight;
    }
  } catch (e) {
    // Non-blocking
  }
}

function startChatPolling(bookingId) {
  if (chatPollingInterval) clearInterval(chatPollingInterval);
  chatPollingInterval = setInterval(() => {
    loadChatMessages(bookingId);
  }, 4000);
}

function setupChatSend(bookingId) {
  const form = document.getElementById('chatSendForm');
  const input = document.getElementById('chatMessageInput');
  if (!form || !input) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    try {
      await api.post(`/chat/${bookingId}`, { message: msg });
      await loadChatMessages(bookingId);
    } catch (err) {
      api.showToast(err.message, 'error');
    }
  });
}

// Helper Actions
window.respondBooking = async function (action) {
  if (!currentBooking) return;
  try {
    const comment = prompt(`Enter optional comment for ${action}:`) || '';
    const res = await api.put(`/bookings/${currentBooking._id}/respond`, { action, comment });
    if (res.success) {
      api.showToast(`Booking ${action}ed successfully!`, 'success');
      await loadBookingDetail(currentBooking._id);
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};

window.updateProgress = async function (status) {
  if (!currentBooking) return;
  try {
    const res = await api.put(`/bookings/${currentBooking._id}/status`, { status });
    if (res.success) {
      api.showToast(`Status updated to ${status}!`, 'success');
      await loadBookingDetail(currentBooking._id);
    }
  } catch (err) {
    api.showToast(err.message, 'error');
  }
};

// Review Modal
window.openReviewModal = function () {
  const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
  modal.show();
};

function setupReviewModalEvents() {
  const stars = document.querySelectorAll('#ratingStarsSelector i');
  const ratingInput = document.getElementById('reviewRatingVal');
  const form = document.getElementById('reviewSubmitForm');

  stars.forEach((star) => {
    star.addEventListener('click', (e) => {
      const val = parseInt(e.target.dataset.val, 10);
      if (ratingInput) ratingInput.value = val;
      stars.forEach((s) => {
        const sVal = parseInt(s.dataset.val, 10);
        s.className = sVal <= val ? 'bi bi-star-fill text-warning' : 'bi bi-star text-muted';
      });
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBooking) return;

    const rating = Number(ratingInput.value || 5);
    const comment = document.getElementById('reviewCommentText')?.value.trim();
    const submitBtn = document.getElementById('submitReviewBtn');

    submitBtn.disabled = true;
    try {
      const res = await api.post('/reviews', {
        bookingId: currentBooking._id,
        rating,
        comment,
      });
      if (res.success) {
        api.showToast('Thank you! Review published.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('reviewModal'))?.hide();
        await loadBookingDetail(currentBooking._id);
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Complaint Modal
window.openComplaintModal = function () {
  const modal = new bootstrap.Modal(document.getElementById('complaintModal'));
  modal.show();
};

function setupComplaintModalEvents() {
  const form = document.getElementById('complaintSubmitForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBooking) return;

    const subject = document.getElementById('complaintSubject')?.value;
    const description = document.getElementById('complaintDescription')?.value.trim();
    const submitBtn = document.getElementById('submitComplaintBtn');

    submitBtn.disabled = true;
    try {
      const res = await api.post('/contact/complaint', {
        bookingId: currentBooking._id,
        subject,
        description,
      });
      if (res.success) {
        api.showToast('Report submitted to customer support.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('complaintModal'))?.hide();
      }
    } catch (err) {
      api.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
