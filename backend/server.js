// server.js - MCMS DDU Backend (Production-Ready Monolith)
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
const { connectDB } = require('./config/db');

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

// Connect to DB (async - server starts regardless, DB connects in background)
connectDB();

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
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('==========================================');
  console.log(`🚀 MCMS Server running on port ${PORT}`);
  console.log(`📊 Environment : ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database   : ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log('==========================================');
});

module.exports = app;
