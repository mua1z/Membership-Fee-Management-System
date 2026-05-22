// seed.js - Sample Data Seeder (MySQL / Sequelize Migration)
const dotenv = require('dotenv');
dotenv.config();

const { connectDB, sequelize } = require('./config/db');
const Member = require('./models/Member');
const User = require('./models/User');
const Payment = require('./models/Payment');
const Receipt = require('./models/Receipt');
const Setting = require('./models/Setting');
const Contribution = require('./models/Contribution');
const ClassificationEngine = require('./utils/classificationEngine');

// ─── Helper: flatten nested member data → flat DB columns ────────────────────
function flattenMemberData(data) {
  const flat = { ...data };

  if (data.address) {
    flat.addressRegion = data.address.region ?? 'Dire Dawa';
    flat.addressCity   = data.address.city   ?? 'Dire Dawa';
    flat.addressWoreda = data.address.woreda ?? '01';
    delete flat.address;
  }

  if (data.financial) {
    flat.financialSalary          = data.financial.salary          ?? 0;
    flat.financialEmploymentType  = data.financial.employmentType  ?? null;
    flat.financialCurrency        = data.financial.currency        ?? 'ETB';
    flat.financialAllowances      = data.financial.allowances      ?? 0;
    flat.financialOccupationType  = data.financial.occupationType  ?? null;
    flat.financialEstimatedIncome = data.financial.estimatedIncome ?? 0;
    flat.financialBusinessType    = data.financial.businessType    ?? null;
    flat.financialBusinessName    = data.financial.businessName    ?? null;
    flat.financialEmployees       = data.financial.employees       ?? 0;
    flat.financialIncome          = data.financial.income          ?? 0;
    flat.financialCapital         = data.financial.capital         ?? 0;
    flat.financialInvestmentType  = data.financial.investmentType  ?? null;
    delete flat.financial;
  }

  if (data.contribution) {
    flat.contributionMonthlyFee  = data.contribution.monthlyFee  ?? 0;
    flat.contributionPercentage  = data.contribution.percentage  ?? 0;
    flat.contributionAnnualFee   = data.contribution.annualFee   ?? 0;
    flat.contributionHqShare     = data.contribution.hqShare     ?? 0;
    flat.contributionBranchShare = data.contribution.branchShare ?? 0;
    delete flat.contribution;
  }

  if (data.wing) {
    flat.wingType           = data.wing.wingType       ?? null;
    flat.wingParentMemberId = data.wing.parentMemberId ?? null;
    delete flat.wing;
  }

  return flat;
}

const sampleMembers = [
  // URBAN SECTORS
  // Kebele
  {
    fullName: 'Abebe Kebede',
    gender: 'Male',
    age: 35,
    phone: '+251911000001',
    email: 'abebe@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '01' },
    branch: 'Kebele 01',
    cluster: 'Urban',
    sector: 'Kebele',
    membershipType: 'Salary-Based',
    financial: { salary: 15000, employmentType: 'Government', currency: 'ETB', allowances: 0 }
  },
  {
    fullName: 'Tigist Hailu',
    gender: 'Female',
    age: 35,
    phone: '+251911000002',
    email: 'tigist@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '02' },
    branch: 'Kebele 02',
    cluster: 'Urban',
    sector: 'Kebele',
    membershipType: 'Salary-Based',
    financial: { salary: 25000, employmentType: 'Private', currency: 'ETB', allowances: 0 }
  },
  
  // Government Office
  {
    fullName: 'Cabinet Minister User',
    gender: 'Male',
    age: 28,
    phone: '+251911000013',
    email: 'minister@gov.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '01' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: 'Government Office',
    membershipType: 'Salary-Based',
    financial: { salary: 45000, employmentType: 'Government', currency: 'ETB', allowances: 5000 }
  },
  
  // Health Facility
  {
    fullName: 'Dr. Selam Worku',
    gender: 'Female',
    age: 52,
    phone: '+251911000014',
    email: 'selam@hospital.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '03' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: 'Health Facility',
    membershipType: 'Salary-Based',
    financial: { salary: 35000, employmentType: 'Government', currency: 'ETB', allowances: 3000 }
  },
  
  // Education Institution
  {
    fullName: 'Prof. Alemayehu Tola',
    gender: 'Male',
    age: 42,
    phone: '+251911000015',
    email: 'alemayehu@university.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '04' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: 'Education Institution',
    membershipType: 'Salary-Based',
    financial: { salary: 28000, employmentType: 'Government', currency: 'ETB', allowances: 2000 }
  },
  
  // Private Company
  {
    fullName: 'Mohammed Ahmed',
    gender: 'Male',
    age: 58,
    phone: '+251911000003',
    email: 'mohammed@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '03' },
    branch: 'Kebele 03',
    cluster: 'Urban',
    sector: 'Private Company',
    membershipType: 'Business',
    financial: { businessType: 'Retail', businessName: 'Mohammed Trading', employees: 10, income: 150000 }
  },
  
  // NGO
  {
    fullName: 'Hana Desta',
    gender: 'Female',
    age: 33,
    phone: '+251911000008',
    email: 'hana@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '08' },
    branch: 'Kebele 05',
    cluster: 'Urban',
    sector: 'NGO',
    membershipType: 'Salary-Based',
    financial: { salary: 50000, employmentType: 'NGO', currency: 'ETB', allowances: 0 }
  },
  
  // Bank
  {
    fullName: 'Ebissa Nigussie',
    gender: 'Male',
    age: 45,
    phone: '+251911000016',
    email: 'ebissa@bank.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '05' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: 'Bank',
    membershipType: 'Salary-Based',
    financial: { salary: 32000, employmentType: 'Private', currency: 'ETB', allowances: 4000 }
  },
  
  // Embassy
  {
    fullName: 'John Smith',
    gender: 'Male',
    age: 37,
    phone: '+251911000011',
    email: 'john@embassy.example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '01' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: 'Embassy',
    membershipType: 'Salary-Based',
    financial: { salary: 5000, employmentType: 'Embassy', currency: 'USD', allowances: 0 }
  },
  
  // Micro Enterprise
  {
    fullName: 'Meron Tadesse',
    gender: 'Female',
    age: 48,
    phone: '+251911000012',
    email: 'meron@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '02' },
    branch: 'Kebele 07',
    cluster: 'Urban',
    sector: 'Micro Enterprise',
    membershipType: 'Business',
    financial: { businessType: 'Service', businessName: 'Meron Cafe', employees: 3, income: 40000 }
  },
  
  // Small Business
  {
    fullName: 'Kidus Bekele',
    gender: 'Male',
    age: 29,
    phone: '+251911000017',
    email: 'kidus@business.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '06' },
    branch: 'Kebele 06',
    cluster: 'Urban',
    sector: 'Small Business',
    membershipType: 'Business',
    financial: { businessType: 'Retail', businessName: 'Kidus Shop', employees: 15, income: 200000 }
  },
  
  // Medium Business
  {
    fullName: 'Nahum Solomon',
    gender: 'Male',
    age: 41,
    phone: '+251911000018',
    email: 'nahum@medium.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '07' },
    branch: 'Kebele 08',
    cluster: 'Urban',
    sector: 'Medium Business',
    membershipType: 'Business',
    financial: { businessType: 'Manufacturing', businessName: 'Nahum Factory', employees: 50, income: 500000 }
  },
  
  // Market
  {
    fullName: 'Aisha Mohammed',
    gender: 'Female',
    age: 55,
    phone: '+251911000019',
    email: 'aisha@market.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '08' },
    branch: 'Kebele 09',
    cluster: 'Urban',
    sector: 'Market',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Informal', estimatedIncome: 20000 }
  },
  
  // Factory
  {
    fullName: 'Girma Teshome',
    gender: 'Male',
    age: 31,
    phone: '+251911000020',
    email: 'girma@factory.et',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '09' },
    branch: 'Kebele 10',
    cluster: 'Urban',
    sector: 'Factory',
    membershipType: 'Investor',
    financial: { capital: 15000000, investmentType: 'Manufacturing' }
  },
  
  // RURAL SECTORS
  // Woreda
  {
    fullName: 'Bacha Tola',
    gender: 'Male',
    age: 60,
    phone: '+251911000021',
    email: 'bacha@woreda.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 01' },
    branch: 'Kebele 01',
    cluster: 'Rural',
    sector: 'Woreda',
    membershipType: 'Salary-Based',
    financial: { salary: 8000, employmentType: 'Government', currency: 'ETB', allowances: 1000 }
  },
  
  // Farming
  {
    fullName: 'Fatima Osman',
    gender: 'Female',
    age: 44,
    phone: '+251911000006',
    email: 'fatima@example.com',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 02' },
    branch: 'Kebele 04',
    cluster: 'Rural',
    sector: 'Farming',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Farmer', estimatedIncome: 30000 }
  },
  
  // Pastoral
  {
    fullName: 'Abdi Hassan',
    gender: 'Male',
    age: 38,
    phone: '+251911000009',
    email: 'abdi@example.com',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 03' },
    branch: 'Kebele 06',
    cluster: 'Rural',
    sector: 'Pastoral',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Pastoralist', estimatedIncome: 25000 }
  },
  
  // Agro Activity
  {
    fullName: 'Daba Gelgelo',
    gender: 'Male',
    age: 50,
    phone: '+251911000022',
    email: 'daba@agro.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 04' },
    branch: 'Kebele 02',
    cluster: 'Rural',
    sector: 'Agro Activity',
    membershipType: 'Business',
    financial: { businessType: 'Agro', businessName: 'Daba Farm', employees: 8, income: 120000 }
  },
  
  // Cooperative
  {
    fullName: 'Almaz Ahmed',
    gender: 'Female',
    age: 36,
    phone: '+251911000023',
    email: 'almaz@coop.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 05' },
    branch: 'Kebele 03',
    cluster: 'Rural',
    sector: 'Cooperative',
    membershipType: 'Business',
    financial: { businessType: 'Cooperative', businessName: 'Almaz Coop', employees: 25, income: 300000 }
  },
  
  // Local Market
  {
    fullName: 'Hussein Ali',
    gender: 'Male',
    age: 47,
    phone: '+251911000024',
    email: 'hussein@local.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 06' },
    branch: 'Kebele 05',
    cluster: 'Rural',
    sector: 'Local Market',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Informal', estimatedIncome: 15000 }
  },
  
  // Labor
  {
    fullName: 'Tadesse Worku',
    gender: 'Male',
    age: 34,
    phone: '+251911000025',
    email: 'tadesse@labor.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 07' },
    branch: 'Kebele 07',
    cluster: 'Rural',
    sector: 'Labor',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Labor', estimatedIncome: 10000 }
  },
  
  // Informal Work
  {
    fullName: 'Zainab Omar',
    gender: 'Female',
    age: 27,
    phone: '+251911000026',
    email: 'zainab@informal.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 08' },
    branch: 'Kebele 08',
    cluster: 'Rural',
    sector: 'Informal Work',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Informal', estimatedIncome: 12000 }
  },
  
  // Self Employed
  {
    fullName: 'Yusuf Mohammed',
    gender: 'Male',
    age: 43,
    phone: '+251911000027',
    email: 'yusuf@self.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 09' },
    branch: 'Kebele 09',
    cluster: 'Rural',
    sector: 'Self Employed',
    membershipType: 'Non-Salary',
    financial: { occupationType: 'Informal', estimatedIncome: 18000 }
  },
  
  // Rural School
  {
    fullName: 'Teacher User',
    gender: 'Male',
    age: 39,
    phone: '+251911000028',
    email: 'teacher@rural.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 10' },
    branch: 'Kebele 10',
    cluster: 'Rural',
    sector: 'Rural School',
    membershipType: 'Salary-Based',
    financial: { salary: 12000, employmentType: 'Government', currency: 'ETB', allowances: 1500 }
  },
  
  // Health Post
  {
    fullName: 'Nurse Worker',
    gender: 'Female',
    age: 56,
    phone: '+251911000029',
    email: 'nurse@healthpost.et',
    address: { region: 'Dire Dawa', city: 'Rural', woreda: 'Woreda 11' },
    branch: 'Kebele 01',
    cluster: 'Rural',
    sector: 'Health Post',
    membershipType: 'Salary-Based',
    financial: { salary: 10000, employmentType: 'Government', currency: 'ETB', allowances: 1000 }
  },
  
  // Wings
  {
    fullName: 'Sara Tesfaye',
    gender: 'Female',
    age: 32,
    phone: '+251911000004',
    email: 'sara@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '04' },
    branch: 'Women Wing',
    cluster: 'N/A',
    sector: '',
    membershipType: 'Wing',
    wing: { wingType: 'Women' }
  },
  {
    fullName: 'Yonas Gebre',
    gender: 'Male',
    age: 40,
    phone: '+251911000007',
    email: 'yonas@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '07' },
    branch: 'Youth Wing',
    cluster: 'N/A',
    sector: '',
    membershipType: 'Student'
  },
  
  // Investor (Large)
  {
    fullName: 'Daniel Bekele',
    gender: 'Male',
    age: 26,
    phone: '+251911000005',
    email: 'daniel@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '05' },
    branch: 'Kebele 03',
    cluster: 'Urban',
    sector: 'Private Company',
    membershipType: 'Investor',
    financial: { capital: 8000000, investmentType: 'Manufacturing' }
  },
  
  // Student
  {
    fullName: 'Bethlehem Alemayehu',
    gender: 'Female',
    age: 46,
    phone: '+251911000010',
    email: 'bethlehem@example.com',
    address: { region: 'Dire Dawa', city: 'Dire Dawa', woreda: '10' },
    branch: 'Dire Dawa Main',
    cluster: 'Urban',
    sector: 'Education Institution',
    membershipType: 'Student'
  }
];

async function seed() {
  try {
    console.log('🌱 Seeding database (MySQL)...');

    // Connect to MySQL
    await connectDB();

    // Idempotent guard: skip if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@mcms.ddu' } });
    if (existingAdmin) {
      console.log('Database already seeded (admin user found). Skipping.');
      process.exit(0);
    }

    // Clear in FK-safe order: children before parents
    await Receipt.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Contribution.destroy({ where: {} });
    await Member.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Setting.destroy({ where: {} });
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@mcms.ddu',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'admin'
    });
    console.log('✅ Created admin user: admin@mcms.ddu / admin123');

    // Create operator user
    const operatorUser = await User.create({
      username: 'operator',
      email: 'operator@mcms.ddu',
      password: 'operator123',
      fullName: 'System Operator',
      role: 'operator'
    });
    console.log('✅ Created operator user: operator@mcms.ddu / operator123');

    // Create members with auto-classification
    const createdMembers = [];
    const currentYear = new Date().getFullYear();
    for (const memberData of sampleMembers) {
      const classification = ClassificationEngine.autoClassifyAndCalculate(memberData);

      // Generate 12-month payment schedule
      const paymentSchedule = [];
      for (let month = 1; month <= 12; month++) {
        paymentSchedule.push({
          month,
          year: currentYear,
          expectedDate: new Date(currentYear, month - 1, 1),
          status: 'Unpaid',
          actualPaymentDate: null,
          paymentId: null
        });
      }

      const flat = flattenMemberData({
        ...memberData,
        subType: classification.subType,
        classificationRuleId: classification.classificationRuleId,
        cluster: classification.cluster || memberData.cluster || 'N/A',
        sector: memberData.sector || '',
        contribution: {
          monthlyFee: classification.monthlyFee || 0,
          percentage: classification.percentage || 0,
          annualFee: classification.annualFee || 0,
          hqShare: classification.hqShare || 0,
          branchShare: classification.branchShare || 0
        },
        netSalary: classification.netSalary || {},
        paymentSchedule,
        status: 'Active',
        paymentStatus: Math.random() > 0.3 ? 'Paid' : 'Unpaid'
      });

      const member = await Member.create(flat);
      createdMembers.push(member);
    }
    console.log(`✅ Created ${createdMembers.length} sample members`);

    // Create some sample payments
    const paidMembers = createdMembers.filter(m => m.paymentStatus === 'Paid');
    for (const member of paidMembers.slice(0, 8)) {
      const receiptId = `RCP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const paymentAmount = member.contributionMonthlyFee || 100;
      const paymentMethod = ['Cash', 'Bank Transfer', 'Mobile Money'][Math.floor(Math.random() * 3)];
      const periodMonth = new Date().getMonth() + 1;
      const periodYear = new Date().getFullYear();

      const payment = await Payment.create({
        receiptId,
        memberDbId: member.id,
        memberId: member.memberId,
        amount: paymentAmount,
        currency: member.financialCurrency || 'ETB',
        frequency: 'Monthly',
        method: paymentMethod,
        periodMonth: periodMonth,
        periodYear: periodYear,
        receivedBy: 'System Operator',
        status: 'Paid'
      });

      await Receipt.create({
        receiptId,
        paymentDbId: payment.id,
        memberDbId: member.id,
        memberId: member.memberId,
        memberName: member.fullName,
        amount: payment.amount,
        currency: payment.currency,
        periodMonth: payment.periodMonth,
        periodYear: payment.periodYear,
        paymentMethod: payment.method,
        issuedBy: 'System Operator',
        branch: member.branch
      });
    }
    console.log(`✅ Created sample payments and receipts`);

    // Create default settings with cluster/sector structure
    await Setting.create({
      branches: [
        { name: 'Dire Dawa Main', code: 'MAIN', cluster: 'Urban', sector: 'Government Office', isActive: true },
        { name: 'Kebele 01', code: 'K01', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 02', code: 'K02', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 03', code: 'K03', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 04', code: 'K04', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 05', code: 'K05', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 06', code: 'K06', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 07', code: 'K07', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 08', code: 'K08', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 09', code: 'K09', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Kebele 10', code: 'K10', cluster: 'Urban', sector: 'Kebele', isActive: true },
        { name: 'Women Wing', code: 'WOMEN', cluster: 'N/A', sector: '', isActive: true },
        { name: 'Youth Wing', code: 'YOUTH', cluster: 'N/A', sector: '', isActive: true }
      ]
    });
    console.log('✅ Created default settings');

    // Print summary
    console.log('\n📊 Database Summary:');
    console.log('─────────────────────────────────');
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { status: 'Active' } });
    const totalPayments = await Payment.count();
    const paymentsSum = await Payment.sum('amount');

    console.log(`Total Members: ${totalMembers}`);
    console.log(`Active Members: ${activeMembers}`);
    console.log(`Total Payments: ${totalPayments}`);
    console.log(`Total Revenue: ETB ${paymentsSum || 0}`);
    console.log('─────────────────────────────────');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@mcms.ddu / admin123');
    console.log('Operator: operator@mcms.ddu / operator123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Add associations correctly for destroy queries to resolve correctly
User.beforeDestroy(() => {});
Member.beforeDestroy(() => {});
Payment.beforeDestroy(() => {});
Receipt.beforeDestroy(() => {});
Setting.beforeDestroy(() => {});
Payment.belongsTo(Member, { foreignKey: 'memberDbId', as: 'memberInfo' });
Member.hasMany(Payment,   { foreignKey: 'memberDbId', as: 'payments'   });
Receipt.belongsTo(Member,  { foreignKey: 'memberDbId',  as: 'memberInfo'  });
Member.hasMany(Receipt,    { foreignKey: 'memberDbId',  as: 'receipts'    });
Receipt.belongsTo(Payment, { foreignKey: 'paymentDbId', as: 'paymentInfo' });
Payment.hasMany(Receipt,   { foreignKey: 'paymentDbId', as: 'receipts'    });

seed();
