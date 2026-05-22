const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    user: '4MTQ6Lc9AYGCnHs.root',
    password: '3m81xFHkPP04J0V6',
    database: 'mcms',
    port: 4000,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 30000
  });
  console.log('Connected to production TiDB!\n');

  let [rows] = await conn.query('SHOW TABLES');
  console.log('Tables:', rows.map(r => Object.values(r)[0]));

  for (const tbl of rows.map(r => Object.values(r)[0])) {
    const [cnt] = await conn.query('SELECT COUNT(*) as c FROM ' + tbl);
    console.log('  ' + tbl + ': ' + cnt[0].c + ' rows');
  }

  // Sector types
  [rows] = await conn.query('SELECT * FROM sector_types');
  console.log('\nSECTOR TYPES:');
  rows.forEach(r => console.log('  id=' + r.id + ' name=' + r.name));

  // Sector units
  [rows] = await conn.query('SELECT su.id, su.name, su.sectorTypeId, st.name as typeName FROM sector_units su JOIN sector_types st ON st.id=su.sectorTypeId ORDER BY su.sectorTypeId, su.id');
  console.log('\nSECTOR UNITS:');
  rows.forEach(r => console.log('  id=' + r.id + ' name=' + r.name + ' type=' + r.typeName));

  // Member categories
  [rows] = await conn.query('SELECT * FROM member_categories ORDER BY id');
  console.log('\nMEMBER CATEGORIES:');
  rows.forEach(r => console.log('  id=' + r.id + ' name=' + r.name));

  // Members distribution
  [rows] = await conn.query('SELECT DISTINCT membershipType FROM members');
  console.log('\nMembership types:', rows.map(r => r.membershipType));

  [rows] = await conn.query("SELECT COUNT(*) as cnt FROM members WHERE sectorUnitId IS NULL");
  console.log('Members with NULL sectorUnitId:', rows[0].cnt);
  [rows] = await conn.query("SELECT COUNT(*) as cnt FROM members WHERE memberCategoryId IS NULL");
  console.log('Members with NULL memberCategoryId:', rows[0].cnt);

  [rows] = await conn.query("SELECT st.name, COUNT(m.id) as cnt FROM members m JOIN sector_units su ON m.sectorUnitId = su.id JOIN sector_types st ON su.sectorTypeId = st.id GROUP BY st.name");
  console.log('\nCurrent members per sector type:');
  rows.forEach(r => console.log('  ' + r.name + ': ' + r.cnt));

  [rows] = await conn.query("SELECT mc.name, COUNT(m.id) as cnt FROM members m JOIN member_categories mc ON m.memberCategoryId = mc.id GROUP BY mc.name");
  console.log('\nCurrent members per category:');
  rows.forEach(r => console.log('  ' + r.name + ': ' + r.cnt));

  await conn.end();
}
check().catch(e => console.error('ERROR:', e));
