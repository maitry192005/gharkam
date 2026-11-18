const nodemailer = require('nodemailer');

// Initialize Transporter
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (emailUser && emailPass) {
    if (process.env.SMTP_SERVICE === 'gmail' || emailUser.includes('@gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
        port: Number(process.env.SMTP_PORT) || 2525,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    }
  }

  return transporter;
};

// Base Email Wrapper Layout
const wrapEmailTemplate = ({ title, preheader, bodyHtml, ctaText, ctaUrl }) => {
  const ctaButton = ctaText && ctaUrl
    ? `
      <div style="text-align: center; margin: 32px 0 20px;">
        <a href="${ctaUrl}" style="background-color: #34775f; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(52, 119, 95, 0.3);">
          ${ctaText} &rarr;
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; -webkit-text-size-adjust: none; }
        .email-container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e5e9ec; }
        .header { background: #245a46; padding: 28px 30px; text-align: center; }
        .logo-text { color: #ffffff; font-size: 24px; font-weight: bold; text-decoration: none; letter-spacing: -0.5px; }
        .logo-sub { color: #a9cfc1; font-size: 12px; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
        .content { padding: 36px 32px; color: #2d3748; line-height: 1.6; font-size: 15px; }
        .footer { background: #f8fafb; padding: 24px 30px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
        .footer a { color: #34775f; text-decoration: underline; }
        .detail-box { background: #f7faf8; border: 1px solid #e2ebe5; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
        .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 14px; text-transform: uppercase; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-info { background: #e0f2fe; color: #075985; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${preheader || title}
      </div>
      <div class="email-container">
        <!-- Brand Header -->
        <div class="header">
          <div class="logo-text">🏡 GharKaam</div>
          <div class="logo-sub">India's Domestic Help Marketplace</div>
        </div>

        <!-- Main Body -->
        <div class="content">
          ${bodyHtml}
          ${ctaButton}
        </div>

        <!-- Support Footer -->
        <div class="footer">
          <p style="margin: 0 0 8px;">Need assistance? Email us at <a href="mailto:support@gharkaam.com">support@gharkaam.com</a> or call +91 98765 43210.</p>
          <p style="margin: 0;">&copy; 2026 GharKaam Services Pvt Ltd. All rights reserved.<br>Bandra Kurla Complex, Mumbai, Maharashtra 400051</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generic Send Email Function
const sendEmail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();

  if (mailer) {
    try {
      const from = process.env.EMAIL_FROM || `"GharKaam Support" <${process.env.EMAIL_USER || 'matrixx1904@gmail.com'}>`;
      const info = await mailer.sendMail({
        from,
        to,
        subject,
        text: text || subject,
        html,
      });

      console.log(`[Email Sent Successfully] ID: ${info.messageId} to ${to}`);
      return info;
    } catch (error) {
      console.error(`[Email Sending Error] Failed to send to ${to}: ${error.message}`);
    }
  }

  // Fallback to console log if transporter is not available or fails
  console.log('====================================================');
  console.log(`[EMAIL DISPATCH - CONSOLE SIMULATION]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text || 'HTML Email Body Delivered'}`);
  console.log('====================================================');
  return { simulated: true };
};

// 1. Welcome Email for Customer
const sendCustomerWelcomeEmail = async (user) => {
  const html = wrapEmailTemplate({
    title: 'Welcome to GharKaam!',
    preheader: 'Find trusted, verified cooks, cleaners, and maids for your home.',
    bodyHtml: `
      <h2 style="color: #245a46; margin-top: 0;">Namaste ${user.fullName}, Welcome to GharKaam! 🏡</h2>
      <p>We are thrilled to welcome you to India's most dependable domestic help network. Whether you need a daily home cook, thorough house cleaning, delicate laundry care, or quick repairs, verified household partners are just a click away.</p>
      
      <div class="detail-box">
        <h4 style="margin: 0 0 10px; color: #245a46;">✨ Your New Account Details</h4>
        <p style="margin: 4px 0;"><strong>Username:</strong> @${user.username}</p>
        <p style="margin: 4px 0;"><strong>Registered Email:</strong> ${user.email}</p>
        <p style="margin: 4px 0;"><strong>Welcome Wallet Bonus:</strong> ₹${user.walletBalance || 0}</p>
      </div>

      <p><strong>3 Quick Steps to Get Started:</strong></p>
      <ol style="padding-left: 20px; line-height: 1.8;">
        <li><strong>Browse Verified Helpers:</strong> Search cooks, maids, plumbers & electricians by your city.</li>
        <li><strong>Choose Schedule:</strong> Pick dates and preferred shift hours (Morning, Afternoon, or Evening).</li>
        <li><strong>Book & Relax:</strong> Pay seamlessly with Razorpay online or choose Cash After Service.</li>
      </ol>
    `,
    ctaText: 'Find Helpers Near You',
    ctaUrl: 'http://localhost:3000/helpers.html',
  });

  return sendEmail({
    to: user.email,
    subject: 'Welcome to GharKaam! 🏡 Your domestic help is one click away',
    html,
    text: `Namaste ${user.fullName}, Welcome to GharKaam! Browse verified domestic cooks, cleaners, and maids at http://localhost:3000/helpers.html`,
  });
};

// 2. Welcome Email for Helper
const sendHelperWelcomeEmail = async (user) => {
  const html = wrapEmailTemplate({
    title: 'Welcome to the GharKaam Service Partner Community!',
    preheader: 'Your helper registration has been received and is under review.',
    bodyHtml: `
      <h2 style="color: #245a46; margin-top: 0;">Welcome, ${user.fullName}! 🤝</h2>
      <p>Thank you for registering as a domestic service partner with GharKaam. We are dedicated to providing you with respectful households, dignified work, and transparent daily earnings.</p>
      
      <div class="detail-box">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <h4 style="margin: 0; color: #245a46;">Application Status</h4>
          <span class="badge badge-warning">Under Review</span>
        </div>
        <p style="margin: 4px 0;">Our safety and admin team is verifying your government ID proof and address details. Most applications are approved within <strong>24 business hours</strong>.</p>
      </div>

      <p>Once approved, your profile will immediately appear in local customer searches and you will receive booking requests directly on your helper dashboard.</p>
    `,
    ctaText: 'View Helper Portal',
    ctaUrl: 'http://localhost:3000/helper-dashboard.html',
  });

  return sendEmail({
    to: user.email,
    subject: 'Application Received - Welcome to GharKaam Partners 🤝',
    html,
    text: `Hello ${user.fullName}, thank you for registering with GharKaam. Your profile and ID are under review. Once approved, you can start accepting jobs at http://localhost:3000/helper-dashboard.html`,
  });
};

// 3. New Booking Notification sent to Helper
const sendNewBookingToHelperEmail = async (helperUser, customerUser, booking) => {
  const serviceList = (booking.services || []).map((s) => s.service?.name || 'Service').join(', ');
  const fromStr = new Date(booking.workFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const toStr = new Date(booking.workTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const html = wrapEmailTemplate({
    title: `New Booking Request #${booking.bookingNumber}`,
    preheader: `You have received a new service booking request from ${customerUser.fullName}.`,
    bodyHtml: `
      <h2 style="color: #245a46; margin-top: 0;">New Job Request Received! 🔔</h2>
      <p>Hello ${helperUser.fullName}, customer <strong>${customerUser.fullName}</strong> has selected your profile for a domestic service booking.</p>

      <div class="detail-box">
        <h4 style="margin: 0 0 12px; color: #245a46; border-bottom: 1px solid #d8e5dc; padding-bottom: 6px;">
          Booking #${booking.bookingNumber}
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Services:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${serviceList}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Schedule:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${fromStr} to ${toStr} (${booking.totalDays} days)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Time Slot:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.preferredTime || 'Morning'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Location:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.address?.district || 'Local'}, ${booking.address?.state || ''} (${booking.address?.pincode || ''})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Customer Payout:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #166534; font-size: 16px; text-align: right;">₹${booking.pricing?.subtotal || booking.pricing?.totalAmount}</td>
          </tr>
        </table>
      </div>

      ${booking.notes ? `<p style="background: #fff8eb; border-left: 4px solid #f59e0b; padding: 10px 14px; font-size: 14px; margin: 15px 0;"><strong>Customer Note:</strong> "${booking.notes}"</p>` : ''}

      <p style="font-size: 13px; color: #718096;">Please accept or decline this request promptly so the household can prepare for your arrival.</p>
    `,
    ctaText: 'Review & Respond to Request',
    ctaUrl: `http://localhost:3000/helper-requests.html`,
  });

  return sendEmail({
    to: helperUser.email,
    subject: `🔔 New Booking Request #${booking.bookingNumber} from ${customerUser.fullName}`,
    html,
    text: `Hello ${helperUser.fullName}, you have a new booking request #${booking.bookingNumber} from ${customerUser.fullName} for ${serviceList}. Review details and respond at http://localhost:3000/helper-requests.html`,
  });
};

// 4. Booking Placed Confirmation sent to Customer
const sendBookingPlacedToCustomerEmail = async (customerUser, helperUser, booking) => {
  const serviceList = (booking.services || []).map((s) => s.service?.name || 'Service').join(', ');
  const fromStr = new Date(booking.workFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const toStr = new Date(booking.workTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const html = wrapEmailTemplate({
    title: `Booking Confirmation #${booking.bookingNumber}`,
    preheader: `Your booking request for ${serviceList} has been placed.`,
    bodyHtml: `
      <h2 style="color: #245a46; margin-top: 0;">Booking Request Placed! 📋</h2>
      <p>Hello ${customerUser.fullName}, thank you for your booking. We have notified <strong>${helperUser.fullName}</strong> about your home service request.</p>

      <div class="detail-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; color: #245a46;">Booking #${booking.bookingNumber}</h4>
          <span class="badge badge-warning">Awaiting Helper Confirmation</span>
        </div>
        <p style="margin: 4px 0;"><strong>Helper:</strong> ${helperUser.fullName} (${helperUser.phone})</p>
        <p style="margin: 4px 0;"><strong>Service(s):</strong> ${serviceList}</p>
        <p style="margin: 4px 0;"><strong>Dates:</strong> ${fromStr} to ${toStr} (${booking.totalDays} day${booking.totalDays > 1 ? 's' : ''})</p>
        <p style="margin: 4px 0;"><strong>Total Amount:</strong> ₹${booking.pricing?.totalAmount}</p>
      </div>

      <p>You can chat directly with your helper and track real-time status on your booking page.</p>
    `,
    ctaText: 'View Booking & Chat',
    ctaUrl: `http://localhost:3000/booking-detail.html?id=${booking._id}`,
  });

  return sendEmail({
    to: customerUser.email,
    subject: `📋 Booking Request Placed #${booking.bookingNumber} with ${helperUser.fullName}`,
    html,
    text: `Hello ${customerUser.fullName}, your booking #${booking.bookingNumber} with ${helperUser.fullName} for ${serviceList} has been placed. View details at http://localhost:3000/booking-detail.html?id=${booking._id}`,
  });
};

// 5. Booking Accepted Notification sent to Customer
const sendBookingAcceptedEmail = async (customerUser, helperUser, booking) => {
  const serviceList = (booking.services || []).map((s) => s.service?.name || 'Service').join(', ');

  const html = wrapEmailTemplate({
    title: `Booking Accepted! #${booking.bookingNumber}`,
    preheader: `${helperUser.fullName} has accepted your service booking request.`,
    bodyHtml: `
      <h2 style="color: #166534; margin-top: 0;">Good News! Booking Accepted 🎉</h2>
      <p>Hello ${customerUser.fullName}, your household helper <strong>${helperUser.fullName}</strong> has confirmed and accepted your booking #${booking.bookingNumber}.</p>

      <div class="detail-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; color: #166534;">Booking Confirmed</h4>
          <span class="badge badge-success">Accepted</span>
        </div>
        <p style="margin: 4px 0;"><strong>Partner:</strong> ${helperUser.fullName}</p>
        <p style="margin: 4px 0;"><strong>Direct Phone:</strong> <a href="tel:${helperUser.phone}">${helperUser.phone}</a></p>
        <p style="margin: 4px 0;"><strong>Services:</strong> ${serviceList}</p>
        <p style="margin: 4px 0;"><strong>Shift Slot:</strong> ${booking.preferredTime || 'Morning'}</p>
        ${booking.helperResponseComment ? `<p style="margin: 4px 0; color: #166534;"><em>Helper Message: "${booking.helperResponseComment}"</em></p>` : ''}
      </div>

      <p>You can message your helper directly via our in-app chat thread to coordinate instructions or special meal recipes.</p>
    `,
    ctaText: 'Open Chat & Details',
    ctaUrl: `http://localhost:3000/booking-detail.html?id=${booking._id}`,
  });

  return sendEmail({
    to: customerUser.email,
    subject: `🎉 Booking Confirmed! ${helperUser.fullName} accepted #${booking.bookingNumber}`,
    html,
    text: `Hello ${customerUser.fullName}, ${helperUser.fullName} has accepted your booking #${booking.bookingNumber}. Contact: ${helperUser.phone}. View details at http://localhost:3000/booking-detail.html?id=${booking._id}`,
  });
};

// 6. Booking Declined / Cancelled Notification sent to Customer
const sendBookingDeclinedEmail = async (customerUser, helperUser, booking, comment) => {
  const html = wrapEmailTemplate({
    title: `Booking Update: Request Declined #${booking.bookingNumber}`,
    preheader: `${helperUser.fullName} was unable to accept your booking.`,
    bodyHtml: `
      <h2 style="color: #991b1b; margin-top: 0;">Booking Update ⚠️</h2>
      <p>Hello ${customerUser.fullName}, we regret to inform you that <strong>${helperUser.fullName}</strong> is unavailable and could not accept your booking #${booking.bookingNumber}.</p>

      <div class="detail-box">
        <h4 style="margin: 0 0 8px; color: #991b1b;">Reason Provided:</h4>
        <p style="margin: 4px 0; font-style: italic;">"${comment || 'Helper is currently booked or unavailable for the requested schedule.'}"</p>
      </div>

      <p><strong>What happens next?</strong><br>
      Any wallet credits applied have been automatically refunded to your balance. You can immediately choose another top-rated helper in your area.</p>
    `,
    ctaText: 'Find Another Helper',
    ctaUrl: 'http://localhost:3000/helpers.html',
  });

  return sendEmail({
    to: customerUser.email,
    subject: `⚠️ Update on Booking #${booking.bookingNumber} - Helper Unavailable`,
    html,
    text: `Hello ${customerUser.fullName}, ${helperUser.fullName} was unable to accept booking #${booking.bookingNumber}. Reason: ${comment || 'Unavailable'}. Find another helper at http://localhost:3000/helpers.html`,
  });
};

// 7. Booking Completed: Invite Customer to Leave Review
const sendBookingCompletedEmail = async (customerUser, helperUser, booking) => {
  const html = wrapEmailTemplate({
    title: `Service Completed! Rate ${helperUser.fullName}`,
    preheader: `Your booking #${booking.bookingNumber} is complete. How was your experience?`,
    bodyHtml: `
      <h2 style="color: #245a46; margin-top: 0;">Service Completed! ⭐</h2>
      <p>Hello ${customerUser.fullName}, your domestic service booking #${booking.bookingNumber} with <strong>${helperUser.fullName}</strong> has been marked completed.</p>

      <div class="detail-box" style="text-align: center; padding: 24px 20px;">
        <h3 style="margin: 0 0 8px; color: #245a46;">How was your experience?</h3>
        <p style="margin: 0 0 16px; color: #64748b;">Your honest rating empowers domestic helpers and helps other households make confident hiring decisions.</p>
        <div style="font-size: 24px; color: #f59e0b; margin-bottom: 8px;">
          ⭐⭐⭐⭐⭐
        </div>
      </div>

      <p style="font-size: 13px; color: #718096;">You can also download your official GST Tax Invoice from the booking details screen.</p>
    `,
    ctaText: 'Leave a Review for ' + helperUser.fullName,
    ctaUrl: `http://localhost:3000/booking-detail.html?id=${booking._id}`,
  });

  return sendEmail({
    to: customerUser.email,
    subject: `⭐ How was your service with ${helperUser.fullName}? (#${booking.bookingNumber})`,
    html,
    text: `Hello ${customerUser.fullName}, your service #${booking.bookingNumber} with ${helperUser.fullName} is complete. Please take 30 seconds to leave a review at http://localhost:3000/booking-detail.html?id=${booking._id}`,
  });
};

// 8. New Review Notification sent to Helper
const sendNewReviewToHelperEmail = async (helperUser, customerUser, review, booking) => {
  let stars = '';
  for (let i = 0; i < review.rating; i++) stars += '⭐';

  const html = wrapEmailTemplate({
    title: `You Received a ${review.rating}-Star Review! ⭐`,
    preheader: `${customerUser.fullName} left a review for booking #${booking?.bookingNumber || ''}`,
    bodyHtml: `
      <h2 style="color: #245a46; margin-top: 0;">Congratulations ${helperUser.fullName}! 🎉</h2>
      <p>Customer <strong>${customerUser.fullName}</strong> has submitted feedback for your service.</p>

      <div class="detail-box" style="text-align: center; padding: 22px 18px;">
        <div style="font-size: 28px; margin-bottom: 6px;">${stars}</div>
        <div style="font-size: 18px; font-weight: bold; color: #b45309; margin-bottom: 12px;">${review.rating} / 5.0 Rating</div>
        <p style="margin: 0; font-size: 15px; color: #334155; font-style: italic;">"${review.comment}"</p>
      </div>

      <p style="font-size: 13px; color: #64748b;">Great work! Consistent 5-star ratings increase your profile visibility in top search results on GharKaam.</p>
    `,
    ctaText: 'View All My Reviews',
    ctaUrl: 'http://localhost:3000/helper-reviews.html',
  });

  return sendEmail({
    to: helperUser.email,
    subject: `⭐ New ${review.rating}-Star Review from ${customerUser.fullName}!`,
    html,
    text: `Hello ${helperUser.fullName}, ${customerUser.fullName} left you a ${review.rating}-star review: "${review.comment}". View your feedback at http://localhost:3000/helper-reviews.html`,
  });
};

module.exports = {
  sendEmail,
  sendCustomerWelcomeEmail,
  sendHelperWelcomeEmail,
  sendNewBookingToHelperEmail,
  sendBookingPlacedToCustomerEmail,
  sendBookingAcceptedEmail,
  sendBookingDeclinedEmail,
  sendBookingCompletedEmail,
  sendNewReviewToHelperEmail,
};
