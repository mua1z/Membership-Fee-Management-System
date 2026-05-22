// controllers/importController.js - Excel/CSV Import Controller (MySQL / Sequelize)
const xlsx = require('xlsx');
const { Op } = require('sequelize');
const Member = require('../models/Member');
const SectorUnit = require('../models/SectorUnit');
const MemberCategory = require('../models/MemberCategory');
const Setting = require('../models/Setting');
const ClassificationEngine = require('../utils/classificationEngine');
const { getEthiopianYear } = require('../utils/ethiopianCalendar');

// Helper: flatten nested member data (same logic as memberController)
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
    flat.contributionMonthlyFee  = data.contribution.monthlyFee  || 0;
    flat.contributionPercentage  = data.contribution.percentage  || 0;
    flat.contributionAnnualFee   = data.contribution.annualFee   || 0;
    flat.contributionHqShare     = data.contribution.hqShare     || 0;
    flat.contributionBranchShare = data.contribution.branchShare || 0;
    delete flat.contribution;
  }
  if (data.netSalary) {
    flat.netSalaryGrossSalary      = data.netSalary.grossSalary      || 0;
    flat.netSalaryPensionDeduction = data.netSalary.pensionDeduction || 0;
    flat.netSalaryTaxDeduction     = data.netSalary.taxDeduction     || 0;
    flat.netSalaryTotalDeductions  = data.netSalary.totalDeductions  || 0;
    flat.netSalaryNetSalary        = data.netSalary.netSalary        || 0;
    flat.netSalaryContributionFee  = data.netSalary.contributionFee  || 0;
    flat.netSalaryFinalNetSalary   = data.netSalary.finalNetSalary   || 0;
    delete flat.netSalary;
  }
  if (data.wing) {
    flat.wingType           = (data.wing.wingType && ['Women', 'Youth'].includes(data.wing.wingType)) ? data.wing.wingType : null;
    flat.wingParentMemberId = data.wing.parentMemberId ?? null;
    delete flat.wing;
  }
  delete flat._id;
  delete flat.id;
  delete flat.manualFinancial;
  delete flat.rawBranch;
  delete flat.rawCategory;
  return flat;
}

// Helper: generate 13-month Ethiopian payment schedule
function generatePaymentSchedule(year, dayOfMonth) {
  const schedule = [];
  for (let month = 1; month <= 13; month++) {
    schedule.push({ month, year, expectedDate: null, status: 'Unpaid', actualPaymentDate: null, paymentId: null });
  }
  return schedule;
}

// Import members from Excel/CSV
exports.importMembers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a file.' });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    let data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Intelligent Fallback: If standard parsing fails due to merged cells or missing headers (common in official Amharic reports),
    // we scan the raw array for data row signatures (Name -> Sex(ወ/ሴ) -> Numbers).
    const isCleanTemplate = data.length > 0 && Object.keys(data[0]).some(k => k.toLowerCase().includes('name') || k.includes('ስም') || k.toLowerCase().includes('sex') || k.includes('ጾታ'));
    
    if (!isCleanTemplate) {
      const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      data = [];
      for (let r = 0; r < rawData.length; r++) {
        const row = rawData[r];
        if (!Array.isArray(row)) continue;
        
        let sexColIdx = -1;
        let sexVal = '';
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim().toUpperCase();
          if (cell === 'M' || cell === 'F' || cell === 'ወ' || cell === 'ሴ' || cell === 'MALE' || cell === 'FEMALE' || cell === 'ወንድ' || cell === 'ሴት') {
            sexColIdx = c;
            sexVal = (cell === 'M' || cell === 'ወ' || cell === 'MALE' || cell === 'ወንድ') ? 'Male' : 'Female';
            break;
          }
        }
        
        if (sexColIdx > 0) {
          // Search backwards for the name
          let nameVal = '';
          for (let prev = sexColIdx - 1; prev >= 0; prev--) {
            const val = String(row[prev] || '').trim();
            // Valid name: longer than 1 character and not just a number
            if (val.length > 1 && isNaN(Number(val))) {
              nameVal = val;
              break;
            }
          }

          if (nameVal) {
            // Search forwards for financial values, ignoring empty strings
            const financialVals = [];
            for (let next = sexColIdx + 1; next < row.length; next++) {
               const valStr = String(row[next] || '').trim();
               if (!valStr) continue;
               const num = parseFloat(valStr.replace(/,/g, '').replace('%', ''));
               if (!isNaN(num)) {
                  financialVals.push(num);
               }
            }
            
            const salaryVal = financialVals[0] || 0;
            const taxVal = financialVals[1] || 0;
            const pensionVal = financialVals[2] || 0;
            const netVal = financialVals[3] || 0;
            const percVal = financialVals[4] || 0;
            const feeVal = financialVals[5] || 0;
            
            let phoneVal = '';
            for (let c = 0; c < row.length; c++) {
               const cellStr = String(row[c] || '').trim();
               if (cellStr.startsWith('+251') || cellStr.startsWith('09') || cellStr.startsWith('07')) {
                 if (cellStr.length >= 10) { phoneVal = cellStr; break; }
               }
            }
            
            data.push({
               "Full Name": nameVal,
               "Sex": sexVal,
               "Gross Salary": salaryVal,
               "Income Tax": taxVal,
               "Pension": pensionVal,
               "Net Salary": netVal,
               "Contribution %": percVal,
               "Monthly Contribution": feeVal,
               "Phone": phoneVal
            });
          }
        }
      }
    }

    const explicitSectorUnitId = req.body.sectorUnitId ? parseInt(req.body.sectorUnitId, 10) : null;
    const explicitCategoryId = req.body.memberCategoryId ? parseInt(req.body.memberCategoryId, 10) : null;

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: 'File is empty or invalid.' });
    }

    const results = { success: 0, errors: [], warnings: [], duplicates: [] };

    // Fetch all Sector Units and Categories for lookup
    const allSectorUnits = await SectorUnit.findAll({ attributes: ['id', 'name'] });
    const allCategories = await MemberCategory.findAll({ attributes: ['id', 'name'] });
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    // ── First pass: parse all rows and collect phones/names ───────────────
    const parsedRows = [];
    const allPhones = [];
    const allNames = [];

    for (let i = 0; i < data.length; i++) {
      const row    = data[i];
      const rowNum = i + 2;

      try {
        const memberData = mapExcelRowToMember(row);

        const fullName = memberData.fullName;
        if (!fullName || fullName === 'Unknown') {
          results.errors.push({ row: rowNum, error: 'Missing required field: Full Name' });
          continue;
        }
        if (!memberData.phone || memberData.phone.trim() === '') {
          memberData.phone = `NOPHONE-${Date.now()}-${i}-${Math.floor(Math.random() * 100000)}`;
        }

        allPhones.push(memberData.phone);
        allNames.push(memberData.fullName.toLowerCase());
        parsedRows.push({ row, rowNum, memberData, index: i });
      } catch (error) {
        results.errors.push({ row: rowNum, error: error.message });
      }
    }

    // ── Bulk duplicate check (ONE query instead of N) ─────────────────────
    const existingMembers = await Member.findAll({
      where: {
        [Op.or]: [
          { phone: { [Op.in]: allPhones } },
          { fullName: { [Op.in]: allNames } }
        ]
      },
      attributes: ['phone', 'fullName']
    });
    const existingPhones = new Set(existingMembers.map(m => m.phone));
    const existingLowerNames = new Set(existingMembers.map(m => m.fullName.toLowerCase()));

    // ── Second pass: in-memory processing, no DB calls per row ────────────
    const membersToCreate = [];

    for (const { row, rowNum, memberData, index: i } of parsedRows) {
      try {
        if (existingPhones.has(memberData.phone)) {
          results.duplicates.push({ row: rowNum, name: memberData.fullName, error: `Duplicate Found: Phone '${memberData.phone}' is already registered.` });
          continue;
        }
        if (existingLowerNames.has(memberData.fullName.toLowerCase())) {
          results.duplicates.push({ row: rowNum, name: memberData.fullName, error: `Duplicate Found: Name '${memberData.fullName}' is already registered.` });
          continue;
        }

        // Resolve Sector Unit ID with Translation Support
        let sectorUnitId = explicitSectorUnitId;
        const excelUnitName = String(row['Sector Unit'] || row.SectorUnit || row.Branch || row['የስራ ክፍል'] || '').trim();

        const unitTranslationMap = {
          'ዋህል': 'Wahel', 'ዋህል ክላስተር': 'Wahel Cluster',
          'ቢዮ አዋሌ': 'Biyyo Awwalle', 'ቢዮ አዋሌ ክላስተር': 'Biyyo Awwalle Cluster',
          'አሰሊሶ': 'Aseliso', 'ጀልዴሳ': 'Jeldessa',
          'ባህልና ቱሪዝም': 'Culture and Tourism', 'ባህል': 'Culture',
          'ጤና': 'Health', 'ትምህርት': 'Education', 'ግብርና': 'Agriculture',
          'ፖሊስ': 'Police', 'ፍትህ': 'Justice', 'ንግድ': 'Trade', 'ፋይናንስ': 'Finance'
        };

        let searchUnit = excelUnitName;
        Object.keys(unitTranslationMap).forEach(am => {
          if (excelUnitName.includes(am)) searchUnit = unitTranslationMap[am];
        });

        if (req.user.role === 'sector_officer') {
          sectorUnitId = req.user.sectorUnitId;
          if (excelUnitName) {
            const officerUnit = allSectorUnits.find(u => u.id === req.user.sectorUnitId);
            if (officerUnit && officerUnit.name.toLowerCase() !== excelUnitName.toLowerCase() && officerUnit.name.toLowerCase() !== searchUnit.toLowerCase()) {
              results.warnings.push({ row: rowNum, warning: `Member forced to your unit '${officerUnit.name}' (Excel specified '${excelUnitName}').` });
            }
          }
        } else if (!sectorUnitId) {
          const matchedUnit = allSectorUnits.find(u => {
            const name = u.name.toLowerCase();
            const target = searchUnit.toLowerCase();
            return name === target || name.includes(target) || target.includes(name);
          });
          sectorUnitId = matchedUnit ? matchedUnit.id : null;
        }

        // Resolve Member Category ID with Translation Support
        let memberCategoryId = explicitCategoryId;
        const categoryTranslationMap = {
          'ሰራተኛ': 'Employee', 'የመንግስት ሰራተኛ': 'Employee Members',
          'ኢንተርፕራይዝ': 'Enterprises', 'አነስተኛ': 'Small Enterprise',
          'ባለሃብት': 'Investors', 'ኢንቨስተር': 'Investors',
          'ተማሪ': 'Students', 'ገበሬ': 'Farmer members',
          'ወጣት': 'Youth Wing', 'ሴት': 'Women Wing',
          'ሊግ': 'Wing'
        };

        const excelCategoryName = String(memberData.categoryName || '').trim();
        let searchCategory = excelCategoryName;
        Object.keys(categoryTranslationMap).forEach(am => {
          if (excelCategoryName.includes(am)) searchCategory = categoryTranslationMap[am];
        });

        if (!memberCategoryId) {
          const matchedCategory = allCategories.find(c => {
            const name = (c.name || '').toLowerCase();
            const target = searchCategory.toLowerCase();
            return name === target || name.includes(target) || target.includes(name);
          });
          memberCategoryId = matchedCategory ? matchedCategory.id : null;
        }

        if (memberData.financial.salary < 0) {
          results.warnings.push({ row: rowNum, warning: 'Invalid salary value, using 0' });
          memberData.financial.salary = 0;
        }

        const classification = ClassificationEngine.autoClassifyAndCalculate(memberData, settings);

        const manualPercentage = Number(row['Contribution %'] || row.ContributionPercentage || row['የክፍያ % መጠን']);
        const manualMonthlyFee = Number(row['Monthly Contribution (ETB)'] || row.MonthlyContribution || row['የአባሉ ወርሃዊ ክፍያ']);
        const manualNetSalary  = Number(row['Net Monthly Salary (ETB)']   || row.NetSalary || row['የተጣራ የወር ደመወዝ መጠን']);
        const manualTax        = Number(row['Income Tax (ETB)']           || row.IncomeTax || row['የደመወዝ ገቢ ግብር'] || row['የደሞዝ ገቢ ግብር']);
        const manualPension    = Number(row['Pension (ETB)']              || row.Pension || row['ጡረታ']);

        if (!isNaN(manualMonthlyFee) && manualMonthlyFee > 0) {
          classification.monthlyFee = manualMonthlyFee;
          classification.annualFee  = manualMonthlyFee * 12;
          classification.hqShare    = Math.round(classification.annualFee * 0.20);
          classification.branchShare = Math.round(classification.annualFee * 0.80);
        }
        if (!isNaN(manualPercentage) && manualPercentage > 0) classification.percentage = manualPercentage;
        
        if (!isNaN(manualNetSalary) && manualNetSalary > 0) {
          classification.netSalary.netSalary = manualNetSalary;
          classification.netSalary.taxDeduction = !isNaN(manualTax) ? manualTax : classification.netSalary.taxDeduction;
          classification.netSalary.pensionDeduction = !isNaN(manualPension) ? manualPension : classification.netSalary.pensionDeduction;
          classification.netSalary.contributionFee = classification.monthlyFee;
          classification.netSalary.finalNetSalary = Math.max(0, classification.netSalary.netSalary - classification.monthlyFee);
        }

        const flat = flattenMemberData({
          ...memberData,
          memberId: `DD-${new Date().getFullYear()}-${Date.now()}-${i}-${Math.floor(1000 + Math.random() * 9000)}`,
          sectorUnitId,
          branch:               excelUnitName,
          sector:               excelCategoryName,
          memberCategoryId,
          cluster:              classification.cluster || 'N/A',
          subType:              classification.subType,
          classificationRuleId: classification.classificationRuleId,
          contribution: {
            monthlyFee:  classification.monthlyFee,
            percentage:  classification.percentage,
            annualFee:   classification.annualFee,
            hqShare:     classification.hqShare,
            branchShare: classification.branchShare
          },
          netSalary:    classification.netSalary,
          paymentSchedule: generatePaymentSchedule(getEthiopianYear(), memberData.paymentDay || 1),
          importedFrom: req.file.originalname
        });

        if (membersToCreate.length === 0 && process.env.NODE_ENV !== 'test') {
          const badKeys = Object.keys(flat).filter(k => k === 'NaN' || /^[0-9]+$/.test(k));
          if (badKeys.length > 0) console.error('DEBUG: flat has suspicious keys:', badKeys, JSON.stringify(flat).slice(0, 500));
          else console.log('DEBUG: first flat keys:', Object.keys(flat).join(', '));
        }
        membersToCreate.push(flat);
      } catch (error) {
        results.errors.push({ row: rowNum, error: error.message });
      }
    }

    // ── Batch insert (chunked to avoid max_allowed_packet overflow) ──────
    if (membersToCreate.length > 0) {
      const CHUNK_SIZE = 100;
      let inserted = 0;
      try {
        for (let start = 0; start < membersToCreate.length; start += CHUNK_SIZE) {
          const chunk = membersToCreate.slice(start, start + CHUNK_SIZE);
          await Member.bulkCreate(chunk);
          inserted += chunk.length;
        }
        results.success = inserted;
        console.log(`Import: ${inserted} members inserted successfully from "${req.file.originalname}"`);
      } catch (bulkError) {
        console.error(`Import bulkCreate failed after ${inserted} inserts:`, bulkError.message);
        if (inserted > 0) results.success = inserted;
        results.errors.push({ row: 0, error: `Database insert failed after ${inserted} rows: ${bulkError.message}` });
      }
    } else {
      results.success = 0;
    }

    res.json({
      success: true,
      message: `Import completed: ${results.success} members imported`,
      data: { totalRows: data.length, success: results.success, errors: results.errors, warnings: results.warnings, duplicates: results.duplicates }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Map Excel row to Member object (with Amharic support) ─────────────────────
function mapExcelRowToMember(rawRow) {
  // Normalize keys: trim and lowercase for robust matching
  const row = {};
  Object.keys(rawRow).forEach(key => {
    const normalizedKey = key.trim().toLowerCase();
    row[normalizedKey] = rawRow[key];
  });

  const getVal = (keys) => {
    for (const key of keys) {
      const normalizedKey = key.toLowerCase();
      if (row[normalizedKey] !== undefined) return row[normalizedKey];
    }
    return undefined;
  };

  const fullName = getVal([
    'Full Name', 'የአባሉ ሙሉ ስም', 'Full Name / የአባሉ ሙሉ ስም', 
    'FullName', 'Name', 'ስም', 'ሙሉ ስም', 'የአባሉ ስም', 'ሙሉ ስም'
  ]) || 'Unknown';
  
  const genderRaw = String(getVal([
    'Sex', 'ጾታ', 'Sex / ጾታ', 
    'Gender', 'ጾታ (ወ/ሴ)', 'ፆታ', 'ፆታ (ወ/ሴ)'
  ]) || '').trim();
  const gender = (genderRaw === 'ወ' || genderRaw === 'M' || genderRaw === 'Male' || genderRaw.includes('ወንድ')) ? 'Male' : 
                 (genderRaw === 'ሴ' || genderRaw === 'F' || genderRaw === 'Female' || genderRaw.includes('ሴት')) ? 'Female' : 'Male';

  const salary = Number(getVal([
    'Gross Salary', 'ጠቅላላ የወር ደመወዝ', 'Gross Salary / ጠቅላላ የወር ደመወዝ',
    'Gross Monthly Salary (ETB)', 'Salary', 'GrossSalary',
    'ጠቅላላ የወር ደመወዝ መጠን', 'ጠቅላላ ደመወዝ', 'ደመወዝ', 'የወር ደመወዝ', 'ጠቅላላ ደመወዝ',
    'ጥቅል የወር ደመወዝ መጠን', 'ጥቅል ደመወዝ'
  ])) || 0;
  
  const branch = getVal([
    'Sector Unit', 'ወረዳ/ክላስተር/መስሪያ ቤት', 'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት',
    'Branch', 'SectorUnit', 'Cluster Name', 'ClusterName', 'ወረዳ/ክላስተር ይምረጡ', 'የክላስተር ስም', 'የስራ ክፍል'
  ]) || 'Dire Dawa Main';

  const categoryName = getVal([
    'Members Category', 'የአባልነት ዘርፍ', 'Members Category / የአባልነት ዘርፍ',
    'Category', 'Member Category', 'MemberCategory', 'ዘርፍ', 'የአባልነት ክፍል'
  ]);

  const businessType = getVal([
    'Business Types', 'የንግድ አይነት', 'Business Types / የንግድ አይነት',
    'Business Type', 'Business Name', 'Enterprise Type', 'BusinessTypes'
  ]);

  const capital = Number(getVal([
    'Capital', 'ካፒታል', 'Capital / ካፒታል',
    'Investment Capital'
  ])) || 0;

  let membershipType = getVal(['Membership Type', 'MembershipType', 'Type']);
  if (!membershipType && categoryName) {
    const c = String(categoryName).toLowerCase();
    if (c.includes('wing')) membershipType = 'Wing';
    else if (c.includes('employee')) membershipType = 'Salary-Based';
    else if (c.includes('student')) membershipType = 'Student';
    else if (c.includes('investor')) membershipType = 'Investor';
    else if (c.includes('enterprise') || c.includes('business')) membershipType = 'Business';
    else if (c.includes('farmer') || c.includes('resident')) membershipType = 'Non-Salary';
  }

  if (!membershipType) {
    if (salary > 0) membershipType = 'Salary-Based';
    else if (capital > 0) membershipType = 'Investor';
    else if (businessType) membershipType = 'Business';
    else membershipType = 'Non-Salary';
  }

  return {
    fullName,
    gender,
    phone:      String(getVal(['Phone', 'PhoneNumber', 'Phone Number', 'ስልክ', 'የስልክ ቁጥር', 'ስልክ ቁጥር']) || ''),
    branch,
    rawBranch: branch,
    membershipType,
    categoryName,
    rawCategory: categoryName,
    wing: categoryName?.toLowerCase().includes('wing') ? { wingType: (categoryName || '').replace(' Wing', '') } : undefined,
    financial: {
      salary:          membershipType === 'Salary-Based' || membershipType === 'Wing' ? salary : 0,
      employmentType:  getVal(['Employment Type', 'EmploymentType', 'የቅጥር ሁኔታ']) || 'Private',
      currency:        'ETB',
      businessType,
      income:          membershipType === 'Business' ? (Number(getVal(['Income', 'ገቢ'])) || salary) : 0,
      capital:         membershipType === 'Investor' ? (Number(getVal(['Capital', 'ካፒታል', 'Capital / ካፒታል'])) || salary) : 0,
      investmentType:  getVal(['Investment Type', 'የኢንቨስትመንት አይነት', 'Investor Type'])
    },
    // Manual overrides for financial results if provided in Excel
    manualFinancial: {
      taxDeduction:     Number(getVal(['Income Tax', 'Tax', 'የደመወዝ ገቢ ግብር', 'የደሞዝ ገቢ ግብር', 'ገቢ ግብር', 'ግብር'])),
      pensionDeduction: Number(getVal(['Pension', 'Pension (7%)', 'ጡረታ', 'ጡረታ 7%'])),
      netSalary:        Number(getVal(['Net Salary', 'NetSalary', 'የተጣራ የወር ደመወዝ መጠን', 'የተጣራ ደመወዝ'])),
      percentage:       parseFloat(String(getVal(['Contribution %', 'Percentage', 'የመዋጮ % መጠን', 'መዋጮ %', 'የክፍያ % መጠን']) || '').replace('%', '')),
      monthlyFee:       Number(getVal(['Monthly Contribution (ETB)', 'Monthly Contribution', 'Monthly Fee', 'የአባሉ ወርሃዊ ክፍያ', 'ወርሃዊ መዋጮ', 'መዋጮ', 'የአባሉ ወርሃዊ መዋጮ', 'Contribution In ETB']))
    },
    status:           'Active',
    registrationDate: new Date()
  };
}

// Get import template
exports.getImportTemplate = (req, res) => {
  const template = [
    {
      'Full Name / የአባሉ ሙሉ ስም': 'Abebe Employee',
      'Sex / ጾታ': 'M',
      'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት': 'Dire Dawa Main',
      'Members Category / የአባልነት ዘርፍ': 'Government Employees',
      'Gross Salary / ጠቅላላ የወር ደመወዝ': 26301,
      'Phone': '+251911000001'
    },
    {
      'Full Name / የአባሉ ሙሉ ስም': 'Meaza Enterprise',
      'Sex / ጾታ': 'F',
      'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት': 'Kebele 01',
      'Members Category / የአባልነት ዘርፍ': 'Small Enterprise',
      'Business Types / የንግድ አይነት': 'Small',
      'Phone': '+251911000002'
    },
    {
      'Full Name / የአባሉ ሙሉ ስም': 'Kebede Investor',
      'Sex / ጾታ': 'M',
      'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት': 'Kebele 02',
      'Members Category / የአባልነት ዘርፍ': 'Investors',
      'Capital / ካፒታል': 5000000,
      'Phone': '+251911000003'
    },
    {
      'Full Name / የአባሉ ሙሉ ስም': 'Fatuma Wing',
      'Sex / ጾታ': 'F',
      'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት': 'Women Wing',
      'Members Category / የአባልነት ዘርፍ': 'Women Wing',
      'Phone': '+251911000004'
    },
    {
      'Full Name / የአባሉ ሙሉ ስም': 'Abebe Student',
      'Sex / ጾታ': 'M',
      'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት': 'Kebele 05',
      'Members Category / የአባልነት ዘርፍ': 'Students',
      'Phone': '+251911000005'
    },
    {
      'Full Name / የአባሉ ሙሉ ስም': 'Kebede Farmer',
      'Sex / ጾታ': 'M',
      'Sector Unit / ወረዳ/ክላስተር/መስሪያ ቤት': 'Biyo Awale',
      'Members Category / የአባልነት ዘርፍ': 'Farmers',
      'Phone': '+251911000006'
    }
  ];

  const ws = xlsx.utils.json_to_sheet(template);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Template');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Member_Import_Template.xlsx');
  res.send(buf);
};
