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

## 🐳 Docker Desktop Deployment & Management

The KAMBAC Livestock Management System is fully containerized with **Docker** and **Docker Compose**, providing an isolated environment with a Node.js production service and an official MySQL 8.0 database container backed by persistent named volumes.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20+ with Docker Compose v2+) installed and running on Windows.
- WSL 2 backend recommended for Windows.

### Environment Configuration
Copy `.env.example` to `.env` or customize environment variables:
```powershell
Copy-Item .env.example .env
```

| Variable | Description | Default in Compose |
|---|---|---|
| `PORT` | Application host port | `3000` |
| `NODE_ENV` | Application environment | `production` |
| `DB_HOST` | Database container service name | `db` |
| `DB_PORT` | Internal MySQL port | `3306` |
| `HOST_DB_PORT`| Exposed host port for MySQL access | `3308` |
| `DB_NAME` | Database name | `kambac_db` |
| `DB_USER` | Application MySQL user | `kambac_user` |
| `DB_PASSWORD` | Application MySQL user password | `kambac_secure_password` |
| `DB_ROOT_PASSWORD` | MySQL root password | `kambac_root_password` |

### Docker Commands (PowerShell)

#### 1. Build the Application Image
```powershell
docker compose build
```

#### 2. Start Application & Database (Detached)
```powershell
docker compose up -d
```
> **Safe Initialization:** The application service automatically waits for the MySQL container to report healthy (`service_healthy`), runs migrations (`migrate.js`), safely seeds initial admin/sample records (`seed.js`) without dropping existing data, and launches the application.

#### 3. View Running Containers
```powershell
docker compose ps
```

#### 4. View Application Logs
```powershell
docker compose logs -f app
```

#### 5. View Database Logs
```powershell
docker compose logs -f db
```

#### 6. Access Application in Browser
Navigate to:
```
http://localhost:3000
```

#### 7. Stop Containers Safely
```powershell
docker compose down
```
> ⚠️ **IMPORTANT NOTE ON PERSISTENCE:**  
> Never use `docker compose down -v` during standard setup or shutdown. The `-v` flag deletes named Docker volumes (`kambac_mysql_data`) and will permanently erase database records. Normal `docker compose down` and `docker compose up -d` preserve all livestock, members, and historical data.

### Database Access & Management
Connect to the running containerized database using MySQL CLI or GUI tools (DBeaver, TablePlus, phpMyAdmin):
- **Host:** `127.0.0.1` (or `localhost`)
- **Port:** `3308`
- **Database:** `kambac_db`
- **Username:** `kambac_user` (or `root`)
- **Password:** `kambac_secure_password` (or `kambac_root_password`)

Or open interactive MySQL shell in the container:
```powershell
docker compose exec -it db mysql -u kambac_user -pkambac_secure_password kambac_db
```

### Database Backup and Restore

#### Backup (Dump) Database to SQL File
```powershell
docker compose exec -T db mysqldump -u root -pkambac_root_password kambac_db > kambac_db_backup.sql
```

#### Restore Database from SQL File
```powershell
Get-Content kambac_db_backup.sql | docker compose exec -T db mysql -u root -pkambac_root_password kambac_db
```

### Troubleshooting
- **Port 3000 already in use:** Modify `ports: - "3001:3000"` in `docker-compose.yml`.
- **Port 3308 already in use:** Change `HOST_DB_PORT` in your `.env` to another port like `3309`.
- **Database container restart loop:** Inspect logs with `docker compose logs db`. Ensure Docker Desktop has sufficient allocated memory (at least 2GB).
- **Health check failure:** Verify container status using `docker compose ps` and run `curl.exe http://localhost:3000/health`.

---

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
