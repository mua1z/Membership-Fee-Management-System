const SectorPayment = require('../models/SectorPayment');
const SectorPaymentAuditLog = require('../models/SectorPaymentAuditLog');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const {
  validateSectorFinance,
  isPeriodClosed,
  getCollectedPayments,
  getApprovedDeposits
} = require('../services/sectorValidationService');
const fs = require('fs');
const path = require('path');
const paymentVerificationService = require('../services/paymentVerificationService');

// Helper to version and rename files
async function saveVersionedReceipt(paymentId, file) {
  const versionCount = await SectorPaymentAuditLog.count({
    where: { sectorPaymentId: paymentId, actionType: ['EDIT', 'REQUEST_CORRECTION'] }
  });
  const versionNumber = versionCount + 2; // v1 is original, v2 is first update
  const ext = path.extname(file.filename);
  const newFilename = `sector-payment-${paymentId}-v${versionNumber}${ext}`;
  const oldPath = path.join(__dirname, '..', 'uploads', 'receipts', file.filename);
  const newPath = path.join(__dirname, '..', 'uploads', 'receipts', newFilename);
  fs.renameSync(oldPath, newPath);
  return newFilename;
}

// ── Validate deposit (frontend pre-submit check) ──────────────────────────
exports.validateDeposit = async (req, res) => {
  try {
    const { sectorUnitId, billingMonth, billingYear, totalAmount } = req.query;
    if (!sectorUnitId || !billingMonth || !billingYear) {
      return res.status(400).json({ success: false, message: 'Missing required query params: sectorUnitId, billingMonth, billingYear' });
    }
    const result = await validateSectorFinance(sectorUnitId, billingMonth, billingYear, totalAmount || 0);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Upload sector payment slip ────────────────────────────────────────────
exports.uploadSlip = async (req, res) => {
  try {
    const { sectorUnitId, billingMonth, billingYear, totalAmount, bankName, notes, transactionId } = req.body;

    if (!sectorUnitId || !billingMonth || !billingYear || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Missing required fields: sectorUnitId, billingMonth, billingYear, totalAmount.' });
    }

    if (!req.file && !transactionId) {
      return res.status(400).json({ success: false, message: 'Either a receipt file or a Transaction ID (TID) is required.' });
    }

    if (req.user.role === 'sector_officer' && Number(sectorUnitId) !== Number(req.user.sectorUnitId)) {
      return res.status(403).json({ success: false, message: 'You can only upload for your assigned sector.' });
    }

    const closed = await isPeriodClosed(sectorUnitId, billingMonth, billingYear);
    if (closed && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: `This period (${billingMonth}/${billingYear}) is closed for sector. New deposits are not allowed.` });
    }

    const depositAmount = Number(totalAmount);
    const validation = await validateSectorFinance(sectorUnitId, billingMonth, billingYear, depositAmount);

    // Duplicate Deposit Protection: Check if Approved + New > Collected Member Payments
    const { collectedAmount } = await getCollectedPayments(sectorUnitId, billingMonth, billingYear);
    const { approvedDeposits } = await getApprovedDeposits(sectorUnitId, billingMonth, billingYear);
    
    let status = 'PENDING';
    if (collectedAmount === 0 && depositAmount > 0) {
      // No member payment records yet — mark as WARNING, allow submission
      status = 'PENDING';
    } else if (approvedDeposits + depositAmount > collectedAmount) {
      status = 'FLAGGED';
    } else if (validation.validationStatus === 'FLAGGED') {
      status = 'FLAGGED';
    }

    let receiptFileName = req.file ? req.file.filename : null;
    let autoVerified = false;

    // Automatic Verification for Direct Pay (No file uploaded but TID provided)
    if (!req.file && transactionId) {
      const verificationResult = await paymentVerificationService.verifyTransaction(bankName, transactionId, depositAmount);

      if (!verificationResult.verified) {
        return res.status(400).json({ 
          success: false, 
          message: `Automatic verification failed: ${verificationResult.error}` 
        });
      }

      autoVerified = true;
      if (status === 'PENDING') {
        status = 'APPROVED';
      }

      try {
        const generatedPdfName = await paymentVerificationService.generateReceiptPDF(verificationResult, null);
        receiptFileName = generatedPdfName;
      } catch (pdfErr) {
        console.error("PDF generation error:", pdfErr);
      }
    }

    // Create payment record
    const payment = await SectorPayment.create({
      sectorUnitId: Number(sectorUnitId),
      billingMonth: Number(billingMonth),
      billingYear: Number(billingYear),
      totalAmount: depositAmount,
      bankName: bankName || 'Commercial Bank of Ethiopia',
      transactionId: transactionId || null,
      receiptFile: receiptFileName,
      approvalStatus: status,
      notes: notes || null,
      uploadedBy: req.userId,
      expectedRevenue: validation.expectedRevenue || null,
      collectedAmount: validation.collectedAmount || null,
      approvedDeposits: validation.approvedDeposits || null,
      remainingBalance: validation.remainingBalance || null,
      validationDifference: validation.validationDifference || null,
      validationStatus: validation.validationStatus || null,
      isClosed: closed
    });

    if (receiptFileName) {
      // If it's an uploaded file or an auto-generated one, we rename it consistently
      const ext = path.extname(receiptFileName);
      const newFilename = `sector-payment-${payment.id}-v1${ext}`;
      const oldPath = path.join(__dirname, '..', 'uploads', 'receipts', receiptFileName);
      const newPath = path.join(__dirname, '..', 'uploads', 'receipts', newFilename);
      
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        await payment.update({ receiptFile: newFilename });
      }
    }

    // Log the initial upload
    await SectorPaymentAuditLog.create({
      sectorPaymentId: payment.id,
      userId: req.userId,
      actionType: 'CREATE',
      newValues: payment.toJSON(),
      notes: notes || 'Initial payment slip upload'
    });

    res.status(201).json({
      success: true,
      message: status === 'FLAGGED'
        ? 'Sector payment slip uploaded but FLAGGED for review (exceeds collected member payments or validation checks).'
        : (autoVerified ? 'Payment automatically verified and approved.' : 'Sector payment slip uploaded successfully. Pending admin approval.'),
      data: payment,
      validation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── List sector payments ──────────────────────────────────────────────────
exports.getSectorPayments = async (req, res) => {
  try {
    const { page = 1, limit = 50, approvalStatus, sectorUnitId, month, year, validationStatus } = req.query;
    const { Op } = require('sequelize');
    const where = {};

    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (validationStatus) where.validationStatus = validationStatus;
    if (month) where.billingMonth = Number(month);
    if (year) where.billingYear = Number(year);

    if (req.user.role === 'sector_officer') {
      where.sectorUnitId = req.user.sectorUnitId;
    } else if (sectorUnitId) {
      where.sectorUnitId = Number(sectorUnitId);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count: total, rows: payments } = await SectorPayment.findAndCountAll({
      where,
      include: [
        { model: require('../models/SectorUnit'), as: 'sectorUnit', attributes: ['name'] },
        { model: require('../models/User'), as: 'uploader', attributes: ['fullName'] },
        { model: require('../models/User'), as: 'verifier', attributes: ['fullName'] }
      ],
      offset,
      limit: Number(limit),
      order: [['createdAt', 'DESC']]
    });

    const totalPending = await SectorPayment.count({ where: { ...where, approvalStatus: 'PENDING' } });
    const totalApproved = await SectorPayment.count({ where: { ...where, approvalStatus: 'APPROVED' } });
    const totalRejected = await SectorPayment.count({ where: { ...where, approvalStatus: 'REJECTED' } });
    const totalCorrectionRequested = await SectorPayment.count({ where: { ...where, approvalStatus: 'CORRECTION_REQUESTED' } });
    const totalReopened = await SectorPayment.count({ where: { ...where, approvalStatus: 'REOPENED' } });
    const totalFlagged = await SectorPayment.count({ where: { ...where, approvalStatus: 'FLAGGED' } });
    const totalAmount = await SectorPayment.sum('totalAmount', { where }) || 0;

    // Metrics calculation
    let remainingBalance = 0;
    let collectionRate = 0;

    let queryReplacements = [];
    let expectedQuery = `SELECT COALESCE(SUM(contributionMonthlyFee), 0) AS expectedAmount FROM members WHERE status = 'Active'`;
    if (where.sectorUnitId) {
      expectedQuery += ` AND sectorUnitId = ?`;
      queryReplacements.push(where.sectorUnitId);
    }
    const [expRes] = await sequelize.query(expectedQuery, { replacements: queryReplacements });
    const globalExpected = Number(expRes[0].expectedAmount);

    let collectedQuery = `
      SELECT COALESCE(SUM(p.amount), 0) AS collectedAmount
      FROM payments p
      JOIN members m ON p.memberDbId = m.id
      WHERE p.status = 'Paid'
    `;
    let collReplacements = [];
    if (where.sectorUnitId) {
      collectedQuery += ` AND m.sectorUnitId = ?`;
      collReplacements.push(where.sectorUnitId);
    }
    if (where.billingMonth) {
      collectedQuery += ` AND p.periodMonth = ?`;
      collReplacements.push(where.billingMonth);
    }
    if (where.billingYear) {
      collectedQuery += ` AND p.periodYear = ?`;
      collReplacements.push(where.billingYear);
    }
    const [collRes] = await sequelize.query(collectedQuery, { replacements: collReplacements });
    const globalCollected = Number(collRes[0].collectedAmount);

    const approvedWhere = { ...where, approvalStatus: 'APPROVED' };
    const approvedTotalAmount = await SectorPayment.sum('totalAmount', { where: approvedWhere }) || 0;
    remainingBalance = globalCollected - approvedTotalAmount;

    let memberQuery = `SELECT COUNT(*) AS totalMembers FROM members WHERE status = 'Active'`;
    let memberReplacements = [];
    if (where.sectorUnitId) {
      memberQuery += ` AND sectorUnitId = ?`;
      memberReplacements.push(where.sectorUnitId);
    }
    const [memberRes] = await sequelize.query(memberQuery, { replacements: memberReplacements });
    const totalMembers = Number(memberRes[0].totalMembers);

    let paidQuery = `
      SELECT COUNT(DISTINCT p.memberDbId) AS paidMembers
      FROM payments p
      JOIN members m ON p.memberDbId = m.id
      WHERE p.status = 'Paid'
    `;
    let paidReplacements = [];
    if (where.sectorUnitId) {
      paidQuery += ` AND m.sectorUnitId = ?`;
      paidReplacements.push(where.sectorUnitId);
    }
    if (where.billingMonth) {
      paidQuery += ` AND p.periodMonth = ?`;
      paidReplacements.push(where.billingMonth);
    }
    if (where.billingYear) {
      paidQuery += ` AND p.periodYear = ?`;
      paidReplacements.push(where.billingYear);
    }
    const [paidRes] = await sequelize.query(paidQuery, { replacements: paidReplacements });
    const paidMembers = Number(paidRes[0].paidMembers);
    const unpaidMembers = totalMembers - paidMembers;

    collectionRate = totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;

    res.json({
      success: true,
      data: payments,
      summary: {
        totalPending,
        totalApproved,
        totalRejected,
        totalCorrectionRequested,
        totalReopened,
        totalFlagged,
        totalAmount,
        remainingBalance,
        collectionRate
      },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get single sector payment ─────────────────────────────────────────────
exports.getSectorPayment = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id, {
      include: [
        { model: require('../models/SectorUnit'), as: 'sectorUnit', attributes: ['name'] },
        { model: require('../models/User'), as: 'uploader', attributes: ['fullName'] },
        { model: require('../models/User'), as: 'verifier', attributes: ['fullName'] }
      ]
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    if (req.user.role === 'sector_officer') {
      if (Number(payment.sectorUnitId) !== Number(req.user.sectorUnitId)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view your own sector payments.' });
      }
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Approve payment + duplicate deposit protection check + financial recalculation ──────────────────
exports.approvePayment = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    const oldStatus = payment.approvalStatus;

    const validation = await validateSectorFinance(payment.sectorUnitId, payment.billingMonth, payment.billingYear, Number(payment.totalAmount));


    await payment.update({
      approvalStatus: 'APPROVED',
      verifiedBy: req.userId,
      verifiedAt: new Date(),
      expectedRevenue: validation.expectedRevenue || null,
      collectedAmount: validation.collectedAmount || null,
      approvedDeposits: validation.approvedDeposits || null,
      remainingBalance: validation.remainingBalance || null,
      validationDifference: validation.validationDifference || null,
      validationStatus: validation.validationStatus || null
    });

    // Log approval
    await SectorPaymentAuditLog.create({
      sectorPaymentId: payment.id,
      userId: req.userId,
      actionType: 'APPROVE',
      oldValues: { approvalStatus: oldStatus },
      newValues: {
        approvalStatus: 'APPROVED',
        expectedRevenue: validation.expectedRevenue,
        collectedAmount: validation.collectedAmount,
        approvedDeposits: validation.approvedDeposits,
        remainingBalance: validation.remainingBalance,
        validationDifference: validation.validationDifference,
        validationStatus: validation.validationStatus
      },
      notes: 'Deposit approved'
    });

    // Auto-close the period after approval
    try {
      await sequelize.query(`
        INSERT IGNORE INTO monthly_closings (sectorUnitId, billingMonth, billingYear, closedBy)
        VALUES (?, ?, ?, ?)
      `, {
        replacements: [payment.sectorUnitId, payment.billingMonth, payment.billingYear, req.userId]
      });
    } catch (_) { /* non-blocking */ }

    res.json({
      success: true,
      message: 'Payment approved successfully. Period has been closed.',
      data: payment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Reject payment ────────────────────────────────────────────────────────
exports.rejectPayment = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    const oldStatus = payment.approvalStatus;

    if (oldStatus === 'APPROVED' && req.user.role === 'admin') {
      if (!req.body.reason || !req.body.reason.trim()) {
        return res.status(400).json({ success: false, message: 'A reason is required when rejecting an approved deposit.' });
      }
    }

    await payment.update({
      approvalStatus: 'REJECTED',
      verifiedBy: req.userId,
      verifiedAt: new Date()
    });

    await SectorPaymentAuditLog.create({
      sectorPaymentId: payment.id,
      userId: req.userId,
      actionType: 'REJECT',
      oldValues: { approvalStatus: oldStatus },
      newValues: { approvalStatus: 'REJECTED' },
      notes: req.body.reason || 'Payment rejected'
    });

    res.json({ success: true, message: 'Payment rejected.', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Edit/Update sector payment ────────────────────────────────────────────
exports.updateSectorPayment = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    const isClosed = await isPeriodClosed(payment.sectorUnitId, payment.billingMonth, payment.billingYear);

    // Permissions check
    if (req.user.role === 'sector_officer') {
      if (Number(payment.sectorUnitId) !== Number(req.user.sectorUnitId) || Number(payment.uploadedBy) !== Number(req.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only edit your own sector payments.' });
      }
      if (isClosed) {
        return res.status(403).json({ success: false, message: 'This period is financially closed. Edits are not allowed.' });
      }
      if (!['PENDING', 'REJECTED', 'REOPENED'].includes(payment.approvalStatus)) {
        return res.status(403).json({ success: false, message: `Cannot edit deposit directly. Current status is ${payment.approvalStatus}.` });
      }
    }

    if (isClosed && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'This period is financially closed. Only Super Admin or System Admin can edit deposits in closed periods. Please reopen the period first.' });
    }

    const wasApproved = payment.approvalStatus === 'APPROVED';
    if (wasApproved && req.user.role === 'admin') {
      if (!req.body.reason || !req.body.reason.trim()) {
        return res.status(400).json({ success: false, message: 'A reason is required when modifying approved deposits.' });
      }
    }

    const newAmount = req.body.totalAmount ? Number(req.body.totalAmount) : Number(payment.totalAmount);
    const newMonth = req.body.billingMonth ? Number(req.body.billingMonth) : payment.billingMonth;
    const newYear = req.body.billingYear ? Number(req.body.billingYear) : payment.billingYear;
    const newUnitId = req.body.sectorUnitId ? Number(req.body.sectorUnitId) : payment.sectorUnitId;

    // Recalculate metrics
    const validation = await validateSectorFinance(newUnitId, newMonth, newYear, newAmount);

    // Duplicate protection
    const { collectedAmount } = await getCollectedPayments(newUnitId, newMonth, newYear);
    const { approvedDeposits } = await getApprovedDeposits(newUnitId, newMonth, newYear);
    const otherApproved = wasApproved ? Math.max(0, approvedDeposits - Number(payment.totalAmount)) : approvedDeposits;

    let finalApprovalStatus = payment.approvalStatus;
    if (collectedAmount === 0 && newAmount > 0) {
      finalApprovalStatus = 'PENDING';
    } else if (otherApproved + newAmount > collectedAmount) {
      finalApprovalStatus = 'FLAGGED';
    } else if (validation.validationStatus === 'FLAGGED') {
      finalApprovalStatus = 'FLAGGED';
    }

    // Receipt replacement (versioned)
    let finalReceiptFile = payment.receiptFile;
    if (req.file) {
      finalReceiptFile = await saveVersionedReceipt(payment.id, req.file);
    }

    const updatedFields = {
      sectorUnitId: newUnitId,
      billingMonth: newMonth,
      billingYear: newYear,
      totalAmount: newAmount,
      bankName: req.body.bankName || payment.bankName,
      transactionId: req.body.transactionId !== undefined ? req.body.transactionId : payment.transactionId,
      notes: req.body.notes || payment.notes,
      receiptFile: finalReceiptFile,
      approvalStatus: finalApprovalStatus,
      expectedRevenue: validation.expectedRevenue,
      collectedAmount: validation.collectedAmount,
      approvedDeposits: validation.approvedDeposits,
      remainingBalance: validation.remainingBalance,
      validationDifference: validation.validationDifference,
      validationStatus: validation.validationStatus
    };

    // Calculate changes for audit log
    const oldValues = {};
    const newValues = {};
    Object.keys(updatedFields).forEach(key => {
      if (String(payment[key]) !== String(updatedFields[key])) {
        oldValues[key] = payment[key];
        newValues[key] = updatedFields[key];
      }
    });

    if (Object.keys(oldValues).length > 0) {
      await payment.update(updatedFields);

      await SectorPaymentAuditLog.create({
        sectorPaymentId: payment.id,
        userId: req.userId,
        actionType: 'EDIT',
        oldValues,
        newValues,
        notes: req.body.reason || req.body.notes || 'Payment details modified'
      });
    }

    res.json({
      success: true,
      message: finalApprovalStatus === 'FLAGGED'
        ? 'Payment updated but FLAGGED (exceeds collected member payments).'
        : 'Payment updated successfully.',
      data: payment,
      validation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Submit correction request ─────────────────────────────────────────────
exports.requestCorrection = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    const isClosed = await isPeriodClosed(payment.sectorUnitId, payment.billingMonth, payment.billingYear);
    if (isClosed) {
      return res.status(403).json({ success: false, message: 'This period is financially closed. Correction requests are not allowed.' });
    }

    if (req.user.role === 'sector_officer') {
      if (Number(payment.sectorUnitId) !== Number(req.user.sectorUnitId) || Number(payment.uploadedBy) !== Number(req.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only request corrections for your own sector payments.' });
      }
    }

    if (payment.approvalStatus !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'You can only request corrections for APPROVED payments.' });
    }

    const oldStatus = payment.approvalStatus;

    let finalReceiptFile = payment.receiptFile;
    if (req.file) {
      finalReceiptFile = await saveVersionedReceipt(payment.id, req.file);
    }

    const updatedFields = {
      approvalStatus: 'CORRECTION_REQUESTED',
      receiptFile: finalReceiptFile,
      notes: req.body.notes || payment.notes
    };

    const oldValues = { approvalStatus: oldStatus };
    const newValues = { approvalStatus: 'CORRECTION_REQUESTED' };

    if (finalReceiptFile !== payment.receiptFile) {
      oldValues.receiptFile = payment.receiptFile;
      newValues.receiptFile = finalReceiptFile;
    }

    await payment.update(updatedFields);

    await SectorPaymentAuditLog.create({
      sectorPaymentId: payment.id,
      userId: req.userId,
      actionType: 'REQUEST_CORRECTION',
      oldValues,
      newValues,
      notes: req.body.notes || 'Correction requested'
    });

    res.json({
      success: true,
      message: 'Correction requested successfully.',
      data: payment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Reopen payment ────────────────────────────────────────────────────────
exports.reopenPayment = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    const isClosed = await isPeriodClosed(payment.sectorUnitId, payment.billingMonth, payment.billingYear);

    if (isClosed && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'This period is financially closed. Only Super Admin or System Admin can reopen payments for closed periods.' });
    }

    const oldStatus = payment.approvalStatus;
    await payment.update({ approvalStatus: 'REOPENED' });

    if (isClosed) {
      await sequelize.query(`
        DELETE FROM monthly_closings
        WHERE sectorUnitId = ? AND billingMonth = ? AND billingYear = ?
      `, {
        replacements: [payment.sectorUnitId, payment.billingMonth, payment.billingYear]
      });
    }

    await SectorPaymentAuditLog.create({
      sectorPaymentId: payment.id,
      userId: req.userId,
      actionType: 'REOPEN',
      oldValues: { approvalStatus: oldStatus, isClosed },
      newValues: { approvalStatus: 'REOPENED', isClosed: false },
      notes: req.body.reason || (isClosed ? 'Payment and period reopened by Super Admin' : 'Payment reopened')
    });

    res.json({ success: true, message: 'Payment reopened successfully.', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Revoke approval ───────────────────────────────────────────────────────
exports.revokePayment = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    const oldStatus = payment.approvalStatus;
    await payment.update({ approvalStatus: 'PENDING' });

    // Remove monthly closing record
    await sequelize.query(`
      DELETE FROM monthly_closings
      WHERE sectorUnitId = ? AND billingMonth = ? AND billingYear = ?
    `, {
      replacements: [payment.sectorUnitId, payment.billingMonth, payment.billingYear]
    });

    await SectorPaymentAuditLog.create({
      sectorPaymentId: payment.id,
      userId: req.userId,
      actionType: 'REVOKE',
      oldValues: { approvalStatus: oldStatus },
      newValues: { approvalStatus: 'PENDING' },
      notes: req.body.reason || 'Approval revoked'
    });

    res.json({ success: true, message: 'Approval revoked. Status reset to pending and period reopened.', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Fetch audit logs ──────────────────────────────────────────────────────
exports.getSectorPaymentAuditLogs = async (req, res) => {
  try {
    const payment = await SectorPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Sector payment not found.' });

    if (req.user.role === 'sector_officer') {
      if (Number(payment.sectorUnitId) !== Number(req.user.sectorUnitId)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const logs = await SectorPaymentAuditLog.findAll({
      where: { sectorPaymentId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['fullName'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Monthly closing management ────────────────────────────────────────────
exports.getClosingStatus = async (req, res) => {
  try {
    const { sectorUnitId, billingMonth, billingYear } = req.query;
    if (!sectorUnitId || !billingMonth || !billingYear) {
      return res.status(400).json({ success: false, message: 'Missing query params' });
    }
    const closed = await isPeriodClosed(sectorUnitId, billingMonth, billingYear);
    res.json({ success: true, data: { isClosed: closed } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.closePeriod = async (req, res) => {
  try {
    const { sectorUnitId, billingMonth, billingYear } = req.body;
    if (!sectorUnitId || !billingMonth || !billingYear) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await sequelize.query(`
      INSERT IGNORE INTO monthly_closings (sectorUnitId, billingMonth, billingYear, closedBy)
      VALUES (?, ?, ?, ?)
    `, {
      replacements: [Number(sectorUnitId), Number(billingMonth), Number(billingYear), req.userId]
    });

    res.json({ success: true, message: 'Period closed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.openPeriod = async (req, res) => {
  try {
    const { sectorUnitId, billingMonth, billingYear } = req.body;
    if (!sectorUnitId || !billingMonth || !billingYear) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const isClosed = await isPeriodClosed(sectorUnitId, billingMonth, billingYear);
    if (isClosed && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'This period is financially closed. Only Super Admin or System Admin can reopen closed periods.' });
    }

    await sequelize.query(`
      DELETE FROM monthly_closings
      WHERE sectorUnitId = ? AND billingMonth = ? AND billingYear = ?
    `, {
      replacements: [Number(sectorUnitId), Number(billingMonth), Number(billingYear)]
    });

    res.json({ success: true, message: 'Period re-opened successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
