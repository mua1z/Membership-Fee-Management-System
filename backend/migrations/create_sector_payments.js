const { sequelize } = require('../config/db');
const DEBUG_DB = process.env.DEBUG_DB === 'true';

module.exports = async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sector_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sectorUnitId INT NOT NULL,
        billingMonth INT NOT NULL,
        billingYear INT NOT NULL,
        totalAmount DECIMAL(15,2) NOT NULL,
        bankName VARCHAR(100) DEFAULT 'Commercial Bank of Ethiopia',
        receiptFile VARCHAR(255) NOT NULL,
        approvalStatus ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
        verifiedBy INT NULL,
        verifiedAt DATETIME NULL,
        notes TEXT NULL,
        uploadedBy INT NOT NULL,
        expectedRevenue DECIMAL(15,2) NULL,
        collectedAmount DECIMAL(15,2) NULL,
        validationDifference DECIMAL(15,2) NULL,
        validationStatus ENUM('VALID','WARNING','FLAGGED') NULL,
        isClosed TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sectorUnitId (sectorUnitId),
        INDEX idx_approvalStatus (approvalStatus),
        INDEX idx_billingPeriod (billingYear, billingMonth),
        INDEX idx_validationStatus (validationStatus),
        INDEX idx_uploadedBy (uploadedBy),
        INDEX idx_verifiedBy (verifiedBy)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    if (DEBUG_DB) console.log('✅ sector_payments table ready');

    // Drop transactionRef column (removed from schema)
    try {
      await sequelize.query(`ALTER TABLE sector_payments DROP COLUMN transactionRef`);
    } catch (_) { /* column may not exist */ }

    // Add columns if they don't exist (for existing tables)
    const newColumns = [
      'expectedRevenue DECIMAL(15,2) NULL',
      'collectedAmount DECIMAL(15,2) NULL',
      'validationDifference DECIMAL(15,2) NULL',
      "validationStatus ENUM('VALID','WARNING','FLAGGED') NULL",
      'isClosed TINYINT(1) DEFAULT 0',
      'approvedDeposits DECIMAL(15,2) NULL',
      'remainingBalance DECIMAL(15,2) NULL'
    ];
    for (const col of newColumns) {
      const colName = col.split(' ')[0];
      const [rows] = await sequelize.query(`
        SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sector_payments'
          AND COLUMN_NAME = '${colName}'
      `);
      if (Number(rows[0].cnt) === 0) {
        await sequelize.query(`ALTER TABLE sector_payments ADD COLUMN ${col}`);
        if (DEBUG_DB) console.log(`  → Added column: ${colName}`);
      }
    }

    // Foreign key constraints
    const [fkRows] = await sequelize.query(`
      SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sector_payments'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    if (Number(fkRows[0].cnt) === 0) {
      await sequelize.query(`
        ALTER TABLE sector_payments
          ADD CONSTRAINT fk_sp_sectorUnit FOREIGN KEY (sectorUnitId) REFERENCES sector_units(id) ON DELETE CASCADE,
          ADD CONSTRAINT fk_sp_uploadedBy FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE CASCADE,
          ADD CONSTRAINT fk_sp_verifiedBy FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL;
      `);
      if (DEBUG_DB) console.log('✅ sector_payments foreign keys added');
    }
  } catch (e) {
    console.error('⚠️ sector_payments migration error:', e.message);
  }

  // ── Monthly closings table ──────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS monthly_closings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sectorUnitId INT NOT NULL,
        billingMonth INT NOT NULL,
        billingYear INT NOT NULL,
        closedBy INT NOT NULL,
        closedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_unique_close (sectorUnitId, billingMonth, billingYear),
        INDEX idx_closedBy (closedBy)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    if (DEBUG_DB) console.log('✅ monthly_closings table ready');

    // FK for monthly_closings
    const [mcFk] = await sequelize.query(`
      SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'monthly_closings'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    if (Number(mcFk[0].cnt) === 0) {
      await sequelize.query(`
        ALTER TABLE monthly_closings
          ADD CONSTRAINT fk_mc_sectorUnit FOREIGN KEY (sectorUnitId) REFERENCES sector_units(id) ON DELETE CASCADE,
          ADD CONSTRAINT fk_mc_closedBy FOREIGN KEY (closedBy) REFERENCES users(id) ON DELETE CASCADE;
      `);
      if (DEBUG_DB) console.log('✅ monthly_closings foreign keys added');
    }
  } catch (e) {
    console.error('⚠️ monthly_closings migration error:', e.message);
  }
};
