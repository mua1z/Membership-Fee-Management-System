const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const { connectDB } = require('./config/db');
const SectorType = require('./models/SectorType');
const SectorUnit = require('./models/SectorUnit');
const MemberCategory = require('./models/MemberCategory');
const SectorUnitCategory = require('./models/SectorUnitCategory');
const { Op } = require('sequelize');

async function main() {
  try {
    await connectDB();

    const studentCat = await MemberCategory.findOne({ where: { name: 'Student Members' } });
    if (!studentCat) { console.error('❌ "Student Members" category not found'); process.exit(1); }

    const urbanType = await SectorType.findOne({ where: { name: 'Urban Woreda' } });
    const ruralType = await SectorType.findOne({ where: { name: 'Rural Cluster' } });
    if (!urbanType || !ruralType) { console.error('❌ Sector types not found'); process.exit(1); }

    const units = await SectorUnit.findAll({
      where: { sectorTypeId: { [Op.in]: [urbanType.id, ruralType.id] } }
    });

    let added = 0;

    for (const unit of units) {
      const exists = await SectorUnitCategory.findOne({
        where: { sectorUnitId: unit.id, memberCategoryId: studentCat.id }
      });
      if (!exists) {
        await SectorUnitCategory.create({ sectorUnitId: unit.id, memberCategoryId: studentCat.id });
        added++;
      }
    }

    console.log(`✅ Student Members added to ${added} urban/rural sector units`);
    if (added === 0) console.log('⚠️  Student Members already linked to all urban/rural units');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

main();
