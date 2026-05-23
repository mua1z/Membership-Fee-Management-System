// controllers/memberController.js - Member CRUD Controller (MySQL / Sequelize)
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');
const Contribution = require('../models/Contribution');
const Setting = require('../models/Setting');
const ClassificationEngine = require('../utils/classificationEngine');
const { getEthiopianYear, getEthiopianMonth } = require('../utils/ethiopianCalendar');

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
    flat.financialCustomMonthlyFee= data.financial.customMonthlyFee ?? null;
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

  if (data.netSalary) {
    flat.netSalaryGrossSalary      = data.netSalary.grossSalary      ?? 0;
    flat.netSalaryPensionDeduction = data.netSalary.pensionDeduction ?? 0;
    flat.netSalaryTaxDeduction     = data.netSalary.taxDeduction     ?? 0;
    flat.netSalaryTotalDeductions  = data.netSalary.totalDeductions  ?? 0;
    flat.netSalaryNetSalary        = data.netSalary.netSalary        ?? 0;
    flat.netSalaryContributionFee  = data.netSalary.contributionFee  ?? 0;
    flat.netSalaryFinalNetSalary   = data.netSalary.finalNetSalary   ?? 0;
    delete flat.netSalary;
  }

  if (data.wing) {
    flat.wingType           = (data.wing.wingType && ['Women', 'Youth'].includes(data.wing.wingType)) ? data.wing.wingType : null;
    flat.wingParentMemberId = data.wing.parentMemberId ?? null;
    delete flat.wing;
  }

  // Remove Mongoose-only or virtual fields
  delete flat._id;
  delete flat.__v;
  delete flat.id;

  return flat;
}

// ─── Helper: generate 13-month Ethiopian payment schedule ─────────────────────
function generatePaymentSchedule(year, dayOfMonth) {
  const schedule = [];
  for (let month = 1; month <= 13; month++) {
    schedule.push({ month, year, expectedDate: null, status: 'Unpaid', actualPaymentDate: null, paymentId: null });
  }
  return schedule;
}

// ─── Create new member ────────────────────────────────────────────────────────
exports.createMember = async (req, res) => {
  try {
    const memberData = req.body;
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});
    
    const classification = ClassificationEngine.autoClassifyAndCalculate(memberData, settings);

    const currentYear = getEthiopianYear();
    const paymentDay  = memberData.paymentDay || 1;
    const paymentSchedule = generatePaymentSchedule(currentYear, paymentDay);

    const existing = await Member.findOne({ 
      where: { 
        [Op.or]: [
          { fullName: memberData.fullName },
          ...(memberData.phone ? [{ phone: memberData.phone }] : [])
        ]
      } 
    });
    if (existing) {
      const matchedBy = existing.fullName === memberData.fullName ? `name '${memberData.fullName}'` : `phone '${memberData.phone}'`;
      return res.status(400).json({ success: false, message: `A member with this ${matchedBy} already exists.` });
    }

    const flat = flattenMemberData({
      ...memberData,
      subType:              classification.subType,
      classificationRuleId: classification.classificationRuleId,
      cluster:              classification.cluster || memberData.cluster || 'N/A',
      contribution: {
        monthlyFee:  classification.monthlyFee,
        percentage:  classification.percentage,
        annualFee:   classification.annualFee,
        hqShare:     classification.hqShare,
        branchShare: classification.branchShare
      },
      netSalary:       classification.netSalary,
      paymentSchedule
    });

    const member = await Member.create(flat);

    res.status(201).json({ success: true, message: 'Member created successfully', data: member });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'field';
      return res.status(400).json({ 
        success: false, 
        message: `The ${field === 'phone' ? 'Phone Number' : field} is already registered to another member. Please use a unique number.` 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get all members with filtering and pagination ────────────────────────────
exports.getMembers = async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      search, branch, cluster, sector,
      membershipType, status, paymentStatus,
      minSalary, maxSalary,
      sectorId, categoryId
    } = req.query;

    const where = {};

    const targetYear  = Number(req.query.billingYear)  || getEthiopianYear();
    const targetMonth = Number(req.query.billingMonth) || getEthiopianMonth();

    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { memberId: { [Op.like]: `%${search}%` } },
        { phone:    { [Op.like]: `%${search}%` } }
      ];
    }
    if (branch)        where.branch        = branch;
    if (cluster)       where.cluster       = cluster;
    if (sector)        where.sector        = sector;
    if (membershipType)where.membershipType= membershipType;
    if (status)        where.status        = status;
    
    // New Hierarchy Filters
    if (sectorId) {
      where.sectorUnitId  = sectorId;
    } else if (req.query.sectorType) {
      const sectorTypeRec = await require('../models/SectorType').findOne({ where: { name: req.query.sectorType } });
      if (sectorTypeRec) {
        const units = await require('../models/SectorUnit').findAll({ where: { sectorTypeId: sectorTypeRec.id }, attributes: ['id'] });
        where.sectorUnitId = { [Op.in]: units.map(u => u.id) };
      }
    }
    
    if (categoryId)    where.memberCategoryId = categoryId;
    
    // Dynamic Filter for paymentStatus using targetYear/targetMonth
    if (paymentStatus === 'Paid') {
      where.id = { [Op.in]: sequelize.literal(`(SELECT memberDbId FROM payments WHERE periodMonth = ${targetMonth} AND periodYear = ${targetYear} AND status = 'Paid')`) };
    } else if (paymentStatus === 'Unpaid') {
      where.id = { [Op.notIn]: sequelize.literal(`(SELECT memberDbId FROM payments WHERE periodMonth = ${targetMonth} AND periodYear = ${targetYear} AND status = 'Paid')`) };
    }

    if (minSalary || maxSalary) {
      where.financialSalary = {};
      if (minSalary) where.financialSalary[Op.gte] = Number(minSalary);
      if (maxSalary) where.financialSalary[Op.lte] = Number(maxSalary);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count: total, rows: members } = await Member.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Payment,
          as: 'payments',
          where: { periodYear: targetYear, status: 'Paid' },
          required: false
        },
        { model: require('../models/SectorUnit'), as: 'sectorUnit' },
        { model: require('../models/MemberCategory'), as: 'memberCategory' }
      ]
    });

    // Add paymentScheduleSummary
    const membersWithSummary = members.map(m => {
      const obj = m.toJSON();
      
      const realPayments = obj.payments || [];
      const schedule = [];
      let paidMonths = 0;
      
      let currentMonthPaid = false;

      for (let month = 1; month <= 12; month++) {
        const paymentFound = realPayments.find(p => Number(p.periodMonth) === month);
        if (paymentFound) {
          paidMonths++;
          if (month === targetMonth) currentMonthPaid = true;
        }
        schedule.push({
          month,
          year: targetYear,
          status: paymentFound ? 'Paid' : 'Unpaid',
          actualPaymentDate: paymentFound ? paymentFound.paymentDate : null
        });
      }

      obj.paymentSchedule = schedule;
      obj.paymentScheduleSummary = {
        total:  12,
        paid:   paidMonths,
        unpaid: 12 - paidMonths,
        year:   targetYear
      };
      
      obj.paymentStatus = currentMonthPaid ? 'Paid' : 'Unpaid';

      // Omit original payments array to save bandwidth
      delete obj.payments;
      
      return obj;
    });

    const totalMonthlyRevenue = await Member.sum('contributionMonthlyFee', { where });
    const totalYearlyRevenue = await Member.sum('contributionAnnualFee', { where });

    res.json({
      success: true,
      data: membersWithSummary,
      summary: {
        totalMembers: total,
        totalMonthlyRevenue: totalMonthlyRevenue || 0,
        totalYearlyRevenue: totalYearlyRevenue || 0
      },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get single member ────────────────────────────────────────────────────────
exports.getMember = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update member ────────────────────────────────────────────────────────────
exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });

    // Sector officers can only edit members in their own sector unit
    if (req.user?.role === 'sector_officer' && req.user.sectorUnitId) {
      if (member.sectorUnitId !== req.user.sectorUnitId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only edit members in your assigned sector unit.' });
      }
    }

    let updateData = { ...req.body };

    if (req.body.financial || req.body.membershipType || req.body.sector) {
      let settings = await Setting.findOne();
      if (!settings) settings = await Setting.create({});
      
      const classification = ClassificationEngine.autoClassifyAndCalculate(req.body, settings);
      updateData.subType              = classification.subType;
      updateData.classificationRuleId = classification.classificationRuleId;
      updateData.cluster              = classification.cluster || req.body.cluster || 'N/A';
      updateData.contribution = {
        monthlyFee:  classification.monthlyFee,
        percentage:  classification.percentage,
        annualFee:   classification.annualFee,
        hqShare:     classification.hqShare,
        branchShare: classification.branchShare
      };
      updateData.netSalary = classification.netSalary;
    }

    // If paymentDay changed, regenerate schedule (only if no paid months)
    if (req.body.paymentDay) {
      const hasPayments = (member?.paymentSchedule || []).some(s => s.status === 'Paid');
      if (!hasPayments) {
        updateData.paymentSchedule = generatePaymentSchedule(new Date().getFullYear(), req.body.paymentDay);
      }
    }

    const flat = flattenMemberData(updateData);
    await Member.update(flat, { where: { id: req.params.id } });

    const updated = await Member.findByPk(req.params.id);
    res.json({ success: true, message: 'Member updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: delete member rows from any existing backup tables ────────────────
async function deleteFromBackupTables(memberIds) {
  try {
    const [tables] = await sequelize.query("SHOW TABLES LIKE '%backup%'");
    const backupTableNames = tables.map(t => Object.values(t)[0]);
    for (const tableName of backupTableNames) {
      if (Array.isArray(memberIds) && memberIds.length > 0) {
        await sequelize.query(`DELETE FROM \`${tableName}\` WHERE id IN (${memberIds.join(',')})`);
      } else {
        await sequelize.query(`DELETE FROM \`${tableName}\``);
      }
    }
  } catch (err) {
    console.error('Error cleaning backup tables:', err.message);
  }
}

// ─── Delete member ────────────────────────────────────────────────────────────
exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });

    // Sector officers can only delete members in their own sector unit
    if (req.user?.role === 'sector_officer' && req.user.sectorUnitId) {
      if (member.sectorUnitId !== req.user.sectorUnitId) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only delete members in your assigned sector unit.' });
      }
    }

    // Delete all associated records first to ensure no constraint failures
    const whereMember = { memberDbId: member.id };
    await Receipt.destroy({ where: whereMember });
    await Payment.destroy({ where: whereMember });
    await Contribution.destroy({ where: whereMember });
    
    await member.destroy();
    await deleteFromBackupTables(member.id);
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete Member Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Bulk create members (replaces all) ──────────────────────────────────────
exports.bulkCreateMembers = async (req, res) => {
  try {
    const members = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of members.' });
    }

    await Member.destroy({ where: {} });

    const createdMembers = [];
    const errors = [];

    for (let i = 0; i < members.length; i++) {
      try {
        const memberData = members[i];
        const classification = ClassificationEngine.autoClassifyAndCalculate(memberData);
        const currentYear = getEthiopianYear();
        const paymentSchedule = generatePaymentSchedule(currentYear, memberData.paymentDay || 1);

        const flat = flattenMemberData({
          ...memberData,
          subType:              classification.subType,
          classificationRuleId: classification.classificationRuleId,
          cluster:              classification.cluster || memberData.cluster || 'N/A',
          contribution: {
            monthlyFee:  classification.monthlyFee,
            percentage:  classification.percentage,
            annualFee:   classification.annualFee,
            hqShare:     classification.hqShare,
            branchShare: classification.branchShare
          },
          netSalary:       classification.netSalary,
          paymentSchedule
        });

        const member = await Member.create(flat);
        createdMembers.push(member);
      } catch (err) {
        errors.push({ index: i, member: members[i], error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Replaced with ${createdMembers.length} members successfully`,
      data: createdMembers,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Bulk append members (adds new rows without deleting) ─────────────────────
exports.bulkAppendMembers = async (req, res) => {
  try {
    const members = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of members.' });
    }

    const createdMembers = [];
    const errors = [];
    const skipped = [];
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    // Bulk check for existing names and phones to avoid duplicates
    const inputNames = members.map(m => m.fullName).filter(Boolean);
    const inputPhones = members.map(m => m.phone).filter(Boolean);
    const existingMembers = await Member.findAll({
      where: {
        [Op.or]: [
          ...(inputNames.length ? [{ fullName: { [Op.in]: inputNames } }] : []),
          ...(inputPhones.length ? [{ phone: { [Op.in]: inputPhones } }] : [])
        ]
      },
      attributes: ['fullName', 'phone']
    });
    const existingNamesSet = new Set(existingMembers.map(m => m.fullName));
    const existingPhonesSet = new Set(existingMembers.map(m => m.phone));

    for (let i = 0; i < members.length; i++) {
      try {
        const memberData = members[i];
        
        // Skip if name already exists in DB
        if (existingNamesSet.has(memberData.fullName)) {
          skipped.push({ name: memberData.fullName, reason: 'Name already exists' });
          continue;
        }

        // Skip if phone already exists in DB
        if (memberData.phone && existingPhonesSet.has(memberData.phone)) {
          skipped.push({ name: memberData.fullName, reason: 'Phone number already exists' });
          continue;
        }

        // Local duplicate check (within the same request)
        if (createdMembers.some(m => m.fullName === memberData.fullName)) {
          skipped.push({ name: memberData.fullName, reason: 'Duplicate in input list' });
          continue;
        }

        if (createdMembers.some(m => m.phone && memberData.phone && m.phone === memberData.phone)) {
          skipped.push({ name: memberData.fullName, reason: 'Duplicate phone in input list' });
          continue;
        }

        if (!memberData.phone || memberData.phone.trim() === '') {
          memberData.phone = `NOPHONE-${Date.now()}-${i}-${Math.floor(Math.random() * 100000)}`;
        }
        
        const classification = ClassificationEngine.autoClassifyAndCalculate(memberData, settings);
        const currentYear = getEthiopianYear();
        const paymentDay  = memberData.paymentDay || 1;
        const paymentSchedule = generatePaymentSchedule(currentYear, paymentDay);

        const flat = flattenMemberData({
          ...memberData,
          subType:              classification.subType,
          classificationRuleId: classification.classificationRuleId,
          cluster:              classification.cluster || memberData.cluster || 'N/A',
          contribution: {
            monthlyFee:  classification.monthlyFee,
            percentage:  classification.percentage,
            annualFee:   classification.annualFee,
            hqShare:     classification.hqShare,
            branchShare: classification.branchShare
          },
          netSalary:       classification.netSalary,
          paymentSchedule
        });

        const member = await Member.create(flat);
        createdMembers.push(member);
      } catch (err) {
        errors.push({ index: i, name: members[i].fullName, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully added ${createdMembers.length} members. ${skipped.length} skipped as duplicates.`,
      data: createdMembers,
      errors: errors.length > 0 ? errors : undefined,
      skipped: skipped.length > 0 ? skipped : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Bulk delete members ──────────────────────────────────────────────────────
exports.bulkDeleteMembers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of member IDs.' });
    }

    const { Op } = require('sequelize');
    const where = { id: { [Op.in]: ids } };

    // Sector officers restriction: only delete their own unit's members
    if (req.user?.role === 'sector_officer' && req.user.sectorUnitId) {
      where.sectorUnitId = req.user.sectorUnitId;
    }

    // Delete all associated records first
    const whereMembers = { memberDbId: { [Op.in]: ids } };
    await Receipt.destroy({ where: whereMembers });
    await Payment.destroy({ where: whereMembers });
    await Contribution.destroy({ where: whereMembers });

    const deletedCount = await Member.destroy({ where });
    await deleteFromBackupTables(ids);
    
    res.json({ 
      success: true, 
      message: `${deletedCount} members deleted successfully`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Bulk Delete Members Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Bulk delete ALL members ─────────────────────────────────────────────────
exports.bulkDeleteAllMembers = async (req, res) => {
  try {
    // Only admins can delete ALL members
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Only admins can delete all members.' });
    }

    // Clear all related tables to avoid orphaned records
    await Receipt.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Contribution.destroy({ where: {} });
    
    const deletedCount = await Member.destroy({ where: {} });
    await deleteFromBackupTables([]);
    
    res.json({ 
      success: true, 
      message: `All records (Members: ${deletedCount}) cleared successfully`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Bulk Delete All Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get statistics ───────────────────────────────────────────────────────────
exports.getMemberStats = async (req, res) => {
  try {
    const { sequelize } = require('../config/db');
    const { fn, col, literal } = require('sequelize');

    const [overall] = await sequelize.query(`
      SELECT
        COUNT(*)                                     AS totalMembers,
        SUM(status = 'Active')                       AS activeMembers,
        SUM(contributionMonthlyFee)                  AS totalMonthlyRevenue,
        SUM(contributionAnnualFee)                   AS totalAnnualRevenue
      FROM members
    `, { type: sequelize.QueryTypes.SELECT });

    const byType = await sequelize.query(
      `SELECT membershipType AS _id, COUNT(*) AS count FROM members GROUP BY membershipType`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const byBranch = await sequelize.query(
      `SELECT branch AS _id, COUNT(*) AS count FROM members GROUP BY branch`,
      { type: sequelize.QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        overall: overall || { totalMembers: 0, activeMembers: 0, totalMonthlyRevenue: 0, totalAnnualRevenue: 0 },
        byType,
        byBranch
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
