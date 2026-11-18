# GharKaam — Production Domestic Help Marketplace 🏡

> **A real, fully working, production-quality multi-page web platform connecting households with verified domestic helpers across India.**

Built with **HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5.3, Bootstrap Icons, Node.js + Express, and MongoDB + Mongoose**.

---

## 📋 Table of Contents
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture & Directory Structure](#-architecture--directory-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start Installation](#-quick-start-installation)
- [Environment Variables (.env)](#-environment-variables-env)
- [Pre-Seeded Demo Accounts](#-pre-seeded-demo-accounts)
- [Key Workflows & Capabilities](#-key-workflows--capabilities)
- [Testing & Verification](#-testing--verification)
- [Production Deployment Guide](#-production-deployment-guide)
- [License & Media Credits](#-license--media-credits)

---

## 🌟 Key Features

1. **Role-Based Authentication & Route Protection**:
   - Secure signup and login for **Customer**, **Helper**, and **Admin** roles.
   - Passwords hashed using `bcryptjs` (salt rounds: 10).
   - Stateless JWT tokens stored strictly in **`httpOnly`, `sameSite: 'lax'` cookies** (immune to XSS and token theft).
   - Failed login lockout after 5 consecutive attempts via `express-rate-limit`.
   - Server-side and client-side guards redirecting unauthorized visitors.

2. **Full Helper Verification Lifecycle**:
   - Helper registration collects service offerings, custom daily rates, experience, languages, operating areas, bio, and government ID proof upload (Aadhaar / Voter ID).
   - New helpers are held in `status: 'pending'` and diverted to a waiting lounge (`helper-waiting.html`).
   - Admin inspects ID proofs in the **Admin Operations Console** and approves or rejects with reason before helpers appear in public search.

3. **Multi-Page Public Portal**:
   - `index.html`: Hero with dynamic search, live stats counter from DB, featured services, verified helpers, and customer reviews.
   - `services.html` & `service-detail.html?slug=`: Catalogue from database with pricing, what's included, FAQs, and helpers offering that service.
   - `helpers.html` & `helper-profile.html?id=`: Advanced filtering by service, city/district, minimum rating, budget, experience, and language.
   - `pricing.html`, `about.html`, `faq.html`, `contact.html` (stores inquiries directly to DB), `privacy.html`, `terms.html`, `404.html`.

4. **Customer Experience**:
   - `customer-dashboard.html`: Upcoming booking banner, active bookings count, spending summary, quick actions, and recent activity.
   - `book.html`: Multi-step booking wizard (Service Selection → Helper Selection → Date Range & Time Slot → Address Selection → Review & Coupon Apply → Payment Selection).
   - `my-bookings.html`: Filter by status (`all`, `pending`, `accepted`, `in-progress`, `completed`, `cancelled`), cancel with reason, or reschedule.
   - `booking-detail.html?id=`: Detailed booking timeline, helper details, integrated real-time message chat, complaint escalation, post-service review modal, and **PDF GST Tax Invoice download**.
   - `saved-helpers.html`: Quick-access bookmarks for favourite helpers.
   - `customer-profile.html`: Profile avatar upload, saved address management, wallet balance, and password management.

5. **Helper Portal**:
   - `helper-dashboard.html`: Today's jobs, live availability toggle switch, monthly earnings, average rating, and feedback submission.
   - `helper-requests.html`: Tabbed request manager (`pending`, `accepted`, `in-progress`, `completed`, `declined`) with Accept/Decline action modal.
   - `helper-schedule.html`: Visual calendar displaying scheduled domestic shifts.
   - `helper-services.html`: Enable/disable services and configure custom daily rates.
   - `helper-earnings.html`: Total earnings counter, monthly earnings bar chart, and payout logs.
   - `helper-reviews.html`: Customer feedback stream with star breakdown.
   - `helper-profile-edit.html`: Personal info, bio, languages, service areas, and password management.

6. **Executive Admin Console (`/admin/`)**:
   - **Dashboard**: Real-time business metrics (Total Revenue, Bookings, Helpers, Customers), Chart.js monthly trend chart, and booking status doughnut.
   - **Helper Approval Queue**: ID proof viewer with image zoom and one-click Approval or Rejection with feedback.
   - **User Directory**: Search, filter by role/status, and suspend/reactivate accounts.
   - **Master Bookings Log**: Full platform audit of all home service jobs and payment statuses.
   - **Service Catalogue CRUD**: Add, edit, or deactivate domestic services and rates.
   - **Contact Messages & Inquiries**: Customer inquiry inbox with status tracking and admin notes.
   - **Complaints & Dispute Resolution**: Formal escalation ticket tracking with resolution logging.
   - **Review Moderation**: Approve or hide customer reviews.
   - **Coupons & Promotions**: Create percentage or flat discount coupon codes with minimum order limits and expiry dates.

7. **Pricing Engine, Invoices & Payments**:
   - Server-enforced pricing formula: `Base Service Price * Total Days` + `5% Platform Fee` + `18% GST (CGST 9% + SGST 9%)` - `Coupon Discount` - `Wallet Deductions`.
   - Dual payment options: **Razorpay Online Checkout (Test Mode)** with HMAC signature verification OR **Pay After Service (Cash / UPI on completion)**.
   - Automated PDF Tax Invoices generated on-the-fly using `pdfkit`.

8. **Localization, PWA & Dark Mode**:
   - Multilingual support: **English**, **हिन्दी (Hindi)**, and **ગુજરાતી (Gujarati)** via `public/assets/data/translations.json`.
   - PWA ready: Web app manifest (`manifest.json`) and ServiceWorker cache (`sw.js`).
   - Dark mode toggle with persistent `localStorage` theme state.
   - Offline-resilient location selector: Ships with local Indian states & districts in `public/assets/data/locations.json`.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5.3 (CDN), Bootstrap Icons, Chart.js |
| **Backend** | Node.js (v18+), Express 4.19 |
| **Database** | MongoDB with Mongoose ODM (Works with local MongoDB or MongoDB Atlas) |
| **Authentication** | `bcryptjs` (salt 10), `jsonwebtoken` in `httpOnly` secure cookies |
| **File Uploads** | `multer` (stores avatars in `uploads/avatars/` and ID proofs in `uploads/id_proofs/`) |
| **Security & Headers**| `helmet` with custom CSP, `cors`, `express-rate-limit`, `cookie-parser` |
| **Validation** | `express-validator` on backend + Bootstrap HTML5 validation on frontend |
| **Invoices & Email** | `pdfkit` (GST Tax Invoices), `nodemailer` (with console link fallback) |

---

## 📁 Architecture & Directory Structure

```
MOM web/
├── .env                         # Active environment configuration
├── .env.example                 # Example configuration template
├── package.json                 # Dependencies and npm run scripts
├── README.md                    # Project documentation
├── scripts/
│   └── download-images.js       # Script used to fetch 14 royalty-free WebP/JPGs
├── server/
│   ├── config/
│   │   └── db.js                # MongoDB connection handler
│   ├── controllers/
│   │   ├── adminController.js   # Admin analytics, approvals, user management, coupons
│   │   ├── authController.js    # Register, login, logout, password reset, check session
│   │   ├── bookingController.js # Booking creation, lifecycle status updates, cancel/reschedule
│   │   ├── chatController.js    # In-booking customer/helper messaging
│   │   ├── contactController.js # Contact form submissions & complaints
│   │   ├── helperController.js  # Helper search, schedule, earnings, availability toggle
│   │   ├── notificationController.js # User notifications
│   │   ├── paymentController.js # Razorpay order creation, verification, invoice PDF
│   │   ├── reviewController.js  # Reviews & automatic helper rating recalculation
│   │   ├── serviceController.js # Services catalogue CRUD
│   │   └── userController.js    # Profile updates, avatar upload, addresses, favourites
│   ├── middleware/
│   │   ├── auth.js              # requireAuth and optionalAuth (checks JWT cookie)
│   │   ├── error.js             # Global central error handling
│   │   ├── rateLimiter.js       # Auth rate limiter (5 fails/15 mins) & global API limiter
│   │   ├── role.js              # requireRole('customer' | 'helper' | 'admin')
│   │   └── upload.js            # Multer diskStorage for avatars and ID proofs
│   ├── models/
│   │   ├── Address.js           # Customer saved delivery addresses
│   │   ├── Booking.js           # Master booking entity with dates, status, notes
│   │   ├── Complaint.js         # Escalation disputes against bookings
│   │   ├── ContactMessage.js    # Public contact inquiries
│   │   ├── Coupon.js            # Promotional coupon codes
│   │   ├── Favourite.js         # Customer bookmarked helpers
│   │   ├── Feedback.js          # Helper portal feedback submissions
│   │   ├── HelperProfile.js     # Verification status, services, custom rates, bio, ID proof
│   │   ├── Message.js           # In-booking chat messages
│   │   ├── Notification.js      # In-app push notifications
│   │   ├── PasswordReset.js     # Time-limited password reset tokens
│   │   ├── Payment.js           # Transaction logs, Razorpay payment ID, invoice link
│   │   ├── Review.js            # Star rating and feedback
│   │   ├── Service.js           # Domestic services catalogue
│   │   └── User.js              # Base user credentials, role, wallet balance
│   ├── routes/                  # Express route definitions mapping to controllers
│   ├── seed/
│   │   └── seed.js              # Database seed script for services, users, and bookings
│   ├── utils/
│   │   ├── email.js             # Nodemailer with development console fallback
│   │   ├── invoiceGenerator.js  # PDFKit GST tax invoice generator
│   │   ├── jwt.js               # Cookie token dispatch and cookie clearance
│   │   └── pricing.js           # Canonical fee, GST, and discount calculator
│   └── server.js                # Express app entry point, helmet, static serving, route guards
├── public/                      # Static client frontend served by Express
│   ├── admin/
│   │   ├── index.html           # Admin operations portal
│   │   └── admin.js             # Admin dashboard controller & Chart.js renderer
│   ├── assets/
│   │   ├── data/
│   │   │   ├── locations.json   # Local fallback of Indian states & districts
│   │   │   └── translations.json# English, Hindi, and Gujarati dictionaries
│   │   └── images/
│   │       ├── CREDITS.md       # Photographer credits and royalty-free licenses
│   │       ├── Gharkaam Logo.png# Brand logo
│   │       ├── favicon.png      # High-res favicon
│   │       ├── og-image.jpg     # Social share card
│   │       └── service-*.jpg    # Real photos of cooking, cleaning, utensils, etc.
│   ├── css/
│   │   └── style.css            # Custom brand styling on top of Bootstrap 5.3
│   ├── js/                      # Frontend JavaScript modules
│   │   ├── api.js               # Centralized fetch client, toasts, formatters
│   │   ├── shared.js            # Universal navbar, footer, language switcher, theme toggle
│   │   ├── index.js             # Homepage interactions & counters
│   │   ├── book.js              # Booking wizard controller
│   │   ├── booking-detail.js    # Chat, invoice download, review submission
│   │   └── ...                  # Individual page scripts
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # PWA ServiceWorker
│   ├── index.html               # Main public landing page
│   ├── about.html, services.html, helpers.html, pricing.html, faq.html, contact.html
│   ├── login.html, register.html, customer-registration.html, helper-registration.html
│   ├── customer-dashboard.html, book.html, my-bookings.html, customer-profile.html
│   └── helper-dashboard.html, helper-requests.html, helper-schedule.html, helper-services.html
└── uploads/                     # Upload directory for avatars & ID proofs
    ├── avatars/
    └── id_proofs/
```

---

## 💻 Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Either a local MongoDB instance running on `127.0.0.1:27017` OR a free cloud connection string from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

---

## 🚀 Quick Start Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd "MOM web"
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   A working `.env` file is already created. You can verify or customize it:
   ```bash
   cp .env.example .env
   ```

4. **Seed the Database:**
   Populates 8 domestic services, 1 admin, 3 customers, 5 helpers (including 1 pending approval), sample bookings, reviews, and coupons:
   ```bash
   npm run seed
   ```

5. **Start the Production / Development Server:**
   ```bash
   npm start
   ```
   *(Or for live reload during development: `npm run dev`)*

6. **Open in Browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables (.env)

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | HTTP port Express listens on | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/gharkaam` |
| `JWT_SECRET` | Secret key for signing session tokens | `gharkaam_super_secure_jwt_secret_key_2026_xyz` |
| `JWT_EXPIRES_IN`| Cookie and token validity period | `7d` |
| `RAZORPAY_KEY_ID` | Razorpay Test API Key ID | `rzp_test_GharKaamKey123` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test API Key Secret | `rzp_test_GharKaamSecretKey456` |
| `ADMIN_EMAIL` | Default administrator email for seeding | `admin@gharkaam.com` |
| `ADMIN_PASSWORD` | Default administrator password for seeding | `Admin@12345` |
| `SMTP_HOST` | *(Optional)* SMTP mail server host | `smtp.mailtrap.io` |
| `SMTP_PORT` | *(Optional)* SMTP mail server port | `2525` |
| `SMTP_USER` | *(Optional)* SMTP username | `""` |
| `SMTP_PASS` | *(Optional)* SMTP password | `""` |
| `EMAIL_FROM` | Sender address for notifications | `"GharKaam Support <support@gharkaam.com>"` |

> ℹ️ **Note on Email:** If SMTP credentials are left blank, all password reset tokens and email notifications will automatically be printed directly into the **terminal server console** with one-click test links so testing never fails.

---

## 👥 Pre-Seeded Demo Accounts

The seed script creates the following ready-to-test accounts:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Administrator** | Super Admin | `admin@gharkaam.com` | `Admin@12345` | Access to `/admin/index.html` (Approvals, Metrics, Users, Bookings) |
| **Customer** | Ananya Verma | `ananya@example.com` | `Password@123` | Active bookings, completed bookings with PDF invoice, wallet balance: ₹200 |
| **Customer** | Rahul Khanna | `rahul@example.com` | `Password@123` | Mumbai resident, has sample booking history |
| **Customer** | Priya Patel | `priya@example.com` | `Password@123` | Ahmedabad resident |
| **Helper (Approved)**| Sunita Devi | `sunita@example.com` | `Password@123` | Cooking & Kitchen maid in Mumbai, 4.9★ rating |
| **Helper (Approved)**| Ramesh Kumar | `ramesh@example.com` | `Password@123` | House cleaning & Laundry in Mumbai, 4.8★ rating |
| **Helper (Approved)**| Babita Sharma | `babita@example.com` | `Password@123` | Babysitting & Cooking in Pune, 5.0★ rating |
| **Helper (Approved)**| Rajesh Patil | `rajesh@example.com` | `Password@123` | Electrician & Plumber in Mumbai, 4.7★ rating |
| **Helper (Pending)** | Meena Bai | `meena@example.com` | `Password@123` | **Awaiting Admin Approval** (appears in `/admin/` queue for verification testing) |

### Active Promotional Coupons:
- `WELCOME50`: 50% discount up to ₹150 (Minimum order: ₹500)
- `GHAR100`: Flat ₹100 discount (Minimum order: ₹600)
- `FESTIVE20`: 20% discount up to ₹300 (Minimum order: ₹800)

---

## 🔄 Key Workflows & Capabilities

### 1. Customer Booking Workflow
1. Log in as `ananya@example.com` or navigate to `/helpers.html`.
2. Filter helpers by service (e.g. *Cooking*) or city (*Mumbai*).
3. Click **"Book Helper"** to open the wizard (`/book.html?helper=...`).
4. Select dates, time slot (*Morning 7 AM - 11 AM*), and select/enter your home address.
5. In Step 5 (Review), apply coupon code `WELCOME50` or apply wallet balance.
6. Choose payment method:
   - **Razorpay Online (Test Mode)**: Opens Razorpay checkout modal with simulated payment success and server HMAC verification.
   - **Pay After Service (Cash / UPI)**: Places booking instantly with payment status marked as `pending`.
7. Once placed, you are redirected to `/booking-detail.html?id=...` with full timeline, live chat, and invoice access.

### 2. Helper Acceptance & Service Completion Workflow
1. Log in as `sunita@example.com` and open `helper-requests.html`.
2. Click **"Accept"** on the incoming request.
3. Once service starts, click **"Start Service (In-Progress)"**.
4. When work is completed, click **"Mark as Completed"**.
5. If payment was cash on completion, helper marks payment received.

### 3. Customer Review & Rating Workflow
1. Customer returns to `/booking-detail.html?id=...`.
2. Click **"Leave a Review"** and give 1-5 stars with comments.
3. System automatically updates the review in the database and recalculates the helper's `ratingAvg` and `ratingCount` in real time.

### 4. Admin Verification Queue Workflow
1. Log in as `admin@gharkaam.com` and open the **Admin Console** (`/admin/index.html`).
2. Notice the red badge on **Helper Approvals** indicating pending partners (e.g. *Meena Bai*).
3. Click **"Inspect & Verify"** to review Meena's profile, services, and inspect her uploaded Aadhaar/ID proof document.
4. Click **"Approve & Activate Partner"**. Meena is immediately verified and now appears in the public `/helpers.html` directory!

---

## 🧪 Testing & Verification

You can test all endpoints via browser or terminal using standard `curl` commands:

### 1. Test Login & Session Cookie
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin@gharkaam.com","password":"Admin@12345"}' \
  -c cookies.txt
```

### 2. Test Fetching Public Services
```bash
curl -X GET http://localhost:3000/api/services
```

### 3. Test Helper Search with Filter
```bash
curl -X GET "http://localhost:3000/api/helpers?service=cooking&district=Mumbai"
```

### 4. Test Admin Analytics Stats (Requires Admin Cookie)
```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -b cookies.txt
```

---

## 🌐 Production Deployment Guide

### Deploying to Render / Railway / Heroku:

1. **Database:** Create a free MongoDB database cluster on [MongoDB Atlas](https://www.mongodb.com/atlas). Obtain your connection URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.xyz.mongodb.net/gharkaam?retryWrites=true&w=majority
   ```
2. **Environment Variables:** Set the following variables in your hosting provider's dashboard:
   - `NODE_ENV=production`
   - `MONGODB_URI=<your-atlas-connection-uri>`
   - `JWT_SECRET=<generate-a-strong-random-64-char-string>`
   - `RAZORPAY_KEY_ID=<your-live-or-test-key>`
   - `RAZORPAY_KEY_SECRET=<your-live-or-test-secret>`
3. **Build & Start Commands:**
   - Build command: `npm install`
   - Pre-deploy / Seed command: `npm run seed`
   - Start command: `npm start`
4. Express will serve both the REST API on `/api/*` and the static HTML/CSS/JS frontend directly on root `/`.

---

## 📜 License & Media Credits

- **Software Code:** MIT License. Built for GharKaam Services.
- **Photography & Assets:** All photography in `public/assets/images/` is royalty-free and sourced for commercial use under the Unsplash and Pexels licenses. Complete author attribution, source URLs, and resolution details are catalogued in [`public/assets/images/CREDITS.md`](file:///public/assets/images/CREDITS.md).
