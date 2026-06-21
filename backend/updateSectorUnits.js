const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const { connectDB } = require('./config/db');
const SectorType = require('./models/SectorType');
const SectorUnit = require('./models/SectorUnit');
const MemberCategory = require('./models/MemberCategory');
const SectorUnitCategory = require('./models/SectorUnitCategory');

const INST_CATEGORIES = ['Employee Members', 'Employee Youth Wing Members', 'Employee Women Wing Members'];

const HEALTH_INSTITUTIONS = [
  'Dil Chora Hospital',
  'Sabian Hospital',
  'Legehare Health Center',
  'Dire Dawa Health Center',
  'Gendekore Health Center',
  'Addis Ketema Health Center',
  'Goro Health Center',
  'Melka Health Center',
  'Industrial Village Health Center',
  'Dechatu Health Center',
  'Gende Gerade Health Center',
];

const SECONDARY_SCHOOLS = [
  'Dire Dawa Comprehensive Secondary School',
  'Addis Ketema Secondary School',
  'Legehare Secondary School',
  'Afetisa Secondary School',
  'Mariam Sefer Secondary School',
  'Sabian Secondary School',
  'Addisu Secondary School',
  'Melka Jebdu Secondary School',
];

async function main() {
  try {
    await connectDB();

    const healthType = await SectorType.findOne({ where: { name: 'Health Institution' } });
    const secondaryType = await SectorType.findOne({ where: { name: 'Secondary School' } });

    if (!healthType) { console.error('❌ Health Institution sector type not found'); process.exit(1); }
    if (!secondaryType) { console.error('❌ Secondary School sector type not found'); process.exit(1); }

    // 1. Delete old sector unit categories and units
    const oldHealthUnits = await SectorUnit.findAll({ where: { sectorTypeId: healthType.id } });
    const oldSecondaryUnits = await SectorUnit.findAll({ where: { sectorTypeId: secondaryType.id } });
    const oldIds = [...oldHealthUnits, ...oldSecondaryUnits].map(u => u.id);

    if (oldIds.length > 0) {
      await SectorUnitCategory.destroy({ where: { sectorUnitId: oldIds } });
      await SectorUnit.destroy({ where: { id: oldIds } });
      console.log(`✅ Deleted ${oldIds.length} old sector units`);
    } else {
      console.log('⚠️ No existing sector units found to delete');
    }

    // 2. Get category IDs
    const catMap = {};
    for (const name of INST_CATEGORIES) {
      const cat = await MemberCategory.findOne({ where: { name } });
      if (!cat) { console.error(`❌ Member category "${name}" not found`); process.exit(1); }
      catMap[name] = cat.id;
    }

    // 3. Create new health institution units
    for (const name of HEALTH_INSTITUTIONS) {
      const unit = await SectorUnit.create({ name, sectorTypeId: healthType.id, parentId: null });
      for (const cn of INST_CATEGORIES) {
        await SectorUnitCategory.create({ sectorUnitId: unit.id, memberCategoryId: catMap[cn] });
      }
    }
    console.log(`✅ Created ${HEALTH_INSTITUTIONS.length} health institution units`);

    // 4. Create new secondary school units
    for (const name of SECONDARY_SCHOOLS) {
      const unit = await SectorUnit.create({ name, sectorTypeId: secondaryType.id, parentId: null });
      for (const cn of INST_CATEGORIES) {
        await SectorUnitCategory.create({ sectorUnitId: unit.id, memberCategoryId: catMap[cn] });
      }
    }
    console.log(`✅ Created ${SECONDARY_SCHOOLS.length} secondary school units`);

    console.log('\n🎉 Sector units updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

main();
