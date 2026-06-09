const { sequelize } = require('../config/db');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0].cnt > 0;
}

module.exports = async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS landing_page_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        image VARCHAR(500) NOT NULL,
        category VARCHAR(50) DEFAULT 'gallery',
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        uploaded_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const newColumns = [
      { name: 'alt_text', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'is_featured', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'language', type: "VARCHAR(10) DEFAULT 'en'" },
      { name: 'file_size', type: 'INT DEFAULT NULL' },
      { name: 'image_width', type: 'INT DEFAULT NULL' },
      { name: 'image_height', type: 'INT DEFAULT NULL' },
      { name: 'thumbnail_small', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'thumbnail_medium', type: 'VARCHAR(500) DEFAULT NULL' },
    ];

    for (const col of newColumns) {
      const exists = await columnExists('landing_page_images', col.name);
      if (!exists) {
        await sequelize.query(`ALTER TABLE landing_page_images ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`  → Added column: ${col.name}`);
      }
    }

    const indexes = [
      { name: 'idx_category', columns: ['category'] },
      { name: 'idx_is_featured', columns: ['is_featured'] },
      { name: 'idx_created_at', columns: ['created_at'] },
    ];
    for (const idx of indexes) {
      try {
        await sequelize.query(
          `CREATE INDEX ${idx.name} ON landing_page_images (${idx.columns.join(',')})`
        );
      } catch (e) {
        // index already exists
      }
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS landing_page_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        value TEXT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Landing page tables migration completed');
  } catch (e) {
    console.error('⚠️ Landing page tables migration error:', e.message);
  }
};
