const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const { connectDB, sequelize } = require('./config/db');
const SectorType = require('./models/SectorType');
const SectorUnit = require('./models/SectorUnit');
const MemberCategory = require('./models/MemberCategory');
const SectorUnitCategory = require('./models/SectorUnitCategory');
const LandingPageContent = require('./models/LandingPageContent');
const LandingPageImage = require('./models/LandingPageImage');
const News = require('./models/News');
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
const SECONDARY_SCHOOLS = ['Dire Dawa Comprehensive Secondary School','Addis Ketema Secondary School','Legehare Secondary School','Afetisa Secondary School','Mariam Sefer Secondary School','Sabian Secondary School','Addisu Secondary School','Melka Jebdu Secondary School'];
const HEALTH_INSTITUTIONS = ['Dil Chora Hospital','Sabian Hospital','Legehare Health Center','Dire Dawa Health Center','Gendekore Health Center','Addis Ketema Health Center','Goro Health Center','Melka Health Center','Industrial Village Health Center','Dechatu Health Center','Gende Gerade Health Center'];
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

async function migrateNewsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS news (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      category VARCHAR(100) DEFAULT 'news',
      is_active TINYINT(1) DEFAULT 1,
      created_by INT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Add language column if missing (model expects it)
  const [colRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news' AND COLUMN_NAME = 'language'"
  );
  if (colRows[0].cnt === 0) {
    await sequelize.query("ALTER TABLE news ADD COLUMN language VARCHAR(10) DEFAULT 'en'");
  }

  console.log('✅ News table migration completed');
}

async function migrateLandingPageTables() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS landing_page_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      image VARCHAR(500) NOT NULL,
      category VARCHAR(50) DEFAULT 'gallery',
      display_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      uploaded_by INT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const newColumns = [
    { name: 'alt_text', type: 'VARCHAR(500) DEFAULT NULL' },
    { name: 'is_featured', type: 'TINYINT(1) DEFAULT 0' },
    { name: 'language', type: "VARCHAR(10) DEFAULT 'en'" },
    { name: 'file_size', type: 'INT DEFAULT NULL' },
    { name: 'image_width', type: 'INT DEFAULT NULL' },
    { name: 'image_height', type: 'INT DEFAULT NULL' },
    { name: 'thumbnail_small', type: 'VARCHAR(500) DEFAULT NULL' },
    { name: 'thumbnail_medium', type: 'VARCHAR(500) DEFAULT NULL' },
  ];

  for (const col of newColumns) {
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'landing_page_images' AND COLUMN_NAME = ?`,
      { replacements: [col.name] }
    );
    if (rows[0].cnt === 0) {
      await sequelize.query(`ALTER TABLE landing_page_images ADD COLUMN \`${col.name}\` ${col.type}`);
    }
  }

  const indexes = [
    { name: 'idx_category', columns: ['category'] },
    { name: 'idx_is_featured', columns: ['is_featured'] },
    { name: 'idx_created_at', columns: ['created_at'] },
  ];
  for (const idx of indexes) {
    try {
      await sequelize.query(`CREATE INDEX ${idx.name} ON landing_page_images (${idx.columns.join(',')})`);
    } catch (e) {
      // index already exists
    }
  }

  // Ensure category column is VARCHAR not ENUM (production data uses more categories than old ENUM)
  try {
    await sequelize.query("ALTER TABLE landing_page_images MODIFY category VARCHAR(100) DEFAULT 'gallery'");
  } catch (e) {
    // Already VARCHAR
  }

  console.log('✅ Landing page tables migration completed');
}

async function seedNews() {
  console.log('\n--- News ---');
  const admin = await User.findOne({ where: { email: 'admin@mcms.ddu' } });
  const adminId = admin ? admin.id : null;
  if (!adminId) { console.log('⚠️  Admin user not found, skipping news seed'); return; }

  const articles = [
    { title: 'Prosperity Party Dire Dawa Branch Launches New Membership Drive', content: 'The Prosperity Party Dire Dawa Branch Office has officially launched a comprehensive membership drive aimed at increasing community participation and strengthening the party\'s grassroots presence across all nine woredas and four rural clusters.', image: '', category: 'announcements', language: 'en', createdBy: adminId },
    { title: 'የብልጽግና ፓርቲ ድሬዳዋ ቅርንጫፍ አዲስ የአባልነት መመዝገቢያ ዘመቻ አስጀመረ', content: 'የብልጽግና ፓርቲ ድሬዳዋ ቅርንጫፍ ቢሮ የማህበረሰቡን ተሳትፎ ለማሳደግ እና የፓርቲውን መሰረታዊ ተገኝነት በሁሉም ዘጠኝ ወረዳዎች እና አራት የገጠር ክላስተሮች ለማጠናከር ያለመ ሰፊ የአባልነት መመዝገቢያ ዘመቻ መጀመሩን አስታውቋል።', image: '', category: 'announcements', language: 'am', createdBy: adminId },
    { title: 'Digital Transformation: New Membership Fee Management System Goes Live', content: 'The Prosperity Party Dire Dawa Branch Office has deployed a state-of-the-art Membership Fee Management System (MCMS) that digitizes member registration, fee collection, receipt generation, and financial reporting. The system supports both salary-based and non-salary member categories including youth and women wings.', image: '', category: 'news', language: 'en', createdBy: adminId },
    { title: 'Community Development Forum Held in Woreda 3', content: 'A community development forum was held at Woreda 3 bringing together over 200 residents, party officials, and local leaders to discuss infrastructure projects, social services, and economic development initiatives for the coming fiscal year.', image: '', category: 'community', language: 'en', createdBy: adminId },
    { title: 'Youth Wing Leadership Training Concludes Successfully', content: 'The Employee Youth Wing and Resident Youth Wing members participated in a week-long leadership training program focused on organizational skills, community engagement, and the role of youth in political processes. Over 150 youth members completed the training.', image: '', category: 'training', language: 'en', createdBy: adminId },
    { title: 'Women Wing Empowerment Program Expands to Rural Clusters', content: 'The Prosperity Party Women Wing has expanded its empowerment program to all four rural clusters (Biyyo Awwalle, Wahel, Aseliso, and Jeldessa), providing training in financial literacy, entrepreneurship, and leadership skills to women members.', image: '', category: 'community', language: 'en', createdBy: adminId },
    { title: 'Quarterly Financial Report Now Available for Member Review', content: 'The Finance and Economic Development Bureau has published the quarterly membership fee collection and expenditure report. Members can view the report through the MCMS dashboard. The report covers all 23 institutions, 9 urban woredas, and 4 rural clusters.', image: '', category: 'announcements', language: 'en', createdBy: adminId },
  ];

  let count = 0;
  for (const a of articles) {
    const exists = await News.findOne({ where: { title: a.title } });
    if (!exists) {
      await News.create(a);
      count++;
    }
  }
  console.log(`✅ ${count} news articles seeded (${articles.length - count} already existed)`);
}

async function seedGallery() {
  console.log('\n--- Gallery Images ---');
  const admin = await User.findOne({ where: { email: 'admin@mcms.ddu' } });
  const adminId = admin ? admin.id : null;
  if (!adminId) { console.log('⚠️  Admin user not found, skipping gallery seed'); return; }

  const images = [
    { title: 'Prosperity Party Dire Dawa Branch Office Building', image: '/images/placeholder-building.jpg', category: 'office_building', language: 'en', isActive: true, uploadedBy: adminId },
    { title: 'የብልጽግና ፓርቲ ድሬዳዋ ቅርንጫፍ ቢሮ', image: '/images/placeholder-building.jpg', category: 'office_building', language: 'am', isActive: true, uploadedBy: adminId },
    { title: 'Community Engagement Forum at Woreda 5', image: '/images/placeholder-event.jpg', category: 'community', language: 'en', isActive: true, uploadedBy: adminId },
    { title: 'Leadership Training Session - Youth Wing', image: '/images/placeholder-training.jpg', category: 'training', language: 'en', isActive: true, uploadedBy: adminId },
    { title: 'Annual General Meeting 2025', image: '/images/placeholder-event.jpg', category: 'events', language: 'en', isActive: true, uploadedBy: adminId },
    { title: 'Office Building - Main Entrance', image: '/images/placeholder-building.jpg', category: 'office_building', language: 'en', isFeatured: true, isActive: true, uploadedBy: adminId },
    { title: 'Women Wing Empowerment Workshop', image: '/images/placeholder-training.jpg', category: 'training', language: 'en', isActive: true, uploadedBy: adminId },
    { title: 'Dire Dawa City Panorama', image: '/images/placeholder-scenery.jpg', category: 'gallery', language: 'en', isFeatured: true, isActive: true, uploadedBy: adminId },
  ];

  let count = 0;
  for (const img of images) {
    const exists = await LandingPageImage.findOne({ where: { title: img.title, image: img.image } });
    if (!exists) {
      await LandingPageImage.create(img);
      count++;
    }
  }
  console.log(`✅ ${count} gallery images seeded (${images.length - count} already existed)`);
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

    // Migrate news and gallery tables
    try { await migrateNewsTable(); } catch (e) { console.log('ℹ️  News migration:', e.message); }
    try { await migrateLandingPageTables(); } catch (e) { console.log('ℹ️  Landing pages migration:', e.message); }

    await ensureSectorStructure();
    await seedUsers();
    await seedLandingContent();
    await seedNews();
    await seedGallery();

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
