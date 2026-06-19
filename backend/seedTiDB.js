const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const { connectDB, sequelize } = require('./config/db');
const SectorType = require('./models/SectorType');
const SectorUnit = require('./models/SectorUnit');
const MemberCategory = require('./models/MemberCategory');
const SectorUnitCategory = require('./models/SectorUnitCategory');
const LandingPageContent = require('./models/LandingPageContent');
const User = require('./models/User');

// ─── Sector data ──────────────────────────────────────────────────────────────
const INST_CATEGORIES = ['Employee Members', 'Employee Youth Wing Members', 'Employee Women Wing Members'];
const URBAN_CATEGORIES = ['Employee Members', 'Urban Residents Members', 'Enterprises', 'Student Members', 'Investors', 'Employee Youth Wing Members', 'Employee Women Wing Members', 'Resident Youth Wing Members', 'Resident Women Wing Members'];
const RURAL_CATEGORIES = ['Employee Members', 'Farmer Members', 'Enterprises', 'Student Members', 'Investors', 'Employee Youth Wing Members', 'Employee Women Wing Members', 'Resident Youth Wing Members', 'Resident Women Wing Members'];

const INSTITUTIONS = [
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
  ['Transport and Logistics Authority', null],
  ['Dire Dawa University', null],
];

const URBAN_WOREDAS = ['Woreda 1','Woreda 2','Woreda 3','Woreda 4','Woreda 5','Woreda 6','Woreda 7','Woreda 8','Woreda 9'];
const SECONDARY_SCHOOLS = ['18.1 Dire Dawa General Secondary School','18.2 Addis Ketema Secondary School','18.3 Legehare Secondary School','18.4 Afetisa Secondary School','18.5 Mariam Sefer Secondary School','18.6 Sabiyan Secondary School','18.7 Adisu Secondary School','18.8 Melka Jebdu Secondary School'];
const HEALTH_INSTITUTIONS = ['21.1 Dil Chora Hospital','21.2 Sabiyan Hospital','21.3 Legehare Health Center','21.4 Dire Dawa Health Center','21.5 Genda Kore Health Center','21.6 Addis Ketema Health Center','21.7 Goro Health Center','21.8 Melka Health Center','21.9 Industrial Village Health Center','21.10 Dechatu Health Center','21.11 Genda Gerada Health Center'];
const RURAL_CLUSTERS = ['Biyyo Awwalle Cluster','Wahel Cluster','Aseliso Cluster','Jeldessa Cluster'];

// ─── Landing page content defaults ────────────────────────────────────────────
const LANDING_CONTENT = {
  hero_title: 'Membership Fee Management System',
  hero_subtitle: 'Efficient & Transparent Member Contributions',
  hero_description: 'A secure, elegant platform designed for organizational excellence and transparency.',
  hero_button_text: 'Get Started',
  hero_button_link: '/login',
  hero_background_image: '',
  about_title: 'About Prosperity Party Dire Dawa Branch Office',
  about_description: 'The Prosperity Party Dire Dawa Branch Office is committed to serving its members with transparency, efficiency, and integrity. Our membership fee management system streamlines contributions, tracking, and reporting.',
  mission_text: 'To provide efficient and transparent membership fee management services that empower our members and strengthen our organization.',
  vision_text: 'To be a model of excellence in membership fee administration and organizational financial management.',
  leadership_message: 'Our commitment to transparency, efficiency, and member satisfaction drives everything we do. We are dedicated to serving the Prosperity Party Dire Dawa Branch Office.',
  leadership_executive_name: 'Executive Director',
  leadership_executive_role: 'Prosperity Party Dire Dawa Branch Office',
  ai_section_title: 'AI Operations Agent',
  ai_section_description: 'Leverage the power of artificial intelligence to streamline your membership management. Our intelligent agents provide real-time assistance, generate comprehensive reports, and offer predictive analytics.',
  stats_section_title: 'Our Impact in Numbers',
  cta_title: 'Join Our Mission',
  cta_subtitle: 'Be Part of Something Greater',
  cta_description: 'Together we build a prosperous future for Dire Dawa. Your membership contribution fuels our collective growth and community development.',
  footer_description: 'The Prosperity Party Dire Dawa Branch Office Membership Fee Management System. Efficient, transparent, and secure management of member contributions.',
  address: 'Dire Dawa, Ethiopia',
  phone: '+251 25 111 0000',
  email: 'info@pp-diredawa.org',
  map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d252376.41932627846!2d41.77087075!3d9.600193!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1631e5a7b7b7b7b7%3A0x7b7b7b7b7b7b7b!2sDire%20Dawa%2C%20Ethiopia!5e0!3m2!1sen!2s!4v1',
  office_email: 'info@pp-diredawa.org',
  office_postal_code: '1000',
  office_hours: 'Monday - Friday: 8:00 AM - 5:00 PM',
  contact_whatsapp: '+251 25 111 0000',
  facebook_url: 'https://facebook.com/pp-diredawa',
  telegram_url: 'https://t.me/pp-diredawa',
  youtube_url: 'https://youtube.com/@pp-diredawa',
  chairperson_name: 'Chairperson',
  chairperson_message: 'Welcome to our membership fee management system. Together, we build a better Dire Dawa.',
  privacy_policy_url: '#',
  terms_of_service_url: '#',
  copyright_text: '© Prosperity Party Dire Dawa Branch Office. All rights reserved.',
};

async function ensureSectorStructure() {
  console.log('\n--- Sector Structure ---');

  const instType = await SectorType.findOrCreate({ where: { name: 'Institution' }, defaults: { name: 'Institution' } });
  const urbanType = await SectorType.findOrCreate({ where: { name: 'Urban Woreda' }, defaults: { name: 'Urban Woreda' } });
  const ruralType = await SectorType.findOrCreate({ where: { name: 'Rural Cluster' }, defaults: { name: 'Rural Cluster' } });
  const secondaryType = await SectorType.findOrCreate({ where: { name: 'Secondary School' }, defaults: { name: 'Secondary School' } });
  const healthType = await SectorType.findOrCreate({ where: { name: 'Health Institution' }, defaults: { name: 'Health Institution' } });
  console.log('✅ Sector types ensured');

  const allCatNames = new Set([...INST_CATEGORIES, ...URBAN_CATEGORIES, ...RURAL_CATEGORIES]);
  const catMap = {};
  for (const name of allCatNames) {
    const [cat] = await MemberCategory.findOrCreate({ where: { name }, defaults: { name } });
    catMap[name] = cat.id;
  }
  console.log(`✅ ${Object.keys(catMap).length} member categories ensured`);

  const createUnit = async (name, typeId, catNames, parentId = null) => {
    const [unit] = await SectorUnit.findOrCreate({
      where: { name },
      defaults: { name, sectorTypeId: typeId, parentId }
    });
    for (const cn of catNames) {
      await SectorUnitCategory.findOrCreate({
        where: { sectorUnitId: unit.id, memberCategoryId: catMap[cn] },
        defaults: { sectorUnitId: unit.id, memberCategoryId: catMap[cn] }
      });
    }
    return unit;
  };

  const instTypeId = instType[0].id;
  const urbanTypeId = urbanType[0].id;
  const ruralTypeId = ruralType[0].id;
  const secondaryTypeId = secondaryType[0].id;
  const healthTypeId = healthType[0].id;

  for (const [name] of INSTITUTIONS) {
    await createUnit(name, instTypeId, INST_CATEGORIES);
  }
  console.log(`✅ ${INSTITUTIONS.length} institution units ensured (including Dire Dawa University)`);

  for (const name of SECONDARY_SCHOOLS) {
    await createUnit(name, secondaryTypeId, INST_CATEGORIES);
  }
  console.log(`✅ ${SECONDARY_SCHOOLS.length} secondary school units ensured`);

  for (const name of HEALTH_INSTITUTIONS) {
    await createUnit(name, healthTypeId, INST_CATEGORIES);
  }
  console.log(`✅ ${HEALTH_INSTITUTIONS.length} health institution units ensured`);

  for (const name of URBAN_WOREDAS) {
    await createUnit(name, urbanTypeId, URBAN_CATEGORIES);
  }
  console.log(`✅ ${URBAN_WOREDAS.length} urban woreda units ensured`);

  for (const name of RURAL_CLUSTERS) {
    await createUnit(name, ruralTypeId, RURAL_CATEGORIES);
  }
  console.log(`✅ ${RURAL_CLUSTERS.length} rural cluster units ensured`);
}

async function seedLandingContent() {
  console.log('\n--- Landing Page Content ---');
  let count = 0;
  for (const [key, value] of Object.entries(LANDING_CONTENT)) {
    const existing = await LandingPageContent.findOne({ where: { key } });
    if (!existing) {
      await LandingPageContent.create({ key, value });
      count++;
    }
  }
  console.log(`✅ ${count} landing page content keys seeded (${Object.keys(LANDING_CONTENT).length - count} already existed)`);
}

async function seedUsers() {
  console.log('\n--- Users ---');
  const usersToCreate = [
    { username: 'admin',     email: 'admin@mcms.ddu',            password: 'admin123',       fullName: 'System Administrator',          role: 'admin' },
    { username: 'operator',  email: 'operator@mcms.ddu',         password: 'operator123',    fullName: 'System Operator',               role: 'sector_officer' },
    { username: 'admin-pp',  email: 'admin@pp-diredawa.org',     password: 'admin123',       fullName: 'PP Dire Dawa Administrator',    role: 'admin' },
    { username: 'superadmin',email: 'superadmin@pp-diredawa.org',password: 'superadmin123', fullName: 'Super Administrator',            role: 'super_admin' },
    { username: 'seyfedin',  email: 'seyfedin@pp-diredawa.org', password: 'seyfedin@2026', fullName: 'Seyfedin',                      role: 'admin' },
  ];

  let count = 0;
  for (const u of usersToCreate) {
    const exists = await User.findOne({ where: { email: u.email } });
    if (!exists) {
      await User.create(u);
      count++;
    }
  }
  console.log(`✅ ${count} users seeded (${usersToCreate.length - count} already existed)`);
}

async function main() {
  try {
    console.log('🌱 Seeding TiDB Cloud...');
    await connectDB();
    await sequelize.sync({ alter: false });

    // Migrate wingType column from ENUM to STRING (TiDB limitation: can't use alter:true)
    try {
      await sequelize.query("ALTER TABLE `members` MODIFY `wingType` VARCHAR(100) DEFAULT NULL;");
      console.log('✅ wingType column migrated');
    } catch (e) {
      // Column may already be VARCHAR — that's fine
      if (!e.message?.includes('Duplicate')) console.log('ℹ️  wingType migration:', e.message);
    }

    await ensureSectorStructure();
    await seedLandingContent();
    await seedUsers();

    console.log('\n🎉 TiDB Cloud seeding completed successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin:            admin@mcms.ddu / admin123');
    console.log('   Operator:         operator@mcms.ddu / operator123');
    console.log('   PP Admin:         admin@pp-diredawa.org / admin123');
    console.log('   Super Admin:      superadmin@pp-diredawa.org / superadmin123');
    console.log('   Seyfedin:         seyfedin@pp-diredawa.org / seyfedin@2026');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

main();
