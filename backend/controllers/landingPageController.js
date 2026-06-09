const LandingPageImage = require('../models/LandingPageImage');
const LandingPageContent = require('../models/LandingPageContent');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const SectorUnit = require('../models/SectorUnit');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const { getEthiopianYear, getEthiopianMonth } = require('../utils/ethiopianCalendar');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'landing');
const thumbsSmallDir = path.join(uploadsDir, 'thumb_small');
const thumbsMediumDir = path.join(uploadsDir, 'thumb_medium');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbsSmallDir)) fs.mkdirSync(thumbsSmallDir, { recursive: true });
if (!fs.existsSync(thumbsMediumDir)) fs.mkdirSync(thumbsMediumDir, { recursive: true });

function imageUrl(filename) {
  return '/uploads/landing/' + filename;
}

function thumbUrl(dir, filename) {
  return '/uploads/landing/' + dir + '/' + filename;
}

exports.getPublicContent = async (req, res) => {
  try {
    const entries = await LandingPageContent.findAll();
    const contentMap = {};
    entries.forEach(e => { contentMap[e.key] = e.value; });

    const images = await LandingPageImage.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, data: { content: contentMap, images } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGallery = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const where = { isActive: true };
    if (category && category !== 'all') where.category = category;

    const order = sort === 'oldest' ? [['createdAt', 'ASC']] : [['createdAt', 'DESC']];

    let images;
    if (search) {
      images = await LandingPageImage.findAll({
        where: {
          ...where,
          title: { [require('sequelize').Op.like]: `%${search}%` }
        },
        order
      });
    } else {
      images = await LandingPageImage.findAll({ where, order });
    }

    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeaturedImage = async (req, res) => {
  try {
    const image = await LandingPageImage.findOne({
      where: { isFeatured: true, isActive: true },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: image });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLandingStats = async (req, res) => {
  try {
    const { sequelize } = require('../config/db');
    const Q = sequelize.QueryTypes.SELECT;
    const currentYear = getEthiopianYear();
    const currentMonth = getEthiopianMonth();

    const [totalMembersRow] = await sequelize.query('SELECT COUNT(*) AS cnt FROM members WHERE status = \'Active\'', { type: Q });
    const [totalPaymentsRow] = await sequelize.query('SELECT COUNT(*) AS cnt FROM payments WHERE status = \'Paid\'', { type: Q });
    const [totalRevenueRow] = await sequelize.query('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = \'Paid\'', { type: Q });
    const [sectorsRow] = await sequelize.query('SELECT COUNT(*) AS cnt FROM sector_units', { type: Q });
    const [monthlyPaidRow] = await sequelize.query('SELECT COUNT(DISTINCT memberDbId) AS cnt FROM payments WHERE periodYear = ? AND periodMonth = ? AND status = \'Paid\'', { replacements: [currentYear, currentMonth], type: Q });

    const totalMembers = Number(totalMembersRow?.cnt) || 0;
    const totalPayments = Number(totalPaymentsRow?.cnt) || 0;
    const totalRevenue = Number(totalRevenueRow?.total) || 0;
    const totalSectors = Number(sectorsRow?.cnt) || 0;

    let paidThisMonth = Number(monthlyPaidRow?.cnt) || 0;
    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (paidThisMonth === 0) {
      const [latestPeriodRow] = await sequelize.query('SELECT periodYear, periodMonth FROM payments WHERE status = \'Paid\' ORDER BY periodYear DESC, periodMonth DESC LIMIT 1', { type: Q });
      if (latestPeriodRow) {
        targetYear = latestPeriodRow.periodYear;
        targetMonth = latestPeriodRow.periodMonth;
        const [fallbackPaidRow] = await sequelize.query('SELECT COUNT(DISTINCT memberDbId) AS cnt FROM payments WHERE periodYear = ? AND periodMonth = ? AND status = \'Paid\'', { replacements: [targetYear, targetMonth], type: Q });
        paidThisMonth = Number(fallbackPaidRow?.cnt) || 0;
      }
    }

    const collectionRate = totalMembers > 0 ? Math.round((paidThisMonth / totalMembers) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalMembers,
        totalPayments,
        totalRevenue,
        totalSectors,
        paidThisMonth,
        collectionRate,
        statsPeriod: { year: targetYear, month: targetMonth }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filename = req.file.filename;
    const filePath = req.file.path;

    let metadata = { width: null, height: null, size: req.file.size };
    let thumbSmallPath = null;
    let thumbMediumPath = null;

    try {
      const imgInfo = await sharp(filePath).metadata();
      metadata.width = imgInfo.width;
      metadata.height = imgInfo.height;

      const thumbSmallFile = 'sm_' + filename;
      const thumbMediumFile = 'md_' + filename;

      await sharp(filePath)
        .resize(300, 200, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 80 })
        .toFile(path.join(thumbsSmallDir, thumbSmallFile));
      thumbSmallPath = thumbUrl('thumb_small', thumbSmallFile);

      await sharp(filePath)
        .resize(800, 533, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 85 })
        .toFile(path.join(thumbsMediumDir, thumbMediumFile));
      thumbMediumPath = thumbUrl('thumb_medium', thumbMediumFile);
    } catch (sharpErr) {
      console.warn('⚠️ Sharp processing skipped:', sharpErr.message);
    }

    const image = await LandingPageImage.create({
      title: req.body.title || '',
      altText: req.body.altText || '',
      description: req.body.description || '',
      image: imageUrl(filename),
      thumbnailSmall: thumbSmallPath,
      thumbnailMedium: thumbMediumPath,
      category: req.body.category || 'gallery',
      displayOrder: req.body.displayOrder || 0,
      isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
      language: req.body.language || 'en',
      fileSize: metadata.size,
      imageWidth: metadata.width,
      imageHeight: metadata.height,
      uploadedBy: req.userId
    });

    res.json({ success: true, message: 'Image uploaded successfully', data: image });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, message: 'updates object required' });
    }

    for (const [key, value] of Object.entries(updates)) {
      const existing = await LandingPageContent.findOne({ where: { key } });
      if (existing) {
        existing.value = String(value);
        existing.updatedBy = req.userId;
        await existing.save();
      } else {
        await LandingPageContent.create({ key, value: String(value), updatedBy: req.userId });
      }
    }

    const entries = await LandingPageContent.findAll();
    const contentMap = {};
    entries.forEach(e => { contentMap[e.key] = e.value; });

    res.json({ success: true, message: 'Content updated', data: contentMap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateImage = async (req, res) => {
  try {
    const image = await LandingPageImage.findByPk(req.params.id);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    const updatable = ['title', 'altText', 'description', 'category', 'displayOrder', 'isActive', 'isFeatured', 'language'];
    for (const field of updatable) {
      if (req.body[field] !== undefined) {
        image[field] = req.body[field];
      }
    }

    await image.save();
    res.json({ success: true, message: 'Image updated', data: image });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.replaceImage = async (req, res) => {
  try {
    const image = await LandingPageImage.findByPk(req.params.id);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const oldPath = path.join(__dirname, '..', image.image);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    if (image.thumbnailSmall) {
      const oldSm = path.join(__dirname, '..', image.thumbnailSmall);
      if (fs.existsSync(oldSm)) fs.unlinkSync(oldSm);
    }
    if (image.thumbnailMedium) {
      const oldMd = path.join(__dirname, '..', image.thumbnailMedium);
      if (fs.existsSync(oldMd)) fs.unlinkSync(oldMd);
    }

    const filename = req.file.filename;
    const filePath = req.file.path;
    let metadata = { width: null, height: null, size: req.file.size };
    let thumbSmallPath = null;
    let thumbMediumPath = null;

    try {
      const imgInfo = await sharp(filePath).metadata();
      metadata.width = imgInfo.width;
      metadata.height = imgInfo.height;

      const thumbSmallFile = 'sm_' + filename;
      const thumbMediumFile = 'md_' + filename;

      await sharp(filePath)
        .resize(300, 200, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 80 })
        .toFile(path.join(thumbsSmallDir, thumbSmallFile));
      thumbSmallPath = thumbUrl('thumb_small', thumbSmallFile);

      await sharp(filePath)
        .resize(800, 533, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 85 })
        .toFile(path.join(thumbsMediumDir, thumbMediumFile));
      thumbMediumPath = thumbUrl('thumb_medium', thumbMediumFile);
    } catch (sharpErr) {
      console.warn('⚠️ Sharp processing skipped:', sharpErr.message);
    }

    image.image = imageUrl(filename);
    image.thumbnailSmall = thumbSmallPath;
    image.thumbnailMedium = thumbMediumPath;
    image.fileSize = metadata.size;
    image.imageWidth = metadata.width;
    image.imageHeight = metadata.height;
    await image.save();

    res.json({ success: true, message: 'Image replaced', data: image });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const image = await LandingPageImage.findByPk(req.params.id);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    const filePath = path.join(__dirname, '..', image.image);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (image.thumbnailSmall) {
      const smPath = path.join(__dirname, '..', image.thumbnailSmall);
      if (fs.existsSync(smPath)) fs.unlinkSync(smPath);
    }
    if (image.thumbnailMedium) {
      const mdPath = path.join(__dirname, '..', image.thumbnailMedium);
      if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
    }

    await image.destroy();
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkDeleteImages = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }

    const images = await LandingPageImage.findAll({ where: { id: ids } });
    for (const image of images) {
      const filePath = path.join(__dirname, '..', image.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (image.thumbnailSmall) {
        const smPath = path.join(__dirname, '..', image.thumbnailSmall);
        if (fs.existsSync(smPath)) fs.unlinkSync(smPath);
      }
      if (image.thumbnailMedium) {
        const mdPath = path.join(__dirname, '..', image.thumbnailMedium);
        if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
      }
    }

    await LandingPageImage.destroy({ where: { id: ids } });
    res.json({ success: true, message: `${images.length} image(s) deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllImages = async (req, res) => {
  try {
    const { category, search, sort, page, limit: pageLimit } = req.query;
    const where = {};
    if (category && category !== 'all') where.category = category;

    if (search) {
      where.title = { [require('sequelize').Op.like]: `%${search}%` };
    }

    const order = sort === 'oldest' ? [['createdAt', 'ASC']] : [['createdAt', 'DESC']];

    if (page && pageLimit) {
      const p = parseInt(page, 10) || 1;
      const l = parseInt(pageLimit, 10) || 20;
      const offset = (p - 1) * l;
      const { rows, count } = await LandingPageImage.findAndCountAll({
        where,
        order,
        offset,
        limit: l
      });
      return res.json({ success: true, data: rows, pagination: { page: p, limit: l, total: count, pages: Math.ceil(count / l) } });
    }

    const images = await LandingPageImage.findAll({ where, order });
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
