// controllers/userController.js - User Management Controller
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const emailValidator = require('deep-email-validator');

// ─── Admin: Get all users ─────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{ model: require('../models/SectorUnit'), as: 'assignedSectorUnit', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Get single user ───────────────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: require('../models/SectorUnit'), as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Create user ───────────────────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, role, sectorUnitId, isActive } = req.body;

    // Verify email actually exists
    const emailCheck = await emailValidator.validate({
      email: email,
      validateRegex: true,
      validateMx: false, // Disabled: MX lookups fail/timeout in cloud environments (Render)
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

    const existing = await User.findOne({
      where: { [Op.or]: [{ email: email.toLowerCase() }, { username }] }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists.' });
    }

    const user = await User.create({
      username, email, password, fullName,
      role: role || 'sector_officer',
      sectorUnitId: sectorUnitId || null,
      isActive: isActive !== undefined ? isActive : true
    });

    // Send Welcome Email (non-blocking — don't fail if email fails)
    sendEmail({
      to: email,
      subject: 'Account Created - Prosperity Party Dire Dawa',
      text: `Hello ${fullName},\n\nAn admin has created an account for you on the Prosperity Party Dire Dawa Membership Fee App!\nYour username is: ${username}.\nYour password is: ${password}\n\nPlease login and change your password.\n\nBest regards,\nAdmin Team`,
      html: `<h3>Hello ${fullName},</h3><p>An admin has created an account for you on the <strong>Prosperity Party Dire Dawa Membership Fee App</strong>!</p><p>Your username is: <strong>${username}</strong></p><p>Your temporary password is: <strong>${password}</strong></p><p>Please login and change your password as soon as possible.</p><br><p>Best regards,<br>Admin Team</p>`
    });

    const fresh = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: require('../models/SectorUnit'), as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
    });
    res.status(201).json({ success: true, message: 'User created successfully.', data: fresh });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Update any user ───────────────────────────────────────────────────
exports.adminUpdateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { username, email, fullName, role, sectorUnitId, isActive, password } = req.body;

    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (sectorUnitId !== undefined) user.sectorUnitId = sectorUnitId || null;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // triggers beforeUpdate hook

    await user.save();

    const fresh = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: require('../models/SectorUnit'), as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
    });
    res.json({ success: true, message: 'User updated successfully.', data: fresh });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Delete user ───────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion
    if (Number(req.params.id) === req.userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Reset user password ───────────────────────────────────────────────
exports.adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Self: Get my profile ─────────────────────────────────────────────────────
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [{ model: require('../models/SectorUnit'), as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Self: Update own profile ─────────────────────────────────────────────────
exports.updateMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { fullName, email, username, profilePic } = req.body;

    if (fullName) user.fullName = fullName;
    if (username) {
      // Check uniqueness
      const existing = await User.findOne({ where: { username, id: { [Op.ne]: req.userId } } });
      if (existing) return res.status(400).json({ success: false, message: 'Username already taken.' });
      user.username = username;
    }
    if (email) {
      const existing = await User.findOne({ where: { email: email.toLowerCase(), id: { [Op.ne]: req.userId } } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use.' });
      user.email = email;
    }
    if (profilePic) user.profilePic = profilePic;

    await user.save();

    const fresh = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [{ model: require('../models/SectorUnit'), as: 'assignedSectorUnit', attributes: ['id', 'name'] }]
    });
    res.json({ success: true, message: 'Profile updated successfully.', data: fresh });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Self: Change own password ────────────────────────────────────────────────
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Self: Upload profile picture ─────────────────────────────────────────────
exports.uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Delete old pic if exists
    if (user.profilePic) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(user.profilePic));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const picUrl = `/uploads/${req.file.filename}`;
    user.profilePic = picUrl;
    await user.save();

    res.json({ success: true, message: 'Profile picture updated.', data: { profilePic: picUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
