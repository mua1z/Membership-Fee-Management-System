const News = require('../models/News');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const newsUploadsDir = path.join(__dirname, '..', 'uploads', 'news');
if (!fs.existsSync(newsUploadsDir)) {
  fs.mkdirSync(newsUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, newsUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, and GIF files are allowed.'));
  }
};

exports.upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });

exports.getLatest = async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 2;
    const news = await News.findAll({
      where: { isActive: 1 },
      order: [['createdAt', 'DESC']],
      limit: count
    });
    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { page, limit: pageLimit } = req.query;
    const where = {};

    if (page && pageLimit) {
      const p = parseInt(page) || 1;
      const l = parseInt(pageLimit) || 20;
      const offset = (p - 1) * l;
      const { rows, count } = await News.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        offset,
        limit: l
      });
      return res.json({ success: true, data: rows, pagination: { page: p, limit: l, total: count, pages: Math.ceil(count / l) } });
    }

    const news = await News.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    let image = null;
    if (req.file) {
      image = '/uploads/news/' + req.file.filename;
    }

    const news = await News.create({
      title,
      content: content || '',
      image,
      category: category || 'news',
      createdBy: req.userId
    });

    res.json({ success: true, message: 'News created', data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    const { title, content, category, isActive } = req.body;

    if (title !== undefined) news.title = title;
    if (content !== undefined) news.content = content;
    if (category !== undefined) news.category = category;
    if (isActive !== undefined) news.isActive = isActive;

    if (req.file) {
      if (news.image) {
        const oldPath = path.join(__dirname, '..', news.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      news.image = '/uploads/news/' + req.file.filename;
    }

    await news.save();
    res.json({ success: true, message: 'News updated', data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    if (news.image) {
      const filePath = path.join(__dirname, '..', news.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await news.destroy();
    res.json({ success: true, message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
