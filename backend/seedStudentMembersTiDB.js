const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const { connectDB, sequelize } = require('./config/db');
const SectorType = require('./models/SectorType');
const SectorUnit = require('./models/SectorUnit');
const MemberCategory = require('./models/MemberCategory');
const SectorUnitCategory = require('./models/SectorUnitCategory');
const Member = require('./models/Member');
const Setting = require('./models/Setting');
const ClassificationEngine = require('./utils/classificationEngine');
const { Op } = require('sequelize');

const STUDENT_NAMES = [
  'Abdi Jemal', 'Amina Mohammed', 'Biruk Tadesse', 'Chaltu Hassen',
  'Dawit Eshetu', 'Eden Gebre', 'Firaol Lemma', 'Genet Worku',
  'Habiba Ahmed', 'Ibrahim Suleiman', 'Jemila Oumer', 'Kebede Alemu',
  'Lemlem Tesfaye', 'Mekdes Wondimu', 'Nuredin Kedir', 'Omar Hussein',
  'Rahel Mulugeta', 'Samiya Yusuf', 'Temesgen Abebe', 'Winta Hailu',
  'Yared Belay', 'Zerihun Desta', 'Amanuel Tekle', 'Bontu Olana',
  'Chernet Ayele', 'Dureti Mohammed', 'Elsa Kebede', 'Fekadu Abdi',
  'Gadisa Teshome', 'Hawa Kedir', 'Ismail Ali', 'Kadiga Jemal',
  'Lensa Fekadu', 'Mahlet Girma', 'Nejat Kemal', 'Oumer Ibrahim',
  'Selam Tesfa', 'Tamirat Abiy', 'Ubax Ali', 'Wondwosen Gebre',
  'Yeshi Dessie', 'Zeytuna Hassen', 'Abebech Ayele', 'Binyam Alemu',
  'Desta Fekadu', 'Eyerusalem Kassa', 'Gammachi Tadesse', 'Hiwot Abebe',
  'Jamila Said', 'Kemer Jemal'
];

function buildStudentMemberData(fullName, sectorUnit, catId, index) {
  const gender = ['Male', 'Female'][index % 2];
  const phone = `+25191${String(100000 + Math.floor(Math.random() * 900000)).padStart(6, '0')}`;
  const email = `${fullName.toLowerCase().replace(/\s+/g, '.')}.${String(index)}@student.et`;
  const age = 18 + (index % 12);

  return {
    fullName,
    gender,
    age,
    phone,
    email,
    addressRegion: 'Dire Dawa',
    addressCity: sectorUnit.name.includes('Woreda') ? 'Dire Dawa' : 'Rural',
    addressWoreda: sectorUnit.name.includes('Woreda') ? sectorUnit.name.replace('Woreda ', '') : String(index % 9 + 1),
    sectorUnitId: sectorUnit.id,
    memberCategoryId: catId,
    branch: sectorUnit.name,
    cluster: sectorUnit.name.includes('Woreda') ? 'Urban' : 'Rural',
    sector: sectorUnit.name,
    membershipType: 'Student',
    wing: {},
    financial: {}
  };
}

async function ensureStudentCategoryLinked() {
  const studentCat = await MemberCategory.findOne({ where: { name: 'Student Members' } });
  if (!studentCat) {
    console.error('"Student Members" category not found');
    process.exit(1);
  }

  const urbanType = await SectorType.findOne({ where: { name: 'Urban Woreda' } });
  const ruralType = await SectorType.findOne({ where: { name: 'Rural Cluster' } });
  if (!urbanType || !ruralType) {
    console.error('Sector types not found');
    process.exit(1);
  }

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

  console.log(`Student Members category: ${added} new links added`);
  if (added === 0) console.log('Student Members already linked to all urban/rural units');
}

async function seedStudentMembers() {
  const studentCat = await MemberCategory.findOne({ where: { name: 'Student Members' } });
  if (!studentCat) { console.error('Student Members category not found'); process.exit(1); }

  const urbanType = await SectorType.findOne({ where: { name: 'Urban Woreda' } });
  const ruralType = await SectorType.findOne({ where: { name: 'Rural Cluster' } });
  if (!urbanType || !ruralType) { console.error('Sector types not found'); process.exit(1); }

  const units = await SectorUnit.findAll({
    where: { sectorTypeId: { [Op.in]: [urbanType.id, ruralType.id] } },
    order: [['name', 'ASC']]
  });

  const settings = await Setting.findOne();
  const currentYear = new Date().getFullYear();
  let studentCount = 0;
  let nameIndex = 0;

  for (const unit of units) {
    const isUrban = unit.name.includes('Woreda');
    const studentsPerUnit = isUrban ? 4 : 3;

    for (let i = 0; i < studentsPerUnit; i++) {
      if (nameIndex >= STUDENT_NAMES.length) nameIndex = 0;
      const fullName = STUDENT_NAMES[nameIndex];
      nameIndex++;

      const memberData = buildStudentMemberData(fullName, unit, studentCat.id, i);

      const memberByEmail = await Member.findOne({ where: { email: memberData.email } });
      if (memberByEmail) {
        continue;
      }

      const classification = ClassificationEngine.autoClassifyAndCalculate(memberData, settings?.contributionRules || null);

      const paymentSchedule = [];
      for (let month = 1; month <= 12; month++) {
        paymentSchedule.push({
          month,
          year: currentYear,
          expectedDate: new Date(currentYear, month - 1, 1).toISOString(),
          status: 'Unpaid',
          actualPaymentDate: null,
          paymentId: null
        });
      }

      const flatMemberData = {
        fullName: memberData.fullName,
        gender: memberData.gender,
        age: memberData.age,
        phone: memberData.phone,
        email: memberData.email,
        addressRegion: memberData.addressRegion,
        addressCity: memberData.addressCity,
        addressWoreda: memberData.addressWoreda,
        sectorUnitId: memberData.sectorUnitId,
        memberCategoryId: memberData.memberCategoryId,
        branch: memberData.branch,
        cluster: memberData.cluster,
        sector: memberData.sector,
        membershipType: 'Student',
        subType: classification.subType,
        classificationRuleId: classification.classificationRuleId,
        contributionMonthlyFee: classification.monthlyFee,
        contributionPercentage: classification.percentage,
        contributionAnnualFee: classification.annualFee,
        contributionHqShare: classification.hqShare,
        contributionBranchShare: classification.branchShare,
        netSalaryGrossSalary: classification.netSalary?.grossSalary || 0,
        netSalaryPensionDeduction: classification.netSalary?.pensionDeduction || 0,
        netSalaryTaxDeduction: classification.netSalary?.taxDeduction || 0,
        netSalaryTotalDeductions: classification.netSalary?.totalDeductions || 0,
        netSalaryNetSalary: classification.netSalary?.netSalary || 0,
        netSalaryContributionFee: classification.netSalary?.contributionFee || 0,
        netSalaryFinalNetSalary: classification.netSalary?.finalNetSalary || 0,
        paymentSchedule,
        paymentStatus: 'Unpaid',
        status: 'Active',
        registrationDate: new Date()
      };

      await Member.create(flatMemberData);
      studentCount++;
    }
  }

  console.log(`Created ${studentCount} new student members`);
  return studentCount;
}

async function main() {
  try {
    console.log('Seeding Student Members to TiDB Cloud...');
    await connectDB();
    await sequelize.sync({ alter: false });

    console.log('\n--- Step 1: Ensure Student Members category linked to urban/rural units ---');
    await ensureStudentCategoryLinked();

    console.log('\n--- Step 2: Seed Student Members ---');
    const total = await seedStudentMembers();

    console.log(`\nStudent Members seeding completed!`);
    console.log(`Total student members created: ${total}`);

    const studentCat = await MemberCategory.findOne({ where: { name: 'Student Members' } });
    if (studentCat) {
      const totalStudents = await Member.count({ where: { memberCategoryId: studentCat.id } });
      console.log(`Total student members in database: ${totalStudents}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

main();
