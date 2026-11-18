const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {};

    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        const setCookies = res.headers['set-cookie'];
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            setCookies,
            data: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runAcceptanceTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING GHARKAAM END-TO-END ACCEPTANCE SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Static Home Serving
    console.log('[1/7] Testing Public Web Pages & Endpoints...');
    const homeRes = await makeRequest('GET', '/');
    assert(homeRes.statusCode === 200 && typeof homeRes.data === 'string' && homeRes.data.includes('GharKaam'), 'GET / serves HTML landing page');

    const servicesRes = await makeRequest('GET', '/api/services');
    assert(servicesRes.statusCode === 200 && servicesRes.data.success && servicesRes.data.count >= 8, `GET /api/services returns ${servicesRes.data.count} services`);

    const statsRes = await makeRequest('GET', '/api/admin/public-stats');
    assert(statsRes.statusCode === 200 && statsRes.data.success && statsRes.data.data.verifiedHelpers > 0, 'GET /api/admin/public-stats returns live counter data');

    // 2. Authentication: Customer Login & Session
    console.log('\n[2/7] Testing Customer Authentication & Session Cookies...');
    const custLogin = await makeRequest('POST', '/api/auth/login', {
      login: 'ananya@example.com',
      password: 'Password@123',
    });
    assert(custLogin.statusCode === 200 && custLogin.data.success, 'Customer login succeeded');
    const custCookie = custLogin.setCookies ? custLogin.setCookies[0].split(';')[0] : null;
    assert(custCookie && custCookie.startsWith('token='), 'httpOnly JWT session cookie issued');

    const custMe = await makeRequest('GET', '/api/auth/me', null, custCookie);
    assert(custMe.statusCode === 200 && (custMe.data.data?.user?.email === 'ananya@example.com' || custMe.data.user?.email === 'ananya@example.com'), 'GET /api/auth/me identifies Ananya Verma');

    // 3. Admin Authentication & Approval Workflow
    console.log('\n[3/7] Testing Admin Operations & Helper Verification Flow...');
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      login: 'admin@gharkaam.com',
      password: 'Admin@12345',
    });
    assert(adminLogin.statusCode === 200 && (adminLogin.data.data?.user?.role === 'admin' || adminLogin.data.user?.role === 'admin'), 'Admin login succeeded');
    const adminCookie = adminLogin.setCookies[0].split(';')[0];

    const adminStats = await makeRequest('GET', '/api/admin/stats', null, adminCookie);
    assert(adminStats.statusCode === 200 && adminStats.data.success, 'Admin stats retrieved with monthly and status breakdowns');

    let pendingQueue = await makeRequest('GET', '/api/admin/helpers/pending', null, adminCookie);
    if (pendingQueue.data.data.length === 0) {
      // Register a new helper to test verification lifecycle
      const testHelperUid = `kavita_${Date.now()}`;
      await makeRequest('POST', '/api/auth/register-helper', {
        username: testHelperUid,
        fullName: 'Kavita Verma',
        email: `${testHelperUid}@example.com`,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
        services: ['cooking'],
        experience: 4,
        languages: 'Hindi, Marathi',
        areas: 'Andheri West, Bandra',
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400053',
        addressLine: 'Sector 4, Andheri',
      });
      pendingQueue = await makeRequest('GET', '/api/admin/helpers/pending', null, adminCookie);
    }

    assert(pendingQueue.statusCode === 200 && pendingQueue.data.data.length > 0, `Pending approval queue holds ${pendingQueue.data.data.length} helper(s)`);

    const pendingHelper = pendingQueue.data.data[0];
    const approveRes = await makeRequest('PUT', `/api/admin/helpers/${pendingHelper._id}/approve`, {}, adminCookie);
    assert(approveRes.statusCode === 200 && approveRes.data.success, `Approved pending helper: ${pendingHelper.user?.fullName}`);

    // Verify helper now shows in public search
    const helperSearch = await makeRequest('GET', '/api/helpers?district=Mumbai');
    assert(helperSearch.statusCode === 200 && helperSearch.data.data.length > 0, `Found ${helperSearch.data.data.length} approved helpers in Mumbai`);

    // 4. Booking Creation & Pricing Calculation
    console.log('\n[4/7] Testing Booking Creation & Server-side Pricing Engine...');
    // Find helper with populated services
    const sunita = helperSearch.data.data.find(h => h.services && h.services.length > 0 && h.services[0].service);
    console.log('Chosen helper user:', sunita.user);
    const serviceToBook = sunita.services[0].service._id || sunita.services[0].service;

    const randomOffset = 25 + Math.floor(Math.random() * 50);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + randomOffset);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + randomOffset + 2); // 3 days

    const bookingPayload = {
      helperId: sunita.user._id,
      serviceIds: [serviceToBook],
      workFrom: fromDate.toISOString().split('T')[0],
      workTo: toDate.toISOString().split('T')[0],
      preferredTime: 'Morning (07:00 AM - 11:00 AM)',
      address: {
        addressLine: 'A-204 Green Meadows, Powai',
        district: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400076',
      },
      notes: 'Please prepare South Indian breakfast and North Indian dinner.',
      couponCode: 'WELCOME50',
      paymentMethod: 'cash',
    };

    const newBookingRes = await makeRequest('POST', '/api/bookings', bookingPayload, custCookie);
    console.log('Booking creation debug:', newBookingRes.statusCode, newBookingRes.data);
    assert(newBookingRes.statusCode === 201 && newBookingRes.data.success, `Booking created successfully #${newBookingRes.data.data?.bookingNumber}`);
    const bookingId = newBookingRes.data.data?._id;
    const pricing = newBookingRes.data.data?.pricing;
    assert(pricing && pricing.daysCount === 3, 'Calculated daysCount: 3 days');
    assert(pricing && pricing.platformFee > 0 && pricing.tax > 0, `Platform fee: ₹${pricing?.platformFee}, GST Tax: ₹${pricing?.tax}`);
    assert(pricing && pricing.discount > 0, `Coupon WELCOME50 applied discount: ₹${pricing?.discount}`);

    // Confirm Pay After Service (generates Invoice & Payment record)
    const payRes = await makeRequest('POST', '/api/payments/pay-after-service', { bookingId }, custCookie);
    assert(payRes.statusCode === 200 && payRes.data.success, `Payment record created: ${payRes.data.data?.invoiceNumber}`);

    // 5. Helper Booking Lifecycle (Accept -> In-Progress -> Completed)
    console.log('\n[5/7] Testing Helper Service Lifecycle (Accept -> In-Progress -> Completed)...');
    const helperLogin = await makeRequest('POST', '/api/auth/login', {
      login: sunita.user.username,
      password: 'Password@123',
    });
    assert(helperLogin.statusCode === 200 && helperLogin.data.success, `Helper ${sunita.user.fullName} logged in`);
    const helperCookie = helperLogin.setCookies[0].split(';')[0];

    // Helper accepts booking
    const acceptRes = await makeRequest('PUT', `/api/bookings/${bookingId}/respond`, { action: 'accept' }, helperCookie);
    console.log('Accept debug:', acceptRes.statusCode, acceptRes.data);
    assert(acceptRes.statusCode === 200 && acceptRes.data.data?.status === 'accepted', 'Booking status transitioned to "accepted"');

    // Helper starts service
    const progressRes = await makeRequest('PUT', `/api/bookings/${bookingId}/status`, { status: 'in-progress' }, helperCookie);
    assert(progressRes.statusCode === 200 && progressRes.data.data.status === 'in-progress', 'Booking status transitioned to "in-progress"');

    // Helper marks completed
    const completeRes = await makeRequest('PUT', `/api/bookings/${bookingId}/status`, { status: 'completed' }, helperCookie);
    assert(completeRes.statusCode === 200 && completeRes.data.data.status === 'completed', 'Booking status transitioned to "completed"');

    // 6. Customer Review Submission & Rating Recalculation
    console.log('\n[6/7] Testing Customer Review & Automatic Rating Update...');
    const reviewRes = await makeRequest('POST', '/api/reviews', {
      bookingId: bookingId,
      rating: 5,
      comment: 'Sunita ji is wonderful! Extremely punctual, hygienic, and cooked delicious homemade food for 3 days.',
    }, custCookie);
    assert(reviewRes.statusCode === 201 && reviewRes.data.success, 'Review submitted successfully');

    // Verify helper reviews
    const helperReviews = await makeRequest('GET', `/api/reviews/helper/${sunita.user._id}`);
    assert(helperReviews.statusCode === 200 && helperReviews.data.data.length > 0, `Helper reviews count: ${helperReviews.data.data.length}`);

    // 7. Route Protection & PDF Invoice Generation
    console.log('\n[7/7] Testing Security Guards & PDF Invoice Generation...');
    // Unauthenticated access to dashboard
    const unauthDash = await makeRequest('GET', '/customer-dashboard.html');
    assert(unauthDash.statusCode === 302, 'Unauthenticated visitor to /customer-dashboard.html redirected with HTTP 302');

    // Customer trying to open admin area
    const custAdminAttempt = await makeRequest('GET', '/admin/index.html', null, custCookie);
    assert(custAdminAttempt.statusCode === 302, 'Customer attempting to open /admin/index.html redirected with HTTP 302');

    // Check PDF Invoice download
    const invoiceRes = await makeRequest('GET', `/api/payments/invoice/${bookingId}`, null, custCookie);
    assert(invoiceRes.statusCode === 200 && invoiceRes.headers['content-type'] === 'application/pdf', 'PDF Tax Invoice dynamically generated by PDFKit (content-type: application/pdf)');

    console.log('\n==================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runAcceptanceTests();
