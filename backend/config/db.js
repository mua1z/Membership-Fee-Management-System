// config/db.js - Production-grade MySQL / Sequelize Configuration
const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

// SSL config for Aiven (and any cloud MySQL with SSL)
const sslConfig = process.env.DB_SSL === 'true'
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false // Aiven uses self-signed certs on free tier
      }
    }
  : {};

// Shared Sequelize options
const dialectOptions = {
  ...sslConfig,
  connectTimeout: 30000 // 30s connection timeout for Aiven remote MySQL
};

const sharedOptions = {
  dialect: 'mysql',
  logging: isProduction ? false : (msg) => console.log(`[SQL] ${msg}`),
  pool: {
    max: 5,       // Keep low for free tier (limited connections)
    min: 0,
    acquire: 60000, // 60s - higher for cloud DB latency
    idle: 10000
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true
  },
  dialectOptions
};

// Build Sequelize instance from individual env vars (used on Render)
const sequelize = new Sequelize(
  process.env.DB_NAME     || 'mcms',
  process.env.DB_USER     || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    ...sharedOptions
  }
);

const connectDB = async () => {
  try {
    // Validate required env vars in production
    if (isProduction) {
      const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
      const missing = required.filter(k => !process.env[k]);
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    }

    await sequelize.authenticate();
    console.log(`✅ MySQL connected to: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);

    // Load models in order (associations defined below)
    require('../models/User');
    const SectorType         = require('../models/SectorType');
    const SectorUnit         = require('../models/SectorUnit');
    const MemberCategory     = require('../models/MemberCategory');
    const SectorUnitCategory = require('../models/SectorUnitCategory');
    require('../models/Member');
    require('../models/Contribution');
    require('../models/Payment');
    require('../models/Receipt');
    require('../models/Setting');

    // Sector hierarchy associations
    SectorType.hasMany(SectorUnit, { foreignKey: 'sectorTypeId', as: 'units' });
    SectorUnit.belongsTo(SectorType, { foreignKey: 'sectorTypeId', as: 'sectorType' });

    SectorUnit.belongsToMany(MemberCategory, {
      through: SectorUnitCategory,
      foreignKey: 'sectorUnitId',
      otherKey: 'memberCategoryId',
      as: 'categories'
    });
    MemberCategory.belongsToMany(SectorUnit, {
      through: SectorUnitCategory,
      foreignKey: 'memberCategoryId',
      otherKey: 'sectorUnitId',
      as: 'units'
    });

    // ── Sync Strategy ──────────────────────────────────────────────────────────
    // Production: Only sync if DB_SYNC=true is explicitly set (first deploy only)
    // Development: Always sync with alter:true to auto-update columns
    if (!isProduction) {
      await sequelize.sync({ alter: true });
      console.log('✅ DB tables synced (development mode)');
    } else if (process.env.DB_SYNC === 'true') {
      // Safe production sync: creates missing tables, never drops columns
      await sequelize.sync({ force: false });
      console.log('✅ DB tables synced (production first-run mode)');
      console.log('ℹ️  Set DB_SYNC=false after first successful deploy');
    } else {
      console.log('ℹ️  DB sync skipped (production mode). Tables must already exist.');
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Check: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL');
    console.error('⚠️  Server continuing without database. Health checks and static assets will work, but API calls requiring DB will fail.');
    // DO NOT exit - let the server stay up for health checks and graceful recovery
  }
};

module.exports = { sequelize, connectDB };
