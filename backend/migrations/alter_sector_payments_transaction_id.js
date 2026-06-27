const { sequelize } = require('../config/db');
const DEBUG_DB = process.env.DEBUG_DB === 'true';

module.exports = async () => {
  try {
    const [rows] = await sequelize.query(`
      SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sector_payments'
        AND COLUMN_NAME = 'transactionId'
    `);
    
    if (Number(rows[0].cnt) === 0) {
      await sequelize.query(`ALTER TABLE sector_payments ADD COLUMN transactionId VARCHAR(100) NULL`);
      if (DEBUG_DB) console.log('  → Added column: transactionId');
    }

    // Make receiptFile nullable
    await sequelize.query(`ALTER TABLE sector_payments MODIFY COLUMN receiptFile VARCHAR(255) NULL`);
    
  } catch (e) {
    console.error('⚠️ sector_payments transactionId migration error:', e.message);
  }
};
