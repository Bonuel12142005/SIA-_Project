# KAMBAC LIVESTOCK MANAGEMENT SYSTEM
### XianFire Framework & MySQL Database Implementation

---

## 📌 Project Overview
**KAMBAC Livestock Management System** is a full-stack cooperative management platform built with the **XianFire Framework** (`xianfires`), **Express.js**, **Sequelize ORM**, and **MySQL**. It provides dynamic inventory tracking, real-time health monitoring, growth/weight recording, archiving & restoring workflows, and cooperative member profiles.

---

## 🛠️ Technology Stack
- **Framework:** XianFire Framework (Node.js & Express MVC architecture)
- **Templating Engine:** `.xian` (Custom Handlebars-powered template engine)
- **Database:** MySQL (`kambac_db`)
- **ORM:** Sequelize ORM (v6)
- **Database Driver:** `mysql2`
- **Styling:** Tailwind CSS (Custom Philippine Forest Green theme)
- **Icons:** Lucide Icons CDN
- **Security:** bcrypt password hashing, `express-session`, protected route middleware

---

## 📁 Project Directory Structure
```text
KAMBAC/
├── app/
│   ├── controllers/
│   │   ├── authController.js         # Authentication (Login, Session, Logout)
│   │   ├── memberController.js       # Member CRUD & Dropdown API
│   │   └── livestockController.js    # Livestock CRUD, Stats, Modals & Archive
│   ├── middleware/
│   │   └── authMiddleware.js         # Protected routes & local session state
│   ├── models/
│   │   ├── index.js                  # Sequelize models, associations & foreign keys
│   │   ├── User.js                   # Administrator & Staff accounts
│   │   ├── Member.js                 # Cooperative farmer members
│   │   ├── Livestock.js              # Active & archived animals
│   │   ├── LivestockHealthRecord.js  # Medical treatments & health logs
│   │   ├── LivestockWeightHistory.js # Weight tracking logs
│   │   └── LivestockArchiveHistory.js# Archive audit trail & reasons
│   └── services/
├── config/
│   └── database.js                   # MySQL connection & automatic DB creation
├── database/
│   ├── migrate.js                    # Database migration & table synchronization
│   └── seed.js                       # Admin account & sample data seeder
├── public/
│   └── assets/
│       ├── css/style.css             # Tailwind & theme styles
│       └── js/app.js                 # Frontend interactions & Lucide init
├── routes/
│   └── index.js                      # Application routes
├── storage/
│   ├── logs/
│   └── uploads/
├── tests/
│   └── test.js                       # System integrity & file structure test
├── views/
│   ├── partials/
│   │   ├── head.xian                 # HTML head, Tailwind CSS & Lucide setup
│   │   ├── nav.xian                  # Green-themed responsive navigation bar
│   │   └── footer.xian               # Footer & Lucide initialization
│   ├── dashboard.xian                # Dashboard with 4 Stat Cards & Livestock Cards
│   ├── login.xian                    # Secure administrative login portal
│   ├── livestock/
│   │   └── archived.xian             # Archived records & restoration table
│   └── members/
│       └── index.xian                # Member management table & modal
├── .env                              # Active environment configuration
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore rules
├── create.js                         # XianFire CLI model/controller generator
├── index.js                          # XianFire application entry point
├── package.json                      # Dependencies and npm scripts
└── README.md                         # Project documentation
```

---

## 🗄️ Database Setup (`kambac_db`)

### Automatic Creation
The system includes built-in auto-creation logic in `config/database.js` and `database/migrate.js`:
- If your MySQL user has permission to create databases, `kambac_db` is created automatically.

### Manual Creation via phpMyAdmin (Alternative)
If automatic creation is restricted on your MySQL instance:
1. Open your browser and navigate to `http://localhost/phpmyadmin`.
2. Click **New** on the left sidebar.
3. In the Database Name field, type: `kambac_db`.
4. Set collation to `utf8mb4_unicode_ci` and click **Create**.

---

## 🚀 Installation & Running Instructions

### 1. Install Dependencies
Open PowerShell or Terminal in the `KAMBAC` folder:
```bash
npm install
```

### 2. Configure Environment (`.env`)
Make sure your MySQL credentials in `.env` match your local MySQL server (e.g. XAMPP default is user `root` with no password):
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kambac_db
DB_USER=root
DB_PASSWORD=
SESSION_SECRET=kambac-super-secure-session-secret-key-2025

ADMIN_NAME=KAMBAC Administrator
ADMIN_EMAIL=admin@kambac.com
ADMIN_PASSWORD=AdminPassword123!
```

### 3. Run Database Migrations
Create all 6 MySQL tables with indexes and foreign keys:
```bash
npm run migrate
```

### 4. Seed Database
Seed the default administrator account, initial farmer members, and sample livestock:
```bash
npm run seed
```

### 5. Start the Application
Run in development mode:
```bash
npm run xian
```
Or standard mode:
```bash
npm start
```

### 6. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

### Default Administrator Credentials:
- **Email:** `admin@kambac.com`
- **Password:** `AdminPassword123!`

---

## ✨ Features Implemented
1. **Dynamic Dashboard Statistics (4 Cards):**
   - **TOTAL LIVESTOCK:** Real-time count of active animals.
   - **HEALTHY / ACTIVE:** Count of animals in optimal condition.
   - **NEEDS MONITORING:** Count of animals under observation or treatment.
   - **ESTIMATED VALUE:** Dynamic sum of all livestock values in Philippine Pesos (₱).
2. **Add Livestock Registration Modal:**
   - Dynamic member dropdown, animal type dropdown, date acquired, initial weight, health condition, and estimated value (₱).
   - Auto-generates unique livestock codes (`LS-YYYY-XXXX`).
   - Automatically initializes weight history and initial health check records in MySQL.
3. **Active Livestock Grid Cards:**
   - Displays ID, Animal Name/Breed, Animal Type, Owner, Age, Current Weight, Estimated Value, and Health Status badge.
   - Fully functional **View**, **Edit**, and **Archive** buttons.
4. **Livestock Details (View Modal):**
   - Complete animal details, owner profile, weight growth logs, and medical history.
5. **Livestock Editing:**
   - Update weight, health status, and estimated value; automatically logs weight and medical entries into history tables.
6. **Archived Livestock & Restoration:**
   - Soft archiving preserves audit history with custom reasons.
   - Dedicated `/livestock/archived` section with one-click **Restore** functionality.
7. **Member Management:**
   - Full CRUD for farmer cooperative members with active livestock tallies.
8. **XianFire CLI Code Generators:**
   - `npm run create:model <ModelName>`
   - `npm run create:controller <ControllerName>`
