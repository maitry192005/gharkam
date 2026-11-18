const ContactMessage = require('../models/ContactMessage');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const Booking = require('../models/Booking');
const sendEmail = require('../utils/email');

// @desc    Submit Contact Us Form
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const contactMsg = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      subject: subject.trim(),
      message: message.trim(),
      status: 'unread',
    });

    // Notify admin by email
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gharkaam.com';
    await sendEmail({
      to: adminEmail,
      subject: `New GharKaam Contact Inquiry: ${subject}`,
      text: `From: ${name} (${email}, ${phone || 'N/A'})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #26372f;">
          <h3 style="color: #245a46;">New Contact Form Message</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f7fafc; padding: 10px; border-left: 4px solid #34775f;">${message}</blockquote>
        </div>
      `,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent. Our team will contact you shortly.',
      data: contactMsg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Feedback (Helper / Customer)
// @route   POST /api/contact/feedback
// @access  Private
const submitFeedback = async (req, res, next) => {
  try {
    const { category, feedback, rating } = req.body;

    if (!feedback) {
      return res.status(400).json({ success: false, message: 'Feedback text cannot be empty.' });
    }

    const newFeedback = await Feedback.create({
      user: req.user._id,
      role: req.user.role,
      category: category || 'General',
      feedback: feedback.trim(),
      rating: Number(rating || 5),
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback! It helps us improve GharKaam.',
      data: newFeedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Complaint on Booking
// @route   POST /api/contact/complaint
// @access  Private
const submitComplaint = async (req, res, next) => {
  try {
    const { bookingId, subject, description } = req.body;

    if (!bookingId || !subject || !description) {
      return res.status(400).json({ success: false, message: 'Please provide booking ID, subject and description.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const complaint = await Complaint.create({
      booking: booking._id,
      complaintBy: req.user._id,
      subject: subject.trim(),
      description: description.trim(),
      status: 'open',
    });

    res.status(201).json({
      success: true,
      message: 'Your report has been submitted to customer safety and dispute resolution. We will follow up soon.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContactForm,
  submitFeedback,
  submitComplaint,
};
