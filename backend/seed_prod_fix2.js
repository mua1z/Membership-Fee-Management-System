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

  // Check per-unit category counts
  let [rows] = await conn.query(`
    SELECT su.id, su.name, st.name as type, COUNT(suc.memberCategoryId) as catCount
    FROM sector_units su
    JOIN sector_types st ON su.sectorTypeId = st.id
    LEFT JOIN sector_unit_categories suc ON suc.sectorUnitId = su.id
    GROUP BY su.id, su.name, st.name
    ORDER BY st.id, su.id
  `);
  console.log('Category counts per unit:');
  rows.forEach(r => console.log('  [' + r.type + '] ' + r.name + ': ' + r.catCount + ' cats'));

  // Get category map
  const [cats] = await conn.query('SELECT id, name FROM member_categories');
  const catMap = {};
  cats.forEach(c => catMap[c.name] = c.id);

  // Expected categories per type
  const expectedCats = {
    'Government Institutions': ['Employee Members', 'Youth Wing', 'Women Wing'],
    'Urban Woredas': ['Employee Members', 'Youth Wing', 'Women Wing', 'Resident Youth Wing', 'Resident Women Wing', 'Student Members', 'Enterprises', 'Investors', 'Urban Residents'],
    'Rural Clusters': ['Employee Members', 'Youth Wing', 'Women Wing', 'Resident Youth Wing', 'Resident Women Wing', 'Farmer Members', 'Student Members', 'Enterprises', 'Investors']
  };

  // Find and fix missing categories per unit
  for (const [typeName, expected] of Object.entries(expectedCats)) {
    const [units] = await conn.query(`
      SELECT su.id, su.name FROM sector_units su 
      JOIN sector_types st ON su.sectorTypeId = st.id 
      WHERE st.name = ?
    `, [typeName]);
    for (const unit of units) {
      const [existing] = await conn.query('SELECT memberCategoryId FROM sector_unit_categories WHERE sectorUnitId = ?', [unit.id]);
      const existingIds = existing.map(r => r.memberCategoryId);
      for (const catName of expected) {
        const catId = catMap[catName];
        if (!existingIds.includes(catId)) {
          await conn.query('INSERT INTO sector_unit_categories (sectorUnitId, memberCategoryId) VALUES (?, ?)', [unit.id, catId]);
          console.log('  Added missing cat "' + catName + '" to unit "' + unit.name + '"');
        }
      }
    }
  }

  // Final verification
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_unit_categories');
  console.log('\nTotal associations:', rows[0].cnt);

  [rows] = await conn.query(`
    SELECT su.name, st.name as type, COUNT(suc.memberCategoryId) as cats
    FROM sector_units su
    JOIN sector_types st ON su.sectorTypeId = st.id
    JOIN sector_unit_categories suc ON suc.sectorUnitId = su.id
    GROUP BY su.id, su.name, st.name
    HAVING cats < (CASE WHEN st.name='Government Institutions' THEN 3 ELSE 9 END)
  `);
  if (rows.length === 0) {
    console.log('All units have complete category associations!');
  } else {
    console.log('Units still missing categories:', rows.length);
    rows.forEach(r => console.log('  ' + r.name + ': ' + r.cats));
  }

  // No members exist, so no migration needed
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM members');
  console.log('\nMembers:', rows[0].cnt, '- no migration needed');

  await conn.end();
}
fix().catch(e => console.error('ERROR:', e));
