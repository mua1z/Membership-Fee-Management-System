const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SectorPayment = sequelize.define('SectorPayment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  sectorUnitId: { type: DataTypes.INTEGER, allowNull: false },

  billingMonth: { type: DataTypes.INTEGER, allowNull: false },
  billingYear:  { type: DataTypes.INTEGER, allowNull: false },

  totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },

  bankName:        { type: DataTypes.STRING(100), defaultValue: 'Commercial Bank of Ethiopia' },
  transactionId:   { type: DataTypes.STRING(100), allowNull: true },
  receiptFile:     { type: DataTypes.STRING(255), allowNull: true },

  approvalStatus: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'REOPENED', 'FLAGGED'), defaultValue: 'PENDING' },
  verifiedBy:     { type: DataTypes.INTEGER, allowNull: true },
  verifiedAt:     { type: DataTypes.DATE, allowNull: true },

  notes: { type: DataTypes.TEXT, allowNull: true },

  uploadedBy: { type: DataTypes.INTEGER, allowNull: false },

  // Validation columns
  expectedRevenue:      { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  collectedAmount:      { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  approvedDeposits:     { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  remainingBalance:     { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  validationDifference: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  validationStatus:     { type: DataTypes.ENUM('VALID', 'WARNING', 'FLAGGED', 'INFO'), allowNull: true },
  isClosed:             { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'sector_payments',
  timestamps: true,
  indexes: [
    { fields: ['sectorUnitId'] },
    { fields: ['approvalStatus'] },
    { fields: ['billingYear', 'billingMonth'] }
  ]
});

SectorPayment.prototype.toJSON = function () {
  const v = Object.assign({}, this.get());
  v._id = v.id;
  return v;
};

module.exports = SectorPayment;
