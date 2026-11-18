const calculateBookingPricing = ({
  serviceRates = [],
  workFrom,
  workTo,
  isEmergency = false,
  couponDiscount = 0,
  walletAvailable = 0,
  useWallet = false,
}) => {
  const from = new Date(workFrom);
  const to = new Date(workTo);

  // Calculate inclusive calendar days (normalized to midnight)
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, to.getTime() - from.getTime());
  const daysCount = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Sum of daily rates
  const servicesSubtotal = serviceRates.reduce((acc, curr) => acc + Number(curr.rate || 0), 0);
  const subtotal = Math.round(servicesSubtotal * daysCount);

  // 5% Platform fee
  const platformFee = Math.round(subtotal * 0.05);

  // Emergency surcharge (if requested, flat ₹200)
  const emergencySurcharge = isEmergency ? 200 : 0;

  // 18% GST on (subtotal + platformFee + emergencySurcharge)
  const taxableAmount = subtotal + platformFee + emergencySurcharge;
  const tax = Math.round(taxableAmount * 0.18);

  const grossTotal = taxableAmount + tax;

  // Coupon discount
  const discount = Math.min(grossTotal, Math.round(couponDiscount));
  const remainingBeforeWallet = Math.max(0, grossTotal - discount);

  // Wallet deduction
  let walletUsed = 0;
  if (useWallet && walletAvailable > 0) {
    walletUsed = Math.min(walletAvailable, remainingBeforeWallet);
  }

  const totalAmount = Math.max(0, remainingBeforeWallet - walletUsed);

  return {
    daysCount,
    servicesSubtotal,
    subtotal,
    platformFee,
    tax,
    emergencySurcharge,
    discount,
    walletUsed,
    totalAmount,
  };
};

module.exports = {
  calculateBookingPricing,
};
