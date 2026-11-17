/*
  KAMBAC Livestock Management System
  Built with XianFire Framework
  Mindoro State University - Philippines
*/
import express from "express";
import session from "express-session";
import flash from "connect-flash";
import path from "path";
import fs from "fs";
import hbs from "hbs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables
dotenv.config();

import router from "./routes/index.js";
import { attachUserToLocals } from "./app/middleware/authMiddleware.js";
import { createDatabaseIfNotExists, sequelize } from "./config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public folder
app.use(express.static(path.join(process.cwd(), "public")));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "kambac-xianfire-secret-2025",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// Attach current user & flash messages to view locals
app.use(attachUserToLocals);

// Setup XianFire custom template engine (.xian extension powered by hbs)
app.engine("xian", async (filePath, options, callback) => {
  try {
    const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, "views");

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");

// Register Handlebars helpers
hbs.registerHelper('eq', function (a, b) {
  return a === b;
});

// Auto-register partials from views/partials
const partialsDir = path.join(__dirname, "views/partials");
if (fs.existsSync(partialsDir)) {
  fs.readdir(partialsDir, (err, files) => {
    if (err) {
      console.error("❌ Could not read partials directory:", err);
      return;
    }
    files
      .filter(file => file.endsWith('.xian'))
      .forEach(file => {
        const partialName = file.replace('.xian', '');
        const fullPath = path.join(partialsDir, file);
        fs.readFile(fullPath, 'utf8', (err, content) => {
          if (err) {
            console.error(`❌ Failed to read partial: ${file}`, err);
            return;
          }
          hbs.registerPartial(partialName, content);
        });
      });
  });
}

// Mount application routes
app.use("/", router);

// Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err);
  res.status(500).send(`
    <div style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto; text-align: center;">
      <h2 style="color: #dc2626;">500 - Server Error</h2>
      <p style="color: #4b5563;">${err.message || 'An unexpected error occurred.'}</p>
      <a href="/dashboard" style="display: inline-block; margin-top: 1rem; color: #16a34a; font-weight: bold;">Return to Dashboard</a>
    </div>
  `);
});

// Start Server & verify database connection
if (!process.env.ELECTRON) {
  app.listen(PORT, async () => {
    console.log(`🔥 XianFire running at http://localhost:${PORT}`);
    console.log(`🌾 KAMBAC Livestock Management System active.`);
    
    // Attempt automatic database initialization
    try {
      await createDatabaseIfNotExists();
      await sequelize.authenticate();
      console.log(`✅ MySQL database 'kambac_db' connected and ready.`);
    } catch (dbErr) {
      console.warn(`⚠️ Note: MySQL connection pending. Make sure MySQL server (e.g. XAMPP) is running on port 3306.`);
    }
  });
}

export default app;
