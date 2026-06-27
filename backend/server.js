// server.js - Membership Fee Contribution For Prosperity Party Dire Dawa Branch Office Backend (Production-Ready Monolith)
'use strict';

const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const fs       = require('fs');
const path     = require('path');

// Load env vars first
if (process.env.NODE_ENV !== 'production') { dotenv.config(); }

const isProduction = process.env.NODE_ENV === 'production';
const DEBUG_DB = process.env.DEBUG_DB === 'true';

// ── Crash Prevention ──────────────────────────────────────────────────────────
// Node 15+ terminates on unhandled rejections. The DB connection runs async
// in the background — if it fails, the rejection must not crash the server.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
  console.error(err.stack);
});

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production: frontend is served by THIS Express server (same origin).
// Browser requests are same-origin, so CORS is not needed.
// We still enable it for health checks or Postman testing.
app.use(cors({
  origin: isProduction
    ? true   // Accept all (same-origin anyway)
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'https://membership-fee-management-system.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Uploaded Files (profile photos, etc.) ────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ── Database Connection & Model Sync ─────────────────────────────────────────
const { sequelize, connectDB } = require('./config/db');

// Load models & define associations BEFORE connectDB runs sync
const User         = require('./models/User');
const Member       = require('./models/Member');
const Payment      = require('./models/Payment');
const Receipt      = require('./models/Receipt');
const Contribution = require('./models/Contribution');

// Payment ↔ Member
Payment.belongsTo(Member, { foreignKey: 'memberDbId', as: 'memberInfo', onDelete: 'CASCADE' });
Member.hasMany(Payment,   { foreignKey: 'memberDbId', as: 'payments',   onDelete: 'CASCADE' });

// Receipt ↔ Member
Receipt.belongsTo(Member, { foreignKey: 'memberDbId',  as: 'memberInfo', onDelete: 'CASCADE' });
Member.hasMany(Receipt,   { foreignKey: 'memberDbId',  as: 'receipts',   onDelete: 'CASCADE' });

// Receipt ↔ Payment
Receipt.belongsTo(Payment, { foreignKey: 'paymentDbId', as: 'paymentInfo', onDelete: 'CASCADE' });
Payment.hasMany(Receipt,   { foreignKey: 'paymentDbId', as: 'receipts',    onDelete: 'CASCADE' });

// Contribution ↔ Member
Contribution.belongsTo(Member, { foreignKey: 'memberDbId', as: 'memberInfo',    onDelete: 'CASCADE' });
Member.hasMany(Contribution,   { foreignKey: 'memberDbId', as: 'contributions', onDelete: 'CASCADE' });

// SectorPayment ↔ SectorUnit
const SectorPayment = require('./models/SectorPayment');
const SectorUnit    = require('./models/SectorUnit');
SectorPayment.belongsTo(SectorUnit, { foreignKey: 'sectorUnitId', as: 'sectorUnit', onDelete: 'CASCADE' });
SectorUnit.hasMany(SectorPayment,   { foreignKey: 'sectorUnitId', as: 'sectorPayments', onDelete: 'CASCADE' });
SectorPayment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader', onDelete: 'SET NULL' });
SectorPayment.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier', onDelete: 'SET NULL' });

// SectorPaymentAuditLog ↔ SectorPayment, User
const SectorPaymentAuditLog = require('./models/SectorPaymentAuditLog');
SectorPayment.hasMany(SectorPaymentAuditLog, { foreignKey: 'sectorPaymentId', as: 'auditLogs', onDelete: 'CASCADE' });
SectorPaymentAuditLog.belongsTo(SectorPayment, { foreignKey: 'sectorPaymentId', as: 'sectorPayment', onDelete: 'CASCADE' });
SectorPaymentAuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' });


// (connection now happens in start() below to avoid race conditions)

// ── Auto-Seed: Removed per request — users are managed manually ─────────────

// ── API Routes ────────────────────────────────────────────────────────────────
// IMPORTANT: All API routes MUST be defined BEFORE the SPA fallback below
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/members',       require('./routes/memberRoutes'));
app.use('/api/contributions', require('./routes/contributionRoutes'));
app.use('/api/payments',      require('./routes/paymentRoutes'));
app.use('/api/receipts',      require('./routes/receiptRoutes'));
app.use('/api/reports',       require('./routes/reportRoutes'));
app.use('/api/dashboard',     require('./routes/dashboardRoutes'));
app.use('/api/import',        require('./routes/importRoutes'));
app.use('/api/settings',      require('./routes/settingRoutes'));
app.use('/api/backup',        require('./routes/backupRoutes'));
app.use('/api',               require('./routes/sectorRoutes'));
app.use('/api/ai',            require('./routes/aiRoutes'));
app.use('/api/analytics',     require('./routes/analyticsRoutes'));
app.use('/api/sector-payments', require('./routes/sectorPaymentRoutes'));
app.use('/api/landing',        require('./routes/landingPageRoutes'));
app.use('/api/news',           require('./routes/newsRoutes'));

// Health Check (must be before SPA fallback)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Database health check — helps diagnose DB connection issues in production
app.get('/api/health/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ connected: true, host: process.env.DB_HOST, database: process.env.DB_NAME });
  } catch (err) {
    res.status(503).json({
      connected: false,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      error: err.message
    });
  }
});

// ── Serve React Frontend (Production Only) ────────────────────────────────────
// The dist folder is built during Render's buildCommand step.
// Path: /opt/render/project/src/frontend/dist (relative to repo root)
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

  if (fs.existsSync(frontendDist)) {
    // Serve service-worker.js with no-cache for PWA updates
    app.get('/service-worker.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(frontendDist, 'service-worker.js'));
    });

    // Serve manifest.json
    app.get('/manifest.json', (req, res) => {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(path.join(frontendDist, 'manifest.json'));
    });

    // Offline page for service worker
    app.get('/offline', (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });

    // Serve static assets (JS, CSS, images) - short cache for JS/CSS (PWA updates)
    app.use(express.static(frontendDist, {
      maxAge: '1d',
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.webp')) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));

    // SPA Fallback: Any route NOT starting with /api → serve index.html
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(frontendDist, 'index.html'));
    });

    if (DEBUG_DB) console.log('✅ Serving React frontend from:', frontendDist);
  } else {
    console.error('❌ Frontend dist not found at:', frontendDist);
    console.error('   Ensure npm run build completed successfully');
    app.get('*', (req, res) => {
      res.status(503).send('Frontend build not found. Please check deployment logs.');
    });
  }
}

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must be LAST middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
  if (!isProduction) console.error(err.stack);

  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...((!isProduction) && { stack: err.stack })
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
// Render injects PORT automatically - MUST use process.env.PORT
const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();

  try {
    await require('./migrations/create_chat_tables')();
  } catch (e) {
    console.error('⚠️ Chat tables migration error:', e.message);
  }

  try {
    require('./migrations/create_ai_logs')();
  } catch (e) {
    console.error('⚠️ AI logs migration error:', e.message);
  }
  try {
    require('./migrations/create_sector_payments')();
  } catch (e) {
    console.error('⚠️ Sector payments migration error:', e.message);
  }
  try {
    require('./migrations/alter_sector_payments_transaction_id')();
  } catch (e) {
    console.error('⚠️ Sector payments transactionId migration error:', e.message);
  }
  try {
    require('./migrations/create_sector_payment_audit_logs')();
  } catch (e) {
    console.error('⚠️ Sector payment audit logs migration error:', e.message);
  }
  try {
    require('./migrations/create_audit_logs')();
  } catch (e) {
    console.error('⚠️ Audit logs migration error:', e.message);
  }
  try {
    require('./migrations/create_export_logs')();
  } catch (e) {
    console.error('⚠️ Export logs migration error:', e.message);
  }

  try {
    await require('./migrations/create_landing_page_tables')();
  } catch (e) {
    console.error('⚠️ Landing page migration error:', e.message);
  }

  try {
    await require('./migrations/create_news_table')();
  } catch (e) {
    console.error('⚠️ News table migration error:', e.message);
  }

  // ── Expand User.role enum to include super_admin ───────────────────────
  try {
    require('./migrations/alter_user_role_enum')();
  } catch (e) {
    console.error('⚠️ User role enum migration error:', e.message);
  }

  // ── Add OTP fields to User table ──────────────────────────────────────────
  try {
    await require('./migrations/alter_user_otp')();
  } catch (e) {
    console.error('⚠️ User OTP migration error:', e.message);
  }

  app.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);
  });

  // Post-startup DB connectivity check
  setTimeout(async () => {
    try {
      await sequelize.authenticate();
      if (DEBUG_DB) console.log('✅ Database connection verified after startup.');
    } catch (err) {
      console.error('⚠️  Database is NOT reachable after startup. Login and all DB operations will fail.');
      console.error(`   Reason: ${err.message}`);
    }
  }, 2000);
};

start();

module.exports = app;
