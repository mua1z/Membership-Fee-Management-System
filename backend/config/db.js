const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

const sslConfig = process.env.DB_SSL === 'true'
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  : {};

const dialectOptions = {
  ...sslConfig,
  connectTimeout: 60000
};

const sharedOptions = {
  dialect: 'mysql',
  logging: isProduction ? false : (msg) => console.log(`[SQL] ${msg}`),
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  retry: {
    max: 5
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true
  },
  dialectOptions
};

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'defaultdb',
  process.env.DB_USER     || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    ...sharedOptions
  }
);

let associationsDefined = false;

const connectDB = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (isProduction) {
        const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
        const missing = required.filter(k => !process.env[k]);
        if (missing.length > 0) {
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
      }

      await sequelize.authenticate();
      console.log(`MySQL connected to: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);

      if (!associationsDefined) {
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
          as: 'sectorUnits'
        });
        associationsDefined = true;
      }

      await sequelize.sync({ alter: false });
      console.log('DB tables synced');

      return;

    } catch (error) {
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`DB connection attempt ${attempt}/${retries} failed: ${error.message}. Retrying in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(`DB connection failed after ${retries} attempts:`, error.message);
        console.error('Check: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL');
        console.log('Server continuing without database. Health checks and static assets will work, but API calls requiring DB will fail.');
      }
    }
  }
};

module.exports = { sequelize, connectDB };
