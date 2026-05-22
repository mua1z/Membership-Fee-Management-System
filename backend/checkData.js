require('dotenv').config();
const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'mcms'});
  
  let [rows] = await conn.query("SELECT COUNT(*) as cnt FROM members m LEFT JOIN sector_units su ON m.sectorUnitId = su.id WHERE m.sectorUnitId IS NOT NULL AND su.id IS NULL");
  console.log('Orphaned sectorUnitId refs:', rows[0].cnt);
  
  [rows] = await conn.query("SELECT COUNT(*) as cnt FROM members m LEFT JOIN member_categories mc ON m.memberCategoryId = mc.id WHERE m.memberCategoryId IS NOT NULL AND mc.id IS NULL");
  console.log('Orphaned memberCategoryId refs:', rows[0].cnt);

  [rows] = await conn.query("SELECT DISTINCT membershipType FROM members");
  console.log('Membership types:', rows.map(r=>r.membershipType));
  
  [rows] = await conn.query("SELECT su.name, COUNT(*) as cnt FROM members m JOIN sector_units su ON m.sectorUnitId = su.id GROUP BY su.name ORDER BY cnt DESC");
  console.log('Members per unit (current):');
  rows.forEach(r=>console.log('  '+r.name+': '+r.cnt));
  
  [rows] = await conn.query("SELECT id, fullName, branch, sector, membershipType FROM members WHERE branch IS NOT NULL AND branch != ''");
  console.log('Members with branch data:', rows.length);
  rows.slice(0,20).forEach(r=>console.log('  id='+r.id+' name='+r.fullName+' branch='+r.branch));

  [rows] = await conn.query("SELECT sectorUnitId, COUNT(*) as cnt FROM members WHERE sectorUnitId IS NOT NULL GROUP BY sectorUnitId ORDER BY cnt DESC");
  console.log('Members per sectorUnitId:');
  rows.forEach(r=>console.log('  unitId='+r.sectorUnitId+': '+r.cnt));
  
  [rows] = await conn.query("SELECT memberCategoryId, COUNT(*) as cnt FROM members WHERE memberCategoryId IS NOT NULL GROUP BY memberCategoryId ORDER BY cnt DESC");
  console.log('Members per memberCategoryId:');
  rows.forEach(r=>console.log('  catId='+r.memberCategoryId+': '+r.cnt));

  // Count members with null sectorUnitId
  [rows] = await conn.query("SELECT COUNT(*) as cnt FROM members WHERE sectorUnitId IS NULL");
  console.log('Members with NULL sectorUnitId:', rows[0].cnt);
  
  [rows] = await conn.query("SELECT COUNT(*) as cnt FROM members WHERE memberCategoryId IS NULL");
  console.log('Members with NULL memberCategoryId:', rows[0].cnt);
  
  // Show member count per sector type via unit association
  [rows] = await conn.query(`
    SELECT st.name as sectorType, COUNT(*) as cnt
    FROM members m
    JOIN sector_units su ON m.sectorUnitId = su.id
    JOIN sector_types st ON su.sectorTypeId = st.id
    GROUP BY st.name
  `);
  console.log('Members per sector type:');
  rows.forEach(r=>console.log('  '+r.sectorType+': '+r.cnt));
  
  await conn.end();
}
check().catch(e=>console.error(e));
