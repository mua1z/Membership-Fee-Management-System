const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });
const { connectDB, sequelize } = require('./config/db');

(async () => {
  await connectDB();
  const [rows] = await sequelize.query(`
    SELECT st.name AS type, su.name AS unit
    FROM sector_units su
    JOIN sector_types st ON su.sectorTypeId = st.id
    WHERE st.name IN ('Health Institution', 'Secondary School')
    ORDER BY st.name, su.name
  `);
  rows.forEach(r => console.log(r.type + ': ' + r.unit));
  process.exit(0);
})();
