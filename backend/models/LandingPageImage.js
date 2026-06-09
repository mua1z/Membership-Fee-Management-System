const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LandingPageImage = sequelize.define('LandingPageImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  altText: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'alt_text'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  thumbnailSmall: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'thumbnail_small'
  },
  thumbnailMedium: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'thumbnail_medium'
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'gallery'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size'
  },
  imageWidth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'image_width'
  },
  imageHeight: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'image_height'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    field: 'uploaded_by'
  }
}, {
  tableName: 'landing_page_images',
  timestamps: true,
  underscored: true
});

module.exports = LandingPageImage;
