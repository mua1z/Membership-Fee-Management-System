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

  let [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_types');
  console.log('Sector types:', rows[0].cnt);
  if (rows[0].cnt > 0) {
    [rows] = await conn.query('SELECT * FROM sector_types');
    rows.forEach(r => console.log('  id=' + r.id + ' name=' + r.name));
  }

  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_units');
  console.log('Sector units:', rows[0].cnt);
  if (rows[0].cnt > 0) {
    [rows] = await conn.query('SELECT su.id, su.name, st.name as type FROM sector_units su JOIN sector_types st ON su.sectorTypeId=st.id ORDER BY su.sectorTypeId, su.id');
    rows.forEach(r => console.log('  id=' + r.id + ' name=' + r.name + ' type=' + r.type));
  }

  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM member_categories');
  console.log('Member categories:', rows[0].cnt);
  if (rows[0].cnt > 0) {
    [rows] = await conn.query('SELECT * FROM member_categories');
    rows.forEach(r => console.log('  id=' + r.id + ' name=' + r.name));
  }

  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_unit_categories');
  console.log('Unit-category associations:', rows[0].cnt);

  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM members');
  console.log('Members:', rows[0].cnt);
  if (rows[0].cnt > 0) {
    [rows] = await conn.query('SELECT st.name as type, COUNT(m.id) as cnt FROM members m JOIN sector_units su ON m.sectorUnitId=su.id JOIN sector_types st ON su.sectorTypeId=st.id GROUP BY st.name');
    console.log('Members per sector type:');
    rows.forEach(r => console.log('  ' + r.type + ': ' + r.cnt));
    [rows] = await conn.query('SELECT mc.name, COUNT(m.id) as cnt FROM members m JOIN member_categories mc ON m.memberCategoryId=mc.id GROUP BY mc.name');
    console.log('Members per category:');
    rows.forEach(r => console.log('  ' + r.name + ': ' + r.cnt));
  }

  await conn.end();
}
check().catch(e => console.error('ERROR:', e));
