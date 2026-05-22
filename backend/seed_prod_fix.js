const mysql = require('mysql2/promise');
async function fix() {
  const conn = await mysql.createConnection({
    host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    user: '4MTQ6Lc9AYGCnHs.root',
    password: '3m81xFHkPP04J0V6',
    database: 'mcms',
    port: 4000,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000
  });

  // Get type IDs
  const [types] = await conn.query('SELECT id, name FROM sector_types');
  const typeMap = {};
  types.forEach(t => typeMap[t.name] = t.id);

  // Get category map
  const [cats] = await conn.query('SELECT id, name FROM member_categories');
  const catMap = {};
  cats.forEach(c => catMap[c.name] = c.id);

  // Seed missing Urban Woreda units (7-9)
  const missingUrban = ['Woreda 7 Administration', 'Woreda 8 Administration', 'Woreda 9 Administration'];
  const urbanCategories = [
    'Employee Members', 'Youth Wing', 'Women Wing', 'Resident Youth Wing',
    'Resident Women Wing', 'Student Members', 'Enterprises', 'Investors', 'Urban Residents'
  ];
  for (const name of missingUrban) {
    const [r] = await conn.query('INSERT INTO sector_units (name, sectorTypeId) VALUES (?, ?)', [name, typeMap['Urban Woredas']]);
    for (const c of urbanCategories) {
      await conn.query('INSERT INTO sector_unit_categories (sectorUnitId, memberCategoryId) VALUES (?, ?)', [r.insertId, catMap[c]]);
    }
  }
  console.log('Added 3 missing Urban Woreda units');

  // Seed Rural Cluster units
  const ruralUnits = ['Biyyo Awwalle Cluster', 'Wahel Cluster', 'Aseliso Cluster', 'Jeldessa Cluster'];
  const ruralCategories = [
    'Employee Members', 'Youth Wing', 'Women Wing', 'Resident Youth Wing',
    'Resident Women Wing', 'Farmer Members', 'Student Members', 'Enterprises', 'Investors'
  ];
  for (const name of ruralUnits) {
    const [r] = await conn.query('INSERT INTO sector_units (name, sectorTypeId) VALUES (?, ?)', [name, typeMap['Rural Clusters']]);
    for (const c of ruralCategories) {
      await conn.query('INSERT INTO sector_unit_categories (sectorUnitId, memberCategoryId) VALUES (?, ?)', [r.insertId, catMap[c]]);
    }
  }
  console.log('Added 4 Rural Cluster units');

  // Final verification
  let [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_units');
  console.log('\nTotal sector units:', rows[0].cnt);
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_unit_categories');
  console.log('Total unit-category associations:', rows[0].cnt);
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM members');
  console.log('Total members:', rows[0].cnt);

  // Members per type
  [rows] = await conn.query('SELECT st.name, COUNT(m.id) as cnt FROM sector_types st LEFT JOIN sector_units su ON su.sectorTypeId=st.id LEFT JOIN members m ON m.sectorUnitId=su.id GROUP BY st.id, st.name ORDER BY st.id');
  console.log('\nMembers per sector type:');
  rows.forEach(r => console.log('  ' + r.name + ': ' + r.cnt));

  await conn.end();
  console.log('\nProduction seed complete!');
}
fix().catch(e => console.error('ERROR:', e));
