const { sequelize } = require('../config/db');

module.exports = async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT DEFAULT NULL,
        image VARCHAR(500) DEFAULT NULL,
        category VARCHAR(100) DEFAULT 'news',
        is_active TINYINT(1) DEFAULT 1,
        created_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ News table migration completed');
  } catch (e) {
    console.error('⚠️ News table migration error:', e.message);
  }
};
