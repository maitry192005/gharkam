/**
 * Booking Wizard & Checkout Operations
 */

let servicesList = [];
let availableHelpers = [];
let currentCustomer = null;
let appliedCouponCode = null;
let appliedDiscountAmount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  currentCustomer = await initBookingAuth();
  if (currentCustomer) {
    initDates();
    prefillCustomerAddress();
    await loadBookingServices();
    setupEventListeners();
    handleUrlPrefills();
  }
});

async function initBookingAuth() {
  try {
    const session = await api.getMe();
    if (!session || !session.user) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return null;
    }
    const user = session.user;
    if (user.role === 'helper') {
      window.location.href = '/helper-dashboard.html';
      return null;
    }
    const walletSpan = document.getElementById('availWalletSpan');
    if (walletSpan) walletSpan.textContent = `₹${user.walletBalance || 0}`;
    return user;
  } catch (e) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
}

function initDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const workFrom = document.getElementById('workFrom');
  const workTo = document.getElementById('workTo');

  if (workFrom) {
    workFrom.min = new Date().toISOString().split('T')[0];
    workFrom.value = tomorrowStr;
  }
  if (workTo) {
    workTo.min = tomorrowStr;
    workTo.value = tomorrowStr;
  }
}

function prefillCustomerAddress() {
  if (!currentCustomer) return;
  const addr = currentCustomer.address || {};
  const addrLine = document.getElementById('bookAddressLine');
  const landmark = document.getElementById('bookLandmark');
  const district = document.getElementById('bookDistrict');
  const pincode = document.getElementById('bookPincode');

  if (addrLine && addr.addressLine) addrLine.value = addr.addressLine;
  if (landmark && addr.landmark) landmark.value = addr.landmark;
  if (district && addr.district) district.value = addr.district;
  if (pincode && addr.pincode) pincode.value = addr.pincode;
}

async function loadBookingServices() {
  const container = document.getElementById('servicesCheckboxGrid');
  if (!container) return;

  try {
    const res = await api.get('/services');
    if (res.success && res.data) {
      servicesList = res.data;
      container.innerHTML = '';

      servicesList.forEach((s) => {
        const item = `
          <div class="col-md-6">
            <div class="p-3 border rounded-3 h-100 bg-white">
              <div class="form-check">
                <input class="form-check-input booking-service-chk" type="checkbox" value="${s._id}" id="chk_${s._id}" data-slug="${s.slug}" data-rate="${s.baseRate}">
                <label class="form-check-label fw-bold d-flex justify-content-between align-items-center" for="chk_${s._id}">
                  <span><i class="bi ${s.icon || 'bi-house'} text-success me-1"></i> ${api.escapeHTML(s.name)}</span>
                  <span class="text-success small">₹${s.baseRate}/day</span>
                </label>
                <div class="small text-muted mt-1" style="font-size: 0.8rem;">${api.escapeHTML(s.description.substring(0, 75))}...</div>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', item);
      });

      // Bind service change
      document.querySelectorAll('.booking-service-chk').forEach((chk) => {
        chk.addEventListener('change', async () => {
          checkCookingRequirement();
          await refreshAvailableHelpers();
          recalculatePricing();
        });
      });
    }
  } catch (err) {
    container.innerHTML = '<div class="col-12 text-danger small">Failed to load services catalogue.</div>';
  }
}

function checkCookingRequirement() {
  const isCookingChecked = Array.from(document.querySelectorAll('.booking-service-chk:checked')).some(
    (chk) => chk.dataset.slug === 'cooking'
  );
  const cookingCard = document.getElementById('cookingDetailsCard');
  if (cookingCard) {
    if (isCookingChecked) {
      cookingCard.classList.remove('d-none');
    } else {
      cookingCard.classList.add('d-none');
    }
  }
}

async function refreshAvailableHelpers() {
  const helperSelect = document.getElementById('selectedHelper');
  if (!helperSelect) return;

  const selectedServices = Array.from(document.querySelectorAll('.booking-service-chk:checked')).map(
    (chk) => chk.value
  );

  helperSelect.innerHTML = '<option value="">-- Choose an available helper --</option>';

  try {
    const res = await api.get('/helpers', { availableOnly: 'true', limit: 20 });
    if (res.success && res.data) {
      availableHelpers = res.data;

      availableHelpers.forEach((h) => {
        const u = h.user || {};
        const opt = document.createElement('option');
        opt.value = u._id;
        opt.textContent = `${u.fullName} (${u.address?.district || 'Central'}) - ${h.ratingAvg.toFixed(1)} ★ (${h.experience}+ yrs exp)`;
        helperSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn('Failed to load helpers list:', e);
  }
}

function handleUrlPrefills() {
  const urlParams = new URLSearchParams(window.location.search);
  const helperId = urlParams.get('helperId');
  const serviceId = urlParams.get('serviceId');

  if (serviceId) {
    const chk = document.getElementById(`chk_${serviceId}`);
    if (chk) {
      chk.checked = true;
      checkCookingRequirement();
    }
  }

  refreshAvailableHelpers().then(() => {
    if (helperId) {
      const helperSelect = document.getElementById('selectedHelper');
      if (helperSelect) {
        helperSelect.value = helperId;
        updateSelectedHelperDetails();
      }
    }
    recalculatePricing();
  });
}

function updateSelectedHelperDetails() {
  const helperSelect = document.getElementById('selectedHelper');
  const detailsDiv = document.getElementById('helperSelectedDetails');
  if (!helperSelect || !detailsDiv) return;

  const hId = helperSelect.value;
  const helper = availableHelpers.find((h) => h.user?._id === hId);

  if (helper) {
    const ratesText = (helper.services || [])
      .map((s) => `${s.service?.name}: ₹${s.rate}/day`)
      .join(' &bull; ');
    detailsDiv.innerHTML = `<span class="text-success fw-semibold"><i class="bi bi-patch-check-fill me-1"></i>Verified Helper:</span> ${ratesText || 'Daily service rates applicable.'}`;
  } else {
    detailsDiv.textContent = 'Select a helper to view their ratings and customized rates.';
  }
}

function calculateCalendarDays() {
  const workFromVal = document.getElementById('workFrom')?.value;
  const workToVal = document.getElementById('workTo')?.value;
  if (!workFromVal || !workToVal) return 1;

  const d1 = new Date(workFromVal);
  const d2 = new Date(workToVal);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function recalculatePricing() {
  const days = calculateCalendarDays();
  document.getElementById('calcDaysDisplay').textContent = `${days} day${days > 1 ? 's' : ''}`;
  document.getElementById('summaryDuration').textContent = `${days} day${days > 1 ? 's' : ''}`;

  const selectedCheckboxes = Array.from(document.querySelectorAll('.booking-service-chk:checked'));
  const helperSelect = document.getElementById('selectedHelper');
  const selectedHelperId = helperSelect?.value;
  const helperObj = availableHelpers.find((h) => h.user?._id === selectedHelperId);

  let dailyRateSum = 0;

  selectedCheckboxes.forEach((chk) => {
    const sId = chk.value;
    let rate = Number(chk.dataset.rate || 350);

    // If helper has customized rate for this service, use that
    if (helperObj && helperObj.services) {
      const helperServ = helperObj.services.find(
        (hs) => hs.service && (hs.service._id === sId || hs.service === sId)
      );
      if (helperServ && helperServ.rate) {
        rate = helperServ.rate;
      }
    }
    dailyRateSum += rate;
  });

  const subtotal = dailyRateSum * days;
  const isEmergency = document.getElementById('isEmergencySwitch')?.checked || false;
  const emergencySurcharge = isEmergency ? 200 : 0;

  const emergencyRow = document.getElementById('summaryEmergencyRow');
  if (emergencyRow) {
    if (isEmergency) emergencyRow.classList.remove('d-none');
    else emergencyRow.classList.add('d-none');
  }

  const platformFee = Math.round(subtotal * 0.05);
  const tax = Math.round((subtotal + platformFee + emergencySurcharge) * 0.18);
  const gross = subtotal + platformFee + emergencySurcharge + tax;

  const discount = Math.min(gross, appliedDiscountAmount);
  let totalAfterDiscount = Math.max(0, gross - discount);

  // Wallet deduction
  const useWallet = document.getElementById('useWalletSwitch')?.checked || false;
  let walletDeducted = 0;
  if (useWallet && currentCustomer && currentCustomer.walletBalance > 0) {
    walletDeducted = Math.min(currentCustomer.walletBalance, totalAfterDiscount);
    totalAfterDiscount = Math.max(0, totalAfterDiscount - walletDeducted);
  }

  // Update Summary UI
  document.getElementById('summaryDailyRate').textContent = `₹${dailyRateSum}`;
  document.getElementById('summarySubtotal').textContent = `₹${subtotal}`;
  document.getElementById('summaryPlatformFee').textContent = `₹${platformFee}`;
  document.getElementById('summaryTax').textContent = `₹${tax}`;
  document.getElementById('summaryFinalTotal').textContent = `₹${totalAfterDiscount}`;
}

function setupEventListeners() {
  const workFrom = document.getElementById('workFrom');
  const workTo = document.getElementById('workTo');
  const helperSelect = document.getElementById('selectedHelper');
  const isEmergencySwitch = document.getElementById('isEmergencySwitch');
  const useWalletSwitch = document.getElementById('useWalletSwitch');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const form = document.getElementById('bookingWizardForm');

  workFrom?.addEventListener('change', () => {
    if (workTo && workTo.value < workFrom.value) {
      workTo.value = workFrom.value;
    }
    recalculatePricing();
  });

  workTo?.addEventListener('change', recalculatePricing);
  isEmergencySwitch?.addEventListener('change', recalculatePricing);
  useWalletSwitch?.addEventListener('change', recalculatePricing);

  helperSelect?.addEventListener('change', () => {
    updateSelectedHelperDetails();
    recalculatePricing();
  });

  // Apply Coupon Code
  applyCouponBtn?.addEventListener('click', async () => {
    const code = document.getElementById('couponCodeInput')?.value.trim();
    const msgDiv = document.getElementById('couponMessage');
    if (!code) return;

    try {
      const res = await api.post('/bookings/validate-coupon', {
        code,
        amount: calculateCalendarDays() * 500, // approximate estimate
      });
      if (res.success && res.data) {
        appliedCouponCode = res.data.code;
        appliedDiscountAmount = res.data.discount;
        msgDiv.className = 'small mt-1 text-success fw-bold';
        msgDiv.textContent = `Coupon ${res.data.code} applied! ₹${res.data.discount} discount deducted.`;
        recalculatePricing();
        api.showToast(`Coupon ${res.data.code} applied!`, 'success');
      }
    } catch (err) {
      appliedCouponCode = null;
      appliedDiscountAmount = 0;
      msgDiv.className = 'small mt-1 text-danger';
      msgDiv.textContent = err.message || 'Invalid or expired coupon code.';
      recalculatePricing();
    }
  });

  // Wizard Submission
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');

    const selectedServiceIds = Array.from(document.querySelectorAll('.booking-service-chk:checked')).map(
      (chk) => chk.value
    );

    const alertBox = document.getElementById('bookingAlert');
    const submitBtn = document.getElementById('bookSubmitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    if (selectedServiceIds.length === 0) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = 'Please choose at least one household service.';
      alertBox.classList.remove('d-none');
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    const helperId = document.getElementById('selectedHelper').value;
    if (!helperId) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = 'Please select a verified helper.';
      alertBox.classList.remove('d-none');
      return;
    }

    if (!form.checkValidity()) {
      return;
    }

    const isCooking = selectedServiceIds.some(
      (sId) => servicesList.find((s) => s._id === sId)?.slug === 'cooking'
    );

    const bookingPayload = {
      helperId,
      serviceIds: selectedServiceIds,
      workFrom: document.getElementById('workFrom').value,
      workTo: document.getElementById('workTo').value,
      preferredTime: document.getElementById('preferredTime').value,
      cookingDetails: {
        isCooking,
        preference: document.getElementById('cookingPref')?.value || 'both',
        peopleCount: Number(document.getElementById('cookingPeople')?.value || 2),
      },
      address: {
        addressLine: document.getElementById('bookAddressLine').value.trim(),
        landmark: document.getElementById('bookLandmark').value.trim(),
        district: document.getElementById('bookDistrict').value.trim(),
        state: currentCustomer?.address?.state || 'Local State',
        pincode: document.getElementById('bookPincode').value.trim(),
      },
      notes: document.getElementById('bookNotes').value.trim(),
      couponCode: appliedCouponCode || undefined,
      useWallet: document.getElementById('useWalletSwitch')?.checked || false,
      isEmergency: document.getElementById('isEmergencySwitch')?.checked || false,
      isRecurring: document.getElementById('isRecurringSwitch')?.checked || false,
      recurringType: document.getElementById('isRecurringSwitch')?.checked ? 'daily' : 'none',
    };

    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    alertBox.classList.add('d-none');

    try {
      // 1. Create Booking in DB
      const res = await api.post('/bookings', bookingPayload);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to place booking.');
      }

      const booking = res.data;
      const paymentMode = document.querySelector('input[name="paymentMethodRadio"]:checked')?.value || 'razorpay';

      // 2. Process Payment
      if (paymentMode === 'razorpay') {
        // Create order
        const orderRes = await api.post('/payments/create-order', { bookingId: booking._id });
        const orderData = orderRes.data;

        // In test mode: verify payment and generate invoice
        const verifyRes = await api.post('/payments/verify', {
          bookingId: booking._id,
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          razorpaySignature: 'simulated_test_signature_valid',
        });

        api.showToast('Payment verified & booking placed successfully!', 'success');
        setTimeout(() => {
          window.location.href = `/booking-detail.html?id=${booking._id}`;
        }, 1000);
      } else {
        // Pay after service (Cash)
        await api.post('/payments/pay-after-service', { bookingId: booking._id });
        api.showToast('Booking confirmed with Pay After Service!', 'success');
        setTimeout(() => {
          window.location.href = `/booking-detail.html?id=${booking._id}`;
        }, 1000);
      }
    } catch (err) {
      alertBox.className = 'alert alert-danger show';
      alertBox.textContent = err.message || 'Failed to complete booking. Please try again.';
      alertBox.classList.remove('d-none');
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  });
}
