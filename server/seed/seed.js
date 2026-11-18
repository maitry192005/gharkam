require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const HelperProfile = require('../models/HelperProfile');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Coupon = require('../models/Coupon');
const ContactMessage = require('../models/ContactMessage');
const Feedback = require('../models/Feedback');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gharkaam';
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB at ${mongoUri}`);

    // Clear existing collections
    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      HelperProfile.deleteMany({}),
      Service.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Review.deleteMany({}),
      Notification.deleteMany({}),
      Coupon.deleteMany({}),
      ContactMessage.deleteMany({}),
      Feedback.deleteMany({}),
    ]);

    // 1. Create Admin
    console.log('Seeding Admin account...');
    const admin = await User.create({
      username: 'admin',
      fullName: 'GharKaam Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@gharkaam.com',
      phone: '9876543210',
      password: process.env.ADMIN_PASSWORD || 'Admin@12345',
      role: 'admin',
      gender: 'prefer-not-to-say',
      status: 'active',
      address: {
        state: 'Delhi',
        district: 'Central Delhi',
        addressLine: 'Connaught Place, Regal Building',
        pincode: '110001',
      },
    });

    // 2. Create Core Services
    console.log('Seeding Services catalogue...');
    const servicesData = [
      {
        name: 'Cooking',
        slug: 'cooking',
        category: 'Kitchen & Dining',
        icon: 'bi-egg-fried',
        image: 'service-cooking.jpg',
        description: 'Nutritious, authentic home-cooked meals prepared with care. Options for pure vegetarian, non-vegetarian, or regional Indian cuisines tailored to your household palate.',
        whatIsIncluded: [
          'Preparation of breakfast, lunch, or dinner',
          'Rotis, sabzi, dal, rice, or regional specialties',
          'Vegetable chopping & kitchen counter tidying',
          'Dietary preference customization (low oil, diabetic-friendly, jain)',
        ],
        baseRate: 400,
        active: true,
      },
      {
        name: 'Cleaning',
        slug: 'cleaning',
        category: 'Housekeeping',
        icon: 'bi-bucket',
        image: 'service-cleaning.jpg',
        description: 'Thorough floor sweeping, damp mopping with disinfectant, dusting furniture, and maintaining pristine home hygiene everyday.',
        whatIsIncluded: [
          'Floor sweeping and wet mopping of all rooms',
          'Surface dusting of tables, counters, and shelves',
          'Trash bin clearing & basic sanitization',
          'Balcony and entryway wipe-down',
        ],
        baseRate: 350,
        active: true,
      },
      {
        name: 'Utensil Cleaning',
        slug: 'utensil-cleaning',
        category: 'Kitchen & Dining',
        icon: 'bi-cup-straw',
        image: 'service-utensils.jpg',
        description: 'Sparkling scrub-washing of pots, pans, plates, and cutlery using hygienic detergents, thoroughly rinsed and neatly stacked.',
        whatIsIncluded: [
          'Scrubbing and dishwashing of all meal utensils',
          'Burn-stain removal on cooker and kadhai pots',
          'Sink cleanup and drain basin clearing',
          'Drying and rack placement',
        ],
        baseRate: 250,
        active: true,
      },
      {
        name: 'Laundry',
        slug: 'laundry',
        category: 'Housekeeping',
        icon: 'bi-water',
        image: 'service-laundry.jpg',
        description: 'Gentle hand or machine washing of daily clothes, sun-drying, fabric conditioning, and crisp folding ready for your wardrobe.',
        whatIsIncluded: [
          'Color sorting & detergent application',
          'Washing machine operation or hand wash delicate wear',
          'Hanging clothes on clothesline / drying rack',
          'Neat folding and stack organization',
        ],
        baseRate: 300,
        active: true,
      },
      {
        name: 'Electrician',
        slug: 'electrician',
        category: 'Repairs & Maintenance',
        icon: 'bi-lightning-charge',
        image: 'service-electrician.jpg',
        description: 'Expert diagnostics and repairs for ceiling fans, switchboards, MCB circuit trips, geysers, and home lighting fixtures.',
        whatIsIncluded: [
          'Switchboard & socket replacement or wiring fix',
          'Ceiling fan, exhaust fan & tube light installation',
          'Circuit breaker & MCB trip troubleshooting',
          'Appliance electrical connection checks',
        ],
        baseRate: 500,
        active: true,
      },
      {
        name: 'Plumber',
        slug: 'plumber',
        category: 'Repairs & Maintenance',
        icon: 'bi-wrench-adjustable',
        image: 'service-plumber.jpg',
        description: 'Prompt fixing of leaking taps, blocked kitchen sinks, bathroom pipeline fittings, flush valve repairs, and water pumps.',
        whatIsIncluded: [
          'Tap and shower valve leak repairs',
          'Sink / drain unclogging and trap cleaning',
          'Flush tank repair and bibcock replacement',
          'Pipeline fitting and joint sealing',
        ],
        baseRate: 500,
        active: true,
      },
      {
        name: 'Babysitting',
        slug: 'babysitting',
        category: 'Caregiving',
        icon: 'bi-heart',
        image: 'service-babysitting.jpg',
        description: 'Warm, dependable, and attentive care for toddlers and young children while parents work or attend important commitments.',
        whatIsIncluded: [
          'Active supervision and playtime engagement',
          'Feeding assistance and snack preparation',
          'Diaper changing and hygiene assistance',
          'Safe indoor monitoring & naptime routines',
        ],
        baseRate: 450,
        active: true,
      },
      {
        name: 'Elderly Care',
        slug: 'elderly-care',
        category: 'Caregiving',
        icon: 'bi-person-hearts',
        image: 'service-elderly.jpg',
        description: 'Compassionate assistance for senior citizens: mobility support, warm companionship, timely medicine reminders, and light daily help.',
        whatIsIncluded: [
          'Walking and mobility support indoors and outdoors',
          'Daily medicine schedule reminders',
          'Warm conversation, reading, and companionship',
          'Assistance with light hydration and meals',
        ],
        baseRate: 550,
        active: true,
      },
    ];

    const services = await Service.insertMany(servicesData);
    const serviceMap = {};
    services.forEach((s) => {
      serviceMap[s.slug] = s._id;
    });

    // 3. Create Sample Customers
    console.log('Seeding Customers...');
    const customer1 = await User.create({
      username: 'ananya_v',
      fullName: 'Ananya Verma',
      email: 'ananya@example.com',
      phone: '9811223344',
      password: 'Password@123',
      role: 'customer',
      gender: 'female',
      status: 'active',
      walletBalance: 200,
      referralCode: 'ANAN1024',
      address: {
        state: 'Delhi',
        district: 'South Delhi',
        addressLine: 'A-42, Hauz Khas Enclave',
        landmark: 'Near Metro Station Gate 2',
        pincode: '110016',
        houseType: 'Apartment',
      },
    });

    const customer2 = await User.create({
      username: 'rahul_k',
      fullName: 'Rahul Khanna',
      email: 'rahul@example.com',
      phone: '9822334455',
      password: 'Password@123',
      role: 'customer',
      gender: 'male',
      status: 'active',
      walletBalance: 150,
      referralCode: 'RAHU5521',
      address: {
        state: 'Maharashtra',
        district: 'Mumbai',
        addressLine: 'Flat 802, Sea Green Heights, Bandra West',
        landmark: 'Opposite Hill Road Park',
        pincode: '400050',
        houseType: 'Apartment',
      },
    });

    const customer3 = await User.create({
      username: 'priya_sharma',
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9833445566',
      password: 'Password@123',
      role: 'customer',
      gender: 'female',
      status: 'active',
      walletBalance: 100,
      referralCode: 'PRIY8890',
      address: {
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        addressLine: 'Villa 14, Palm Meadows, Whitefield',
        landmark: 'Near Forum Shantiniketan',
        pincode: '560066',
        houseType: 'Villa',
      },
    });

    // 4. Create Sample Helpers (Approved & Pending)
    console.log('Seeding Helpers and Profiles...');
    // Helper 1: Sunita Bai (Cooking + Cleaning, South Delhi) - Approved
    const helperUser1 = await User.create({
      username: 'sunita_cook',
      fullName: 'Sunita Devi',
      email: 'sunita@example.com',
      phone: '9711001122',
      password: 'Password@123',
      role: 'helper',
      gender: 'female',
      status: 'active',
      avatar: '',
      address: {
        state: 'Delhi',
        district: 'South Delhi',
        addressLine: 'Block C, Malviya Nagar',
        pincode: '110017',
        houseType: 'Independent House',
      },
    });

    const helperProfile1 = await HelperProfile.create({
      user: helperUser1._id,
      services: [
        { service: serviceMap['cooking'], rate: 450 },
        { service: serviceMap['cleaning'], rate: 350 },
        { service: serviceMap['utensil-cleaning'], rate: 250 },
      ],
      experience: 7,
      languages: ['Hindi', 'Punjabi', 'Basic English'],
      bio: 'Expert home cook with 7+ years of experience preparing healthy North Indian, Gujarati, and Jain vegetarian meals. Very punctual and attentive to kitchen cleanliness.',
      areas: ['South Delhi', 'Hauz Khas', 'Saket', 'Malviya Nagar', 'Greater Kailash'],
      isAvailable: true,
      status: 'approved',
      verified: true,
      ratingAvg: 4.9,
      ratingCount: 24,
      totalCompletedJobs: 38,
      idProofType: 'Aadhaar',
    });

    // Helper 2: Rajesh Sharma (Electrician & Plumber, Delhi / Noida) - Approved
    const helperUser2 = await User.create({
      username: 'rajesh_tech',
      fullName: 'Rajesh Sharma',
      email: 'rajesh@example.com',
      phone: '9722112233',
      password: 'Password@123',
      role: 'helper',
      gender: 'male',
      status: 'active',
      avatar: '',
      address: {
        state: 'Delhi',
        district: 'East Delhi',
        addressLine: 'Pocket 3, Mayur Vihar Phase 1',
        pincode: '110091',
        houseType: 'Apartment',
      },
    });

    const helperProfile2 = await HelperProfile.create({
      user: helperUser2._id,
      services: [
        { service: serviceMap['electrician'], rate: 500 },
        { service: serviceMap['plumber'], rate: 500 },
      ],
      experience: 9,
      languages: ['Hindi', 'English'],
      bio: 'Certified ITI technician with 9 years of expertise handling home wiring, circuit upgrades, concealed plumbing, sanitaryware repairs, and geyser maintenance.',
      areas: ['East Delhi', 'Mayur Vihar', 'Noida (Gautam Buddha Nagar)', 'Central Delhi'],
      isAvailable: true,
      status: 'approved',
      verified: true,
      ratingAvg: 4.8,
      ratingCount: 31,
      totalCompletedJobs: 52,
      idProofType: 'Aadhaar',
    });

    // Helper 3: Lakshmi Patil (Cleaning + Laundry + Utensils, Mumbai) - Approved
    const helperUser3 = await User.create({
      username: 'lakshmi_mumbai',
      fullName: 'Lakshmi Patil',
      email: 'lakshmi@example.com',
      phone: '9733223344',
      password: 'Password@123',
      role: 'helper',
      gender: 'female',
      status: 'active',
      avatar: '',
      address: {
        state: 'Maharashtra',
        district: 'Mumbai',
        addressLine: 'Station Road, Santacruz West',
        pincode: '400054',
        houseType: 'Apartment',
      },
    });

    const helperProfile3 = await HelperProfile.create({
      user: helperUser3._id,
      services: [
        { service: serviceMap['cleaning'], rate: 400 },
        { service: serviceMap['laundry'], rate: 300 },
        { service: serviceMap['utensil-cleaning'], rate: 300 },
      ],
      experience: 5,
      languages: ['Marathi', 'Hindi', 'English'],
      bio: 'Trusted domestic helper known for meticulous cleaning, tidy garment care, and spotless kitchen dishwashing. Police-verified with spotless references.',
      areas: ['Mumbai', 'Bandra West', 'Santacruz', 'Khar', 'Juhu'],
      isAvailable: true,
      status: 'approved',
      verified: true,
      ratingAvg: 4.9,
      ratingCount: 18,
      totalCompletedJobs: 29,
      idProofType: 'Voter ID',
    });

    // Helper 4: Ramesh Kumar (Caregiving / Babysitting, Bengaluru) - Approved
    const helperUser4 = await User.create({
      username: 'ramesh_care',
      fullName: 'Ramesh Gowda',
      email: 'ramesh@example.com',
      phone: '9744334455',
      password: 'Password@123',
      role: 'helper',
      gender: 'male',
      status: 'active',
      avatar: '',
      address: {
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        addressLine: 'Indiranagar 100ft Road',
        pincode: '560038',
        houseType: 'Apartment',
      },
    });

    const helperProfile4 = await HelperProfile.create({
      user: helperUser4._id,
      services: [
        { service: serviceMap['elderly-care'], rate: 600 },
        { service: serviceMap['babysitting'], rate: 500 },
      ],
      experience: 6,
      languages: ['Kannada', 'English', 'Hindi', 'Telugu'],
      bio: 'Trained caregiver specializing in elder support, companionship, routine mobility exercises, and caring supervision for children.',
      areas: ['Bengaluru Urban', 'Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout'],
      isAvailable: true,
      status: 'approved',
      verified: true,
      ratingAvg: 5.0,
      ratingCount: 12,
      totalCompletedJobs: 20,
      idProofType: 'Driving License',
    });

    // Helper 5: Meena Joshi (Cooking + Cleaning, Ahmedabad) - Pending Approval (Test approval queue!)
    const helperUser5 = await User.create({
      username: 'meena_ahmedabad',
      fullName: 'Meena Joshi',
      email: 'meena@example.com',
      phone: '9755445566',
      password: 'Password@123',
      role: 'helper',
      gender: 'female',
      status: 'pending',
      avatar: '',
      address: {
        state: 'Gujarat',
        district: 'Ahmedabad',
        addressLine: 'Navrangpura',
        pincode: '380009',
        houseType: 'Independent House',
      },
    });

    const helperProfile5 = await HelperProfile.create({
      user: helperUser5._id,
      services: [
        { service: serviceMap['cooking'], rate: 380 },
        { service: serviceMap['cleaning'], rate: 320 },
      ],
      experience: 4,
      languages: ['Gujarati', 'Hindi'],
      bio: 'Dedicated cook and cleaner specializing in traditional Gujarati thalis and hygienic housekeeping.',
      areas: ['Ahmedabad', 'Navrangpura', 'Vastrapur', 'Bodakdev'],
      isAvailable: true,
      status: 'pending',
      verified: false,
      ratingAvg: 5.0,
      ratingCount: 0,
      totalCompletedJobs: 0,
      idProofType: 'Aadhaar',
    });

    // 5. Create Sample Coupons
    console.log('Seeding Coupons...');
    await Coupon.create([
      {
        code: 'WELCOME50',
        discountType: 'percentage',
        discountValue: 50,
        minBookingAmount: 300,
        maxDiscount: 200,
        usageLimit: 500,
        active: true,
      },
      {
        code: 'GHAR100',
        discountType: 'fixed',
        discountValue: 100,
        minBookingAmount: 500,
        maxDiscount: 100,
        usageLimit: 200,
        active: true,
      },
      {
        code: 'FESTIVE20',
        discountType: 'percentage',
        discountValue: 20,
        minBookingAmount: 600,
        maxDiscount: 350,
        usageLimit: 1000,
        active: true,
      },
    ]);

    // 6. Create Completed Booking + Payment + Review
    console.log('Seeding Sample Completed Booking and Review...');
    const pastFrom = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const pastTo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const completedBooking = await Booking.create({
      bookingNumber: 'GK-2026-8021',
      customer: customer1._id,
      helper: helperUser1._id,
      services: [
        { service: serviceMap['cooking'], rate: 450 },
        { service: serviceMap['cleaning'], rate: 350 },
      ],
      workFrom: pastFrom,
      workTo: pastTo,
      totalDays: 3,
      preferredTime: 'Morning (8:00 AM - 12:00 PM)',
      cookingDetails: {
        isCooking: true,
        preference: 'veg',
        peopleCount: 4,
      },
      address: customer1.address,
      notes: 'Please cook fresh roti and dal without too much oil.',
      pricing: {
        servicesSubtotal: 800,
        daysCount: 3,
        subtotal: 2400,
        platformFee: 120,
        tax: 454,
        discount: 200, // WELCOME50
        walletUsed: 50,
        totalAmount: 2724,
      },
      status: 'completed',
      helperResponseComment: 'Glad to assist! Work completed on time.',
      hasReview: true,
    });

    const payment = await Payment.create({
      booking: completedBooking._id,
      customer: customer1._id,
      helper: helperUser1._id,
      amount: 2724,
      method: 'razorpay',
      status: 'completed',
      invoiceNumber: 'INV-2026-440192',
      invoicePath: '',
      paidAt: pastFrom,
      razorpayOrderId: 'order_seed_001',
      razorpayPaymentId: 'pay_seed_001',
      razorpaySignature: 'sig_seed_001',
    });

    completedBooking.payment = payment._id;
    await completedBooking.save();

    await Review.create({
      booking: completedBooking._id,
      customer: customer1._id,
      helper: helperUser1._id,
      rating: 5,
      comment: 'Sunita ji is fantastic! She was extremely polite, prepared delicious ghar-ka-khana, and kept the entire kitchen immaculately clean. Highly recommended!',
      status: 'approved',
    });

    // 7. Create Active Accepted Booking
    const futureFrom = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const futureTo = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

    const activeBooking = await Booking.create({
      bookingNumber: 'GK-2026-9142',
      customer: customer2._id,
      helper: helperUser3._id,
      services: [
        { service: serviceMap['cleaning'], rate: 400 },
        { service: serviceMap['utensil-cleaning'], rate: 300 },
      ],
      workFrom: futureFrom,
      workTo: futureTo,
      totalDays: 3,
      preferredTime: 'Afternoon (1:00 PM - 5:00 PM)',
      cookingDetails: { isCooking: false, preference: 'none', peopleCount: 2 },
      address: customer2.address,
      notes: 'Bandra West society flat deep cleaning.',
      pricing: {
        servicesSubtotal: 700,
        daysCount: 3,
        subtotal: 2100,
        platformFee: 105,
        tax: 397,
        discount: 0,
        walletUsed: 0,
        totalAmount: 2602,
      },
      status: 'accepted',
      helperResponseComment: 'I have confirmed your booking and will reach promptly at 1:00 PM.',
    });

    // 8. Create Sample Contact Message
    await ContactMessage.create({
      name: 'Vikas Malhotra',
      email: 'vikas@malhotra.org',
      phone: '9899001122',
      subject: 'Inquiry regarding corporate housekeeping service',
      message: 'Hello GharKaam team, we are looking for daily verified office cleaning staff for our tech workspace in Cyber City Gurugram. Please call back.',
      status: 'unread',
    });

    // 9. Create Notifications
    await Notification.create({
      user: customer1._id,
      title: 'Booking Completed! ⭐',
      message: 'Your booking #GK-2026-8021 was marked completed. Thank you for leaving a 5-star review!',
      type: 'booking',
      read: true,
    });

    await Notification.create({
      user: helperUser1._id,
      title: 'Payment Credited ₹2,724 💰',
      message: 'Customer payment for booking #GK-2026-8021 has been settled.',
      type: 'payment',
      read: true,
    });

    console.log('✅ Database seeded successfully with production-quality sample data!');
    console.log('----------------------------------------------------');
    console.log('Admin Account:');
    console.log('  Email:    admin@gharkaam.com');
    console.log('  Password: Admin@12345');
    console.log('Customer Accounts:');
    console.log('  Email:    ananya@example.com (Password: Password@123)');
    console.log('  Email:    rahul@example.com  (Password: Password@123)');
    console.log('Helper Accounts:');
    console.log('  Email:    sunita@example.com (Approved, South Delhi)');
    console.log('  Email:    rajesh@example.com (Approved, East Delhi/Noida)');
    console.log('  Email:    meena@example.com  (Pending Approval Queue)');
    console.log('Coupons: WELCOME50, GHAR100, FESTIVE20');
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
