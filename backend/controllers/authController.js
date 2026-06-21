// controllers/authController.js - Authentication Controller (MySQL / Sequelize)
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const SectorUnit = require('../models/SectorUnit');
const { sendEmail } = require('../utils/emailService');
const emailValidator = require('deep-email-validator');
const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

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

    // Verify email actually exists
    const emailCheck = await emailValidator.validate({
      email: email,
      validateRegex: true,
      validateMx: false, // Disabled because MX lookups often fail or timeout in cloud environments (like Render)
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false,
    });

    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a real, existing email address. This email appears to be invalid or does not exist.'
      });
    }

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

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    const user = await User.create({ 
      username, email, password, fullName, 
      role: role || 'operator',
      isVerified: false,
      otpCode,
      otpExpiresAt
    });

    // Send Welcome Email (non-blocking — don't fail if email fails)
    sendEmail({
      to: email,
      subject: 'Verify your account - Prosperity Party Dire Dawa',
      text: `Hello ${fullName},\n\nWelcome to the Prosperity Party Dire Dawa Membership Fee App!\nYour verification code is: ${otpCode}\n\nPlease enter this code to activate your account. The code expires in 15 minutes.\n\nBest regards,\nAdmin Team`,
      html: `<h3>Hello ${fullName},</h3><p>Welcome to the <strong>Prosperity Party Dire Dawa Membership Fee App</strong>!</p><h2>Your verification code is: <span style="color:#007BFF">${otpCode}</span></h2><p>Please enter this code on the verification screen to activate your account. The code expires in 15 minutes.</p><br><p>Best regards,<br>Admin Team</p>`
    });

    res.status(201).json({
      success: true,
      requireVerification: true,
      email: user.email,
      message: 'Registration successful. Please verify your email address to continue.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed due to a server error.' });
  }
};

// Login
exports.login = async (req, res) => {
  let cleanEmail = '';
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    cleanEmail = email.trim().toLowerCase();
    let user;
    try {
      user = await User.findOne({
        where: { email: cleanEmail },
        include: [{ model: SectorUnit, as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
      });
    } catch (includeErr) {
      console.warn('SectorUnit include failed, falling back to basic lookup:', includeErr.message);
      user = await User.findOne({ where: { email: cleanEmail } });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isVerified === false) {
      // Generate new OTP and prompt verification
      const otpCode = generateOTP();
      user.otpCode = otpCode;
      user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      await sendEmail({
        to: user.email,
        subject: 'Verify your account - Prosperity Party Dire Dawa',
        text: `Your verification code is: ${otpCode}. It expires in 15 minutes.`,
        html: `<h2>Your verification code is: <span style="color:#007BFF">${otpCode}</span></h2><p>It expires in 15 minutes.</p>`
      });

      return res.status(403).json({
        success: false,
        requireVerification: true,
        email: user.email,
        message: 'Your email address is not verified. A new verification code has been sent to your email.'
      });
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
    let dbOk = 'UNKNOWN';
    try {
      await require('../config/db').sequelize.authenticate();
      dbOk = 'YES';
    } catch (_) { dbOk = 'NO'; }
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ LOGIN ERROR                                             ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║  ${(error.message || String(error)).padEnd(62)}║`);
    console.error(`║  DB Connected: ${String(dbOk).padEnd(52)}║`);
    console.error(`║  User email : ${(cleanEmail || 'unknown').padEnd(52)}║`);
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    res.status(500).json({ success: false, message: 'Login failed due to a server error. Please try again.' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    let user;
    try {
      user = await User.findByPk(req.userId, {
        attributes: { exclude: ['password'] },
        include: [{ model: SectorUnit, as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
      });
    } catch (includeErr) {
      console.warn('SectorUnit include failed in getMe, falling back to basic lookup:', includeErr.message);
      user = await User.findByPk(req.userId, {
        attributes: { exclude: ['password'] }
      });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user data.' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

// Verify Email with OTP
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    
    if (!email || !otpCode) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified.' });
    }

    if (user.otpCode !== otpCode) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Email verified successfully. You are now logged in.',
      data: {
        user: { 
          id: user.id, username: user.username, email: user.email, 
          fullName: user.fullName, role: user.role, sectorUnitId: user.sectorUnitId, 
          profilePic: user.profilePic
        },
        token
      }
    });
  } catch (error) {
    console.error('verifyEmail error:', error);
    res.status(500).json({ success: false, message: 'Verification failed due to a server error.' });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified.' });
    }

    const otpCode = generateOTP();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'New Verification Code - Prosperity Party Dire Dawa',
      text: `Your new verification code is: ${otpCode}. It expires in 15 minutes.`,
      html: `<h2>Your new verification code is: <span style="color:#007BFF">${otpCode}</span></h2><p>It expires in 15 minutes.</p>`
    });

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('resendOtp error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend code due to a server error.' });
  }
};

