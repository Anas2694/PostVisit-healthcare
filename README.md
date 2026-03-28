# 🏥 PostVisit — AI-Powered Healthcare Platform

> Upload medical reports. Get AI-powered insights. Track your health. Chat with your doctor's AI.


---

## ✨ Features

| Feature                 | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| 🔐 **Auth System**      | JWT + bcrypt, role-based access (user/admin), secure sessions              |
| 📄 **Report Upload**    | PDF + image uploads via Cloudinary with signed URLs                        |
| 🤖 **AI Analysis**      | Gemini AI + intelligent mock engine — summaries, findings, recommendations |
| 🔬 **OCR Extraction**   | Auto-extract blood sugar, cholesterol, hemoglobin, BP from reports         |
| 📊 **Health Dashboard** | 4 Chart.js charts — trends in sugar, cholesterol, hemoglobin, BP           |
| 💬 **AI Chatbot**       | Context-aware health chatbot with chat history per session                 |
| ⚠️ **Risk Prediction**  | Rule-based engine for diabetes, heart disease, anemia, kidney risk         |
| 🔔 **Smart Reminders**  | Medication reminders + follow-up alerts via in-app system                  |
| 📑 **PDF Export**       | Downloadable health reports with analysis, risk assessment, advice         |
| 📉 **CSV Export**       | Export all health metrics as CSV                                           |
| 🛡️ **Security**        | Helmet.js, rate limiting, NoSQL sanitization, audit logs, signed URLs      |
| 👨‍💼 **Admin Panel**   | User management, audit log viewer, system stats                            |
| 🌙 **Dark Mode**        | Full dark/light theme toggle                                               |
| 📱 **Responsive**       | Mobile-first design                                                        |

---

## 🚀 Quick Start

### Prerequisites

* Node.js 18+
* MongoDB (local or Atlas)
* (Optional) Cloudinary account
* (Optional) Gemini API key

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

# 4. Start development server
npm run dev
```

---

## 🔧 Minimum .env (no cloud services required)

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/postvisit
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
SESSION_SECRET=your_session_secret_key
```

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
│   │   └── aiService.js            # Gemini + mock AI engine + chatbot
│   ├── ocr/
│   │   └── ocrService.js           # Text extraction + medical value parsing
│   ├── pdf/
│   │   └── pdfService.js           # PDFKit report generation
│   └── notifications/
│       └── cronService.js          # node-cron scheduled jobs
│
├── views/                          # EJS templates
│   ├── landing.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── auth/
│   ├── dashboard/
│   ├── reports/
│   ├── chat/
│   ├── notifications/
│   ├── admin/
│   └── errors/
│
├── public/
│   ├── css/
│   └── js/
│
└── utils/
```

---

## 🔌 API Reference (v1)

All endpoints require `Authorization: Bearer <token>` or cookie.

| Method | Endpoint                      | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/api/v1/metrics`             | Health metrics history         |
| GET    | `/api/v1/notifications/count` | Unread notification count      |
| GET    | `/api/v1/reports/summary`     | Report statistics              |
| GET    | `/dashboard/analytics`        | Chart data (query: `?days=90`) |
| POST   | `/chat/message`               | Send AI chat message           |
| GET    | `/reports/export/csv`         | Export health data as CSV      |
| GET    | `/reports/:id/download`       | Download PDF report            |

---

## 🤖 AI Engine

The AI service has two modes:

### Gemini Mode (set `GEMINI_API_KEY` in .env):

* Uses Gemini models for report analysis
* Structured responses with medical insights
* Context-aware chatbot with patient history

### Mock AI Mode (no API key needed):

* Intelligent rule-based analysis engine
* Parses medical values and generates realistic insights
* Risk prediction for diabetes, heart disease, anemia, kidney issues
* Pattern-matched chatbot responses

---

## 🔒 Security Features

* **Helmet.js**
* **Rate Limiting**
* **NoSQL Injection Prevention**
* **JWT Authentication**
* **bcrypt Password Hashing**
* **Signed URLs (Cloudinary)**
* **Audit Logs**
* **Input Validation**
* **CORS Configuration**

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
GEMINI_API_KEY=your_api_key_here
```

---

## ⚠️ Disclaimer

PostVisit AI provides health information for educational purposes only. It is **not a substitute** for professional medical advice, diagnosis, or treatment.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---


*Built with ❤️ for better health outcomes*
