const mysql = require('mysql2/promise');

const data = {
  institution: {
    units: [
      "Mayor's Office", "Prosperity Party Office", "Council", "Mass Media Agency",
      "Auditor General", "Trade Industry Bureau", "Manufacturing Corp",
      "Finance Bureau", "Revenues Authority", "Communication Bureau",
      "Urban Dev Bureau", "Labor Bureau", "Agriculture Bureau", "Land Bureau",
      "Justice Bureau", "Public Service Bureau", "Education Bureau",
      "Social Affairs Bureau", "Health Bureau", "City Manager Office", "Water Authority"
    ],
    categories: ['Employee Members', 'Youth Wing', 'Women Wing']
  },
  urban: {
    units: [
      "Woreda 1 Administration", "Woreda 2 Administration", "Woreda 3 Administration",
      "Woreda 4 Administration", "Woreda 5 Administration", "Woreda 6 Administration",
      "Woreda 7 Administration", "Woreda 8 Administration", "Woreda 9 Administration"
    ],
    categories: [
      'Employee Members', 'Youth Wing', 'Women Wing', 'Resident Youth Wing',
      'Resident Women Wing', 'Student Members', 'Enterprises', 'Investors', 'Urban Residents'
    ]
  },
  rural: {
    units: ["Biyyo Awwalle Cluster", "Wahel Cluster", "Aseliso Cluster", "Jeldessa Cluster"],
    categories: [
      'Employee Members', 'Youth Wing', 'Women Wing', 'Resident Youth Wing',
      'Resident Women Wing', 'Farmer Members', 'Student Members', 'Enterprises', 'Investors'
    ]
  }
};

async function seed() {
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

  // Clear existing data
  await conn.query('DELETE FROM sector_unit_categories');
  await conn.query('DELETE FROM sector_units');
  await conn.query('DELETE FROM sector_types');
  await conn.query('DELETE FROM member_categories');
  console.log('Cleared existing sector data\n');

  // 1. Seed Sector Types
  const [instResult] = await conn.query("INSERT INTO sector_types (name) VALUES ('Government Institutions')");
  const instTypeId = instResult.insertId;
  const [urbanResult] = await conn.query("INSERT INTO sector_types (name) VALUES ('Urban Woredas')");
  const urbanTypeId = urbanResult.insertId;
  const [ruralResult] = await conn.query("INSERT INTO sector_types (name) VALUES ('Rural Clusters')");
  const ruralTypeId = ruralResult.insertId;
  console.log('Created 3 sector types');

  // 2. Seed Member Categories (unique names across all types)
  const allCategoryNames = new Set([
    ...data.institution.categories,
    ...data.urban.categories,
    ...data.rural.categories
  ]);
  const categoryMap = {};
  for (const name of allCategoryNames) {
    const [result] = await conn.query('INSERT INTO member_categories (name) VALUES (?)', [name]);
    categoryMap[name] = result.insertId;
  }
  console.log('Created ' + allCategoryNames.size + ' member categories');

  // 3. Seed Sector Units and Sector Unit Categories
  async function seedUnits(units, typeId, categoryNames) {
    for (const name of units) {
      const [result] = await conn.query(
        'INSERT INTO sector_units (name, sectorTypeId) VALUES (?, ?)',
        [name, typeId]
      );
      const unitId = result.insertId;
      for (const catName of categoryNames) {
        await conn.query(
          'INSERT INTO sector_unit_categories (sectorUnitId, memberCategoryId) VALUES (?, ?)',
          [unitId, categoryMap[catName]]
        );
      }
    }
  }

  await seedUnits(data.institution.units, instTypeId, data.institution.categories);
  await seedUnits(data.urban.units, urbanTypeId, data.urban.categories);
  await seedUnits(data.rural.units, ruralTypeId, data.rural.categories);
  console.log('Created sector unit associations\n');

  // 4. Verify
  let [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_types');
  console.log('Sector types:', rows[0].cnt);
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_units');
  console.log('Sector units:', rows[0].cnt);
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM member_categories');
  console.log('Member categories:', rows[0].cnt);
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sector_unit_categories');
  console.log('Sector-unit-category associations:', rows[0].cnt);

  // Check if any members exist to migrate
  [rows] = await conn.query('SELECT COUNT(*) as cnt FROM members');
  console.log('\nMembers in DB:', rows[0].cnt);

  if (rows[0].cnt > 0) {
    console.log('\n--- Running member migration ---');
    const [members] = await conn.query('SELECT id, membershipType FROM members ORDER BY id');
    const employeeCat = await conn.query("SELECT id FROM member_categories WHERE name = 'Employee Members'");
    const empCatId = employeeCat[0][0].id;

    // Get institution units
    const [instUnits] = await conn.query(
      'SELECT id FROM sector_units WHERE sectorTypeId = ? ORDER BY id',
      [instTypeId]
    );

    let unitIdx = 0;
    for (const m of members) {
      const unitId = instUnits[unitIdx % instUnits.length].id;
      await conn.query(
        'UPDATE members SET sectorUnitId = ?, memberCategoryId = ? WHERE id = ?',
        [unitId, empCatId, m.id]
      );
      unitIdx++;
    }
    console.log('Migrated ' + members.length + ' members');
  } else {
    console.log('\nNo members to migrate (DB is empty). Migration complete.');
  }

  await conn.end();
  console.log('\nDone!');
}

seed().catch(e => console.error('ERROR:', e));
