# 💸 SpendWise — Personal Finance Tracker

A full-stack personal finance application that helps users manage income and expenses, track their balance, and visualize spending through an interactive dashboard.

🌐 **Live Demo:** https://spendwise-pgmg.onrender.com

---

## 📌 About the Project

SpendWise is a personal finance tracker designed to make it easier to monitor daily transactions and understand spending habits. It provides an interactive dashboard where users can manage transactions and view a summary of their financial activity.

## ✨ Features

- 🔐 **User Authentication** — Register and log in to your account.
- 💰 **Income & Expense Tracking** — Manage your financial transactions.
- 📊 **Interactive Dashboard** — View your financial summary at a glance.
- 📈 **Spending Analytics** — Visualize expenses by category.
- 📝 **Transaction Management** — Add, view, and manage transactions.
- 🗄️ **Database Integration** — Store application data using PostgreSQL.
- 🌐 **Live Deployment** — Access the application online.

## 🛠️ Tech Stack

**Frontend**
- HTML5
- CSS3
- JavaScript
- Chart.js

**Backend**
- Node.js
- Express.js
- REST API

**Database & Security**
- PostgreSQL
- Neon PostgreSQL
- bcrypt
- JSON Web Tokens (JWT)

**Tools & Deployment**
- Git and GitHub
- Render
- Visual Studio Code

## 📂 Project Structure

```text
SpendWise/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── login-extra.css
│   └── script.js
├── .gitignore
└── README.md
```

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Sumanth0333/SpendWise.git
cd SpendWise
```

### 2. Install backend dependencies

```bash
npm install --prefix backend
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory.

Add the following variables:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_random_secret
NODE_ENV=development
```

Replace the example values with your own configuration. Keep your `.env` file private and **never commit database credentials or secret keys to GitHub**.

### 4. Start the application

```bash
npm start --prefix backend
```

Open your browser and visit:

```text
http://localhost:5000
```

Make sure your PostgreSQL database is configured and accessible before starting the application.

## 🔒 Security

- Passwords are hashed using bcrypt.
- JWT is used for authentication.
- Environment variables are used for sensitive configuration.
- Database credentials and secret keys should never be committed to version control.

## 🎯 Project Goal

The goal of SpendWise is to provide a simple and accessible way to track personal finances while demonstrating full-stack web development, REST API integration, database connectivity, authentication, and deployment.

## 👨‍💻 Author

**T. Sumanth**

- GitHub: [@Sumanth0333](https://github.com/Sumanth0333)

---

⭐ If you find this project interesting, consider giving the repository a star!
