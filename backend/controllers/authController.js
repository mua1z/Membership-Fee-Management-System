// controllers/authController.js - Authentication Controller (MySQL / Sequelize)
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const SectorUnit = require('../models/SectorUnit');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email: email.toLowerCase() }, { username }] }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username.'
      });
    }

    const user = await User.create({ username, email, password, fullName, role: role || 'operator' });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role, sectorUnitId: user.sectorUnitId, profilePic: user.profilePic },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      where: { email: cleanEmail },
      include: [{ model: SectorUnit, as: 'assignedSectorUnit' }]
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { 
          id: user.id, username: user.username, email: user.email, 
          fullName: user.fullName, role: user.role, sectorUnitId: user.sectorUnitId, 
          profilePic: user.profilePic, assignedSectorUnit: user.assignedSectorUnit 
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [{ model: SectorUnit, as: 'assignedSectorUnit' }]
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
