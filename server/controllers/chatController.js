const Message = require('../models/Message');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

// @desc    Get chat messages for a booking
// @route   GET /api/chat/:bookingId
// @access  Private
const getBookingMessages = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isHelper = booking.helper.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isHelper && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view messages for this booking.' });
    }

    const messages = await Message.find({ booking: booking._id })
      .populate('sender', 'fullName avatar role')
      .sort({ createdAt: 1 });

    // Mark messages as read where receiver is current user
    await Message.updateMany(
      { booking: booking._id, receiver: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message on a booking thread
// @route   POST /api/chat/:bookingId
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isHelper = booking.helper.toString() === req.user._id.toString();

    if (!isCustomer && !isHelper && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to send messages on this booking.' });
    }

    const receiverId = isCustomer ? booking.helper : booking.customer;

    const newMessage = await Message.create({
      booking: booking._id,
      sender: req.user._id,
      receiver: receiverId,
      message: message.trim(),
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'fullName avatar role');

    // Notify receiver
    await Notification.create({
      user: receiverId,
      title: `New message from ${req.user.fullName} 💬`,
      message: message.length > 50 ? `${message.substring(0, 50)}...` : message,
      type: 'booking',
      link: `/booking-detail.html?id=${booking._id}`,
    });

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookingMessages,
  sendMessage,
};
