# 🏥 PostVisit — AI-Powered Healthcare Platform

🌐 **Live Demo:** https://postvisit-healthcare.onrender.com

> Upload medical reports. Get AI-powered insights. Track your health. Chat with your doctor's AI.

---

## ✨ Features

* 🔐 **Authentication System**
  JWT-based authentication with bcrypt hashing, role-based access (user/admin), and secure sessions.

* 📄 **Medical Report Upload**
  Upload PDF and image reports using Cloudinary with secure signed URLs.

* 🤖 **AI-Powered Analysis**
  Integrated with Gemini AI + intelligent fallback engine for:

  * Report summaries
  * Key findings
  * Personalized recommendations

* 🔬 **OCR Data Extraction**
  Automatically extracts medical values like:

  * Blood sugar
  * Cholesterol
  * Hemoglobin
  * Blood pressure

* 📊 **Health Dashboard**
  Interactive charts (Chart.js) showing trends over time.

* 💬 **AI Chatbot**
  Context-aware chatbot with session-based history.

* ⚠️ **Risk Prediction Engine**
  Detects risks for:

  * Diabetes
  * Heart disease
  * Anemia
  * Kidney issues

* 🔔 **Smart Notifications**
  Medication reminders and follow-up alerts.

* 📑 **Export Options**

  * PDF health reports
  * CSV data export

* 🛡️ **Security Features**
  Helmet.js, rate limiting, input validation, NoSQL injection protection.

* 👨‍💼 **Admin Panel**
  Manage users, monitor activity, view system logs.

* 🌙 **Dark Mode + Responsive UI**
  Fully mobile-friendly design.

---

## 🚀 Live Deployment

The application is deployed on **Render** and can be accessed here:

👉 https://postvisit-healthcare.onrender.com

⚠️ *Note:* Free tier may take 30–50 seconds to wake up after inactivity.

---

## ⚙️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas
* **Frontend:** EJS, CSS, JavaScript
* **AI Integration:** Gemini API
* **File Storage:** Cloudinary
* **Charts:** Chart.js

---

## 📁 Project Structure

```
postvisit/
├── app.js
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── views/
├── public/
└── utils/
```

---

## 🔧 Environment Variables

Create a `.env` file with the following:

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEY=your_api_key
NODE_ENV=production
```

---

## ▶️ Run Locally

```bash
git clone https://github.com/your-username/postvisit-healthcare.git
cd postvisit-healthcare
npm install
npm run dev
```

---

## 🧪 Production Run

```bash
npm start
```

---

## 🔌 API Endpoints (Sample)

| Method | Endpoint                | Description    |
| ------ | ----------------------- | -------------- |
| GET    | /api/v1/metrics         | Health metrics |
| GET    | /api/v1/reports/summary | Report summary |
| POST   | /chat/message           | AI chatbot     |
| GET    | /reports/export/csv     | Export CSV     |
| GET    | /reports/:id/download   | Download PDF   |

---

## 🔒 Security

* JWT Authentication
* Password hashing with bcrypt
* Rate limiting
* Helmet.js protection
* Input validation & sanitization

---

## ⚠️ Disclaimer

This application provides **AI-based health insights for educational purposes only** and is **not a substitute for professional medical advice**.

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**Anas Viquaruddin**
GitHub: https://github.com/Anas2694

---

⭐ *If you like this project, consider starring the repo!*

