# 🏥 PostVisit — AI-Powered Healthcare Platform

> Upload medical reports. Get AI-powered insights. Track your health. Chat with your doctor's AI.

![PostVisit Banner](https://via.placeholder.com/1200x400/1a6b8a/ffffff?text=PostVisit+Healthcare+Platform)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth System** | JWT + bcrypt, role-based access (user/admin), secure sessions |
| 📄 **Report Upload** | PDF + image uploads via Cloudinary with signed URLs |
| 🤖 **AI Analysis** | OpenAI GPT-4 + intelligent mock engine — summaries, findings, recommendations |
| 🔬 **OCR Extraction** | Auto-extract blood sugar, cholesterol, hemoglobin, BP from reports |
| 📊 **Health Dashboard** | 4 Chart.js charts — trends in sugar, cholesterol, hemoglobin, BP |
| 💬 **AI Chatbot** | Context-aware health chatbot with chat history per session |
| ⚠️ **Risk Prediction** | Rule-based engine for diabetes, heart disease, anemia, kidney risk |
| 🔔 **Smart Reminders** | Medication reminders + follow-up alerts via email + in-app |
| 📑 **PDF Export** | Downloadable health reports with analysis, risk assessment, advice |
| 📉 **CSV Export** | Export all health metrics as CSV |
| 🛡️ **Security** | Helmet.js, rate limiting, NoSQL sanitization, audit logs, signed URLs |
| 👨‍💼 **Admin Panel** | User management, audit log viewer, system stats |
| 🌙 **Dark Mode** | Full dark/light theme toggle |
| 📱 **Responsive** | Mobile-first design |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) Cloudinary account
- (Optional) OpenAI API key

### Installation

```bash
# 1. Clone and enter directory
git clone <your-repo>
cd postvisit

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your values (minimum: MONGODB_URI + JWT_SECRET)

# 4. Seed demo data
npm run seed

# 5. Start development server
npm run dev
```

### Minimum .env (no cloud services required)
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/postvisit
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
SESSION_SECRET=your_session_secret_key
```

### Demo Credentials (after seeding)
| Role | Email | Password |
|---|---|---|
| Admin | admin@postvisit.health | Admin@123456 |
| Patient | demo@postvisit.health | Demo@123456 |

---

## 📁 Project Structure

```
postvisit/
├── app.js                          # Express app + server entry
├── package.json
├── .env.example
│
├── config/
│   ├── database.js                 # MongoDB connection
│   └── cloudinary.js               # Cloudinary + Multer config
│
├── models/
│   ├── User.js                     # User schema (auth, profile, health info)
│   ├── Report.js                   # Medical report + extracted values
│   ├── Analysis.js                 # AI analysis results
│   └── index.js                    # Notification, HealthMetrics, ChatMessage, AuditLog, Medication
│
├── controllers/
│   ├── authController.js           # Register, login, logout, profile
│   ├── reportController.js         # Upload, view, delete, export
│   ├── dashboardController.js      # Analytics, chart data
│   └── chatController.js           # AI chatbot with context
│
├── routes/
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── reportRoutes.js
│   ├── chatRoutes.js
│   ├── notificationRoutes.js
│   ├── adminRoutes.js
│   └── apiRoutes.js                # REST API v1
│
├── middleware/
│   ├── auth.js                     # JWT protect, authorize, audit log
│   └── validation.js               # express-validator rules
│
├── services/
│   ├── ai/
│   │   └── aiService.js            # OpenAI + mock AI engine + chatbot
│   ├── ocr/
│   │   └── ocrService.js           # Text extraction + medical value parsing
│   ├── pdf/
│   │   └── pdfService.js           # PDFKit report generation
│   └── notifications/
│       ├── emailService.js         # Nodemailer email templates
│       └── cronService.js          # node-cron scheduled jobs
│
├── views/                          # EJS templates
│   ├── landing.ejs                 # Public landing page
│   ├── partials/
│   │   ├── header.ejs              # Sidebar + topbar
│   │   └── footer.ejs              # Scripts + closing tags
│   ├── auth/
│   │   ├── login.ejs
│   │   ├── register.ejs
│   │   ├── profile.ejs
│   │   └── forgot-password.ejs
│   ├── dashboard/
│   │   └── index.ejs               # Main dashboard with 4 charts
│   ├── reports/
│   │   ├── index.ejs               # Report list with filters
│   │   ├── upload.ejs              # Drag & drop upload
│   │   └── detail.ejs              # Full report + AI analysis
│   ├── chat/
│   │   ├── index.ejs               # Chat interface
│   │   └── history.ejs             # Session history
│   ├── notifications/
│   │   └── index.ejs               # Notifications + reminders
│   ├── admin/
│   │   ├── index.ejs               # Admin dashboard
│   │   └── users.ejs               # User management
│   └── errors/
│       ├── 404.ejs
│       └── error.ejs
│
├── public/
│   ├── css/
│   │   ├── main.css                # Full app CSS (dark mode, responsive)
│   │   ├── landing.css             # Landing page CSS
│   │   └── auth.css                # Auth pages CSS
│   └── js/
│       └── main.js                 # Theme toggle, sidebar, utilities
│
└── utils/
    └── seed.js                     # Database seeder
```

---

## 🔌 API Reference (v1)

All endpoints require `Authorization: Bearer <token>` or cookie.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/metrics` | Health metrics history |
| GET | `/api/v1/notifications/count` | Unread notification count |
| GET | `/api/v1/reports/summary` | Report statistics |
| GET | `/dashboard/analytics` | Chart data (query: `?days=90`) |
| POST | `/chat/message` | Send AI chat message |
| GET | `/reports/export/csv` | Export health data as CSV |
| GET | `/reports/:id/download` | Download PDF report |

---

## 🤖 AI Engine

The AI service has two modes:

**OpenAI Mode** (set `OPENAI_API_KEY` in .env):
- Uses GPT-4-turbo-preview for report analysis
- Structured JSON responses with medical insights
- Context-aware chatbot with patient history

**Mock AI Mode** (no API key needed):
- Intelligent rule-based analysis engine
- Parses medical values and generates realistic insights
- Risk prediction for diabetes, heart disease, anemia, kidney issues
- Pattern-matched chatbot responses

---

## 🔒 Security Features

- **Helmet.js** — Security HTTP headers
- **Rate Limiting** — 100 req/15min global, 20 req/15min for auth
- **NoSQL Injection Prevention** — express-mongo-sanitize
- **JWT** — httpOnly cookies, session storage
- **bcrypt** — Password hashing with configurable rounds
- **Signed URLs** — Cloudinary authenticated file access
- **Audit Logs** — All auth events and critical actions logged
- **Input Validation** — express-validator on all forms
- **CORS** — Configured for your frontend URL

---

## ☁️ Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<min 64 char random string>
SESSION_SECRET=<min 64 char random string>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=sk-...
EMAIL_HOST=smtp.sendgrid.net
EMAIL_USER=apikey
EMAIL_PASS=<sendgrid api key>
```

### Deploy to Railway / Render / Heroku
```bash
# Railway
railway login && railway init && railway up

# Render — connect GitHub repo, set env vars in dashboard

# Heroku
heroku create your-app-name
heroku config:set NODE_ENV=production JWT_SECRET=...
git push heroku main
```

### MongoDB Atlas Setup
1. Create cluster at mongodb.com/atlas
2. Create database user
3. Whitelist IP (0.0.0.0/0 for cloud deploy)
4. Copy connection string to `MONGODB_URI`

---

## 🧪 Extending the App

### Add a new health metric
1. Add field to `HealthMetrics` schema in `models/index.js`
2. Add regex parser in `services/ocr/ocrService.js`
3. Add chart dataset in `views/dashboard/index.ejs`

### Connect Real OCR
Replace `mockOCRExtraction()` in `ocrService.js` with:
- **Google Vision API** — Best for images
- **AWS Textract** — Best for medical PDFs
- **Tesseract.js** — Open-source, runs locally

### Add a doctor portal
1. Add `doctor` role to User model ✅ (already supported)
2. Create `doctorController.js`
3. Add doctor-specific views and routes
4. Implement patient-sharing via `Report.sharedWith`

---

## ⚠️ Disclaimer

PostVisit AI provides health information for educational purposes only. It is **not a substitute** for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ for better health outcomes*
