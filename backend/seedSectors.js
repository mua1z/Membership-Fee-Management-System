// seedSectors.js - Complete Organizational Structure for Prosperity Party Dire Dawa Branch
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });
const { connectDB, sequelize } = require('./config/db');
const SectorType = require('./models/SectorType');
const SectorUnit = require('./models/SectorUnit');
const MemberCategory = require('./models/MemberCategory');
const SectorUnitCategory = require('./models/SectorUnitCategory');
const User = require('./models/User');

// ─── Institution Categories (3) ───────────────────────────────────────────────
const INST_CATEGORIES = [
  'Employee Members',
  'Employee Youth Wing Members',
  'Employee Women Wing Members'
];

// ─── Urban Woreda Categories (9) ───────────────────────────────────────────────
const URBAN_CATEGORIES = [
  'Employee Members',
  'Urban Residents Members',
  'Enterprises',
  'Student Members',
  'Investors',
  'Employee Youth Wing Members',
  'Employee Women Wing Members',
  'Resident Youth Wing Members',
  'Resident Women Wing Members'
];

// ─── Rural Cluster Categories (9) ──────────────────────────────────────────────
const RURAL_CATEGORIES = [
  'Employee Members',
  'Farmer Members',
  'Enterprises',
  'Student Members',
  'Investors',
  'Employee Youth Wing Members',
  'Employee Women Wing Members',
  'Resident Youth Wing Members',
  'Resident Women Wing Members'
];

// ─── Institutions ──────────────────────────────────────────────────────────────
// Each entry: [englishName, parentName|null, [categories]]
const INSTITUTIONS = [
  // Main institutions (level 1, parent=null)
  ['Mayor Office', null],
  ['Prosperity Party Dire Dawa Branch Office', null],
  ['Council', null],
  ['Mass Media Agency', null],
  ['Office of the Auditor General', null],
  ['Trade Industry and Investment Bureau', null],
  ['Micro and Medium Manufacturing Corporation', null],
  ['Finance and Economic Development Bureau', null],
  ['Revenue Authority', null],
  ['Government Communication Affairs Bureau', null],
  ['Construction and Urban Development Bureau', null],
  ['Labor and Skills Bureau', null],
  ['Agriculture Water Mines and Energy Bureau', null],
  ['Land Development and Management Bureau', null],
  ['Justice Security and Legal Affairs Bureau', null],
  ['Public Service and Human Resource Development Bureau', null],
  ['Education Bureau', null],
  ['Women Children and Social Affairs Bureau', null],
  ['Health Bureau', null],
  ['City Manager Office', null],
  ['Water and Sewerage Authority', null],
];

// ─── Urban Woredas ─────────────────────────────────────────────────────────────
const URBAN_WOREDAS = [
  'Woreda 1',
  'Woreda 2',
  'Woreda 3',
  'Woreda 4',
  'Woreda 5',
  'Woreda 6',
  'Woreda 7',
  'Woreda 8',
  'Woreda 9',
];

// ─── Secondary Schools ────────────────────────────────────────────────────────
const SECONDARY_SCHOOLS = [
  '18.1 Dire Dawa General Secondary School',
  '18.2 Addis Ketema Secondary School',
  '18.3 Legehare Secondary School',
  '18.4 Afetisa Secondary School',
  '18.5 Mariam Sefer Secondary School',
  '18.6 Sabiyan Secondary School',
  '18.7 Adisu Secondary School',
  '18.8 Melka Jebdu Secondary School',
];

// ─── Health Institutions ─────────────────────────────────────────────────────
const HEALTH_INSTITUTIONS = [
  '21.1 Dil Chora Hospital',
  '21.2 Sabiyan Hospital',
  '21.3 Legehare Health Center',
  '21.4 Dire Dawa Health Center',
  '21.5 Genda Kore Health Center',
  '21.6 Addis Ketema Health Center',
  '21.7 Goro Health Center',
  '21.8 Melka Health Center',
  '21.9 Industrial Village Health Center',
  '21.10 Dechatu Health Center',
  '21.11 Genda Gerada Health Center',
];

// ─── Rural Clusters ────────────────────────────────────────────────────────────
const RURAL_CLUSTERS = [
  'Biyyo Awwalle Cluster',
  'Wahel Cluster',
  'Aseliso Cluster',
  'Jeldessa Cluster',
];

async function seed() {
  try {
    await connectDB();

    // Add parentId column if it doesn't exist yet
    try {
      await sequelize.query(
        `ALTER TABLE sector_units ADD COLUMN parentId INT NULL REFERENCES sector_units(id)`,
        { type: sequelize.QueryTypes.RAW }
      );
    } catch (e) {
      // Column may already exist — that's fine
    }

    console.log('🌱 Seeding complete organizational structure...');

    // Clear existing data (FK-safe order)
    await SectorUnitCategory.destroy({ where: {} });
    await SectorUnit.destroy({ where: {} });
    await SectorType.destroy({ where: {} });
    await MemberCategory.destroy({ where: {} });

    // 1. Create Sector Types
    const instType = await SectorType.create({ name: 'Institution' });
    const urbanType = await SectorType.create({ name: 'Urban Woreda' });
    const ruralType = await SectorType.create({ name: 'Rural Cluster' });
    const secondaryType = await SectorType.create({ name: 'Secondary School' });
    const healthType = await SectorType.create({ name: 'Health Institution' });
    console.log('✅ Sector types created');

    // 2. Create all Member Categories (unique set across all types)
    const allCatNames = new Set([
      ...INST_CATEGORIES,
      ...URBAN_CATEGORIES,
      ...RURAL_CATEGORIES
    ]);
    const catMap = {};
    for (const name of allCatNames) {
      const cat = await MemberCategory.create({ name });
      catMap[name] = cat.id;
    }
    console.log(`✅ ${Object.keys(catMap).length} member categories created`);

    // 3. Helper: create unit and link categories
    const createUnit = async (name, typeId, catNames, parentId = null) => {
      const unit = await SectorUnit.create({ name, sectorTypeId: typeId, parentId });
      for (const cn of catNames) {
        await SectorUnitCategory.create({
          sectorUnitId: unit.id,
          memberCategoryId: catMap[cn]
        });
      }
      return unit;
    };

    // 4. Seed Institution units (with parent-child hierarchy)
    const instUnitMap = {};
    for (const [name, parentName] of INSTITUTIONS) {
      let parentId = null;
      if (parentName) {
        if (!instUnitMap[parentName]) {
          console.warn(`⚠️ Parent "${parentName}" not found for "${name}", creating as top-level`);
        } else {
          parentId = instUnitMap[parentName].id;
        }
      }
      const unit = await createUnit(name, instType.id, INST_CATEGORIES, parentId);
      instUnitMap[name] = unit;
    }
    console.log(`✅ ${INSTITUTIONS.length} institution units created (with sub-units)`);

    // 5. Seed Secondary School units
    for (const name of SECONDARY_SCHOOLS) {
      await createUnit(name, secondaryType.id, INST_CATEGORIES);
    }
    console.log(`✅ ${SECONDARY_SCHOOLS.length} secondary school units created`);

    // 6. Seed Health Institution units
    for (const name of HEALTH_INSTITUTIONS) {
      await createUnit(name, healthType.id, INST_CATEGORIES);
    }
    console.log(`✅ ${HEALTH_INSTITUTIONS.length} health institution units created`);

    // 7. Seed Urban Woreda units
    for (const name of URBAN_WOREDAS) {
      await createUnit(name, urbanType.id, URBAN_CATEGORIES);
    }
    console.log(`✅ ${URBAN_WOREDAS.length} urban woreda units created`);

    // 8. Seed Rural Cluster units
    for (const name of RURAL_CLUSTERS) {
      await createUnit(name, ruralType.id, RURAL_CATEGORIES);
    }
    console.log(`✅ ${RURAL_CLUSTERS.length} rural cluster units created`);

    // ─── Users ──────────────────────────────────────────────────────────────────
    await User.destroy({ where: {} });

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@mcms.gov.et',
      password: 'Password123!',
      fullName: 'System Administrator',
      role: 'admin'
    });
    console.log('✅ Created Admin: admin@mcms.gov.et / Password123!');

    await User.create({
      username: 'analyst',
      email: 'analyst@mcms.gov.et',
      password: 'Password123!',
      fullName: 'Expert Analyst',
      role: 'expert'
    });
    console.log('✅ Created Expert: analyst@mcms.gov.et / Password123!');

    // Sector officer examples
    const mayorOffice = instUnitMap['Mayor Office'];
    if (mayorOffice) {
      await User.create({
        username: 'mayor_officer',
        email: 'mayor@mcms.gov.et',
        password: 'Password123!',
        fullName: 'Mayor Office Officer',
        role: 'sector_officer',
        sectorUnitId: mayorOffice.id
      });
      console.log('✅ Created: mayor@mcms.gov.et (Mayor Office)');
    }

    const woreda1 = await SectorUnit.findOne({ where: { name: 'Woreda 1' } });
    if (woreda1) {
      await User.create({
        username: 'woreda1_officer',
        email: 'woreda1@mcms.gov.et',
        password: 'Password123!',
        fullName: 'Woreda 1 Officer',
        role: 'sector_officer',
        sectorUnitId: woreda1.id
      });
      console.log('✅ Created: woreda1@mcms.gov.et (Woreda 1)');
    }

    const wahelCluster = await SectorUnit.findOne({ where: { name: 'Wahel Cluster' } });
    if (wahelCluster) {
      await User.create({
        username: 'wahel_officer',
        email: 'wahel@mcms.gov.et',
        password: 'Password123!',
        fullName: 'Wahel Cluster Officer',
        role: 'sector_officer',
        sectorUnitId: wahelCluster.id
      });
      console.log('✅ Created: wahel@mcms.gov.et (Wahel Cluster)');
    }

    console.log('\n🎉 Organizational structure seeded successfully!');
    console.log('Login: admin@mcms.gov.et / Password123!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
