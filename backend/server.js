// server.js - Membership Fee Contribution For Prosperity Party Dire Dawa Branch Office Backend (Production-Ready Monolith)
'use strict';

const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const fs       = require('fs');
const path     = require('path');

// Load env vars first
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

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
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
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

// (connection now happens in start() below to avoid race conditions)

// ── Auto-Seed Admin Users (Free tier: no shell/SSH) ─────────────────────────
// Only runs on production first deploy when DB_SYNC=true.
// Remove this block after first successful login.
const seedInitialUsers = async () => {
  try {
    const { sequelize } = require('./config/db');
    const User = require('./models/User');

    const usersToCreate = [
      { username: 'admin',     email: 'admin@mcms.ddu',       password: 'admin123',    fullName: 'System Administrator',     role: 'admin' },
      { username: 'operator',  email: 'operator@mcms.ddu',    password: 'operator123', fullName: 'System Operator',          role: 'sector_officer' },
      { username: 'admin-pp',  email: 'admin@pp-dd-branch.org', password: 'admin123',  fullName: 'PP Dire Dawa Administrator', role: 'admin' }
    ];

    for (const u of usersToCreate) {
      try {
        const exists = await User.findOne({ where: { email: u.email } });
        if (exists) {
          console.log(`⏭️  Skipped ${u.email} (already exists)`);
          continue;
        }
        const existsByUsername = await User.findOne({ where: { username: u.username } });
        if (existsByUsername) {
          console.log(`⚠️  Deleting stale user with username '${u.username}'...`);
          await existsByUsername.destroy();
        }
        await User.create(u);
        console.log(`✅ Auto-created: ${u.email} / ${u.password}`);
      } catch (e) {
        console.error(`⚠️  Failed to create ${u.email}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('⚠️ Auto-seed error:', err.message);
  }
};

// Moved into start() below

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
    // Serve static assets (JS, CSS, images)
    app.use(express.static(frontendDist, {
      maxAge: '1d',         // Cache static assets for 1 day
      etag: true
    }));

    // SPA Fallback: Any route NOT starting with /api → serve index.html
    // This supports React Router client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });

    console.log('✅ Serving React frontend from:', frontendDist);
  } else {
    console.error('❌ Frontend dist not found at:', frontendDist);
    console.error('   Ensure npm run build completed successfully');
    // Fallback response for root in case dist is missing
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

  if (isProduction && process.env.DB_SYNC === 'true') {
    setTimeout(seedInitialUsers, 3000);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🚀 MFC for PP-DD Branch SERVER STARTED             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Port       : ${String(PORT).padEnd(51)}║`);
    console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(52)}║`);
    console.log(`║  DB Host    : ${(process.env.DB_HOST || '(not set)').padEnd(52)}║`);
    console.log(`║  DB Port    : ${(process.env.DB_PORT || '(not set)').padEnd(52)}║`);
    console.log(`║  DB Name    : ${(process.env.DB_NAME || '(not set)').padEnd(52)}║`);
    console.log(`║  DB SSL     : ${(process.env.DB_SSL || '(not set)').padEnd(52)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
  });

  // Post-startup DB connectivity check
  setTimeout(async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection verified after startup.');
    } catch (err) {
      console.error('⚠️  Database is NOT reachable after startup. Login and all DB operations will fail.');
      console.error(`   Reason: ${err.message}`);
    }
  }, 2000);
};

start();

module.exports = app;
