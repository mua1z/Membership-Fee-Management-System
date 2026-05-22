// models/SectorUnit.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SectorUnit = sequelize.define('SectorUnit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  sectorTypeId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'sector_types', key: 'id' }
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'sector_units', key: 'id' }
  }
}, {
  tableName: 'sector_units',
  timestamps: false
});

module.exports = SectorUnit;
