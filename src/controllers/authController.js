/**
 * Smart Recipe Generator - AuthController
 * Handles user registration, login, logout, and session check
 * Implements UC-01, UC-02, UC-03, BR-12, BR-13
 */

const User = require('../models/user');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const AuthController = {
  /**
   * UC-01: User Registration
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { nama, email, kataSandi, konfirmasi } = req.body || {};
      const galat = [];

      if (!nama || !nama.trim()) {
        galat.push('Nama wajib diisi');
      }

      if (!email || !email.trim()) {
        galat.push('Email wajib diisi');
      } else if (!emailRegex.test(email.trim())) {
        galat.push('Format email tidak valid');
      }

      if (!kataSandi) {
        galat.push('Kata sandi wajib diisi');
      } else if (kataSandi.length < 8) {
        galat.push('Kata sandi minimal 8 karakter');
      } else if (!passwordRegex.test(kataSandi)) {
        galat.push('Kata sandi harus memuat huruf dan angka');
      }

      if (kataSandi !== konfirmasi) {
        galat.push('Konfirmasi kata sandi tidak sama');
      }

      if (galat.length > 0) {
        return res.status(422).json({ galat, pesan: galat[0] });
      }

      // Check if email already registered (BR-12, TC-06)
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ pesan: 'Email sudah terdaftar' });
      }

      // Hash password with bcrypt cost >= 10
      const passwordHash = await User.hashKataSandi(kataSandi);
      const newUser = await User.create(nama, email, passwordHash);

      return res.status(201).json({
        pesan: 'Pendaftaran berhasil, silakan masuk.',
        user: newUser
      });
    } catch (err) {
      console.error('[AuthController.register] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * UC-02: User Login
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, kataSandi } = req.body || {};

      if (!email || !email.trim() || !kataSandi) {
        return res.status(422).json({ pesan: 'Email dan kata sandi wajib diisi' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ pesan: 'Email atau kata sandi salah' });
      }

      const isMatch = await User.verifyPassword(kataSandi, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ pesan: 'Email atau kata sandi salah' });
      }

      // Set session data
      req.session.user = {
        id: user.id,
        nama: user.nama,
        email: user.email
      };

      return res.status(200).json({
        pesan: 'Login berhasil',
        user: req.session.user
      });
    } catch (err) {
      console.error('[AuthController.login] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * UC-03: User Logout
   * POST /api/auth/logout
   */
  async logout(req, res) {
    req.session.destroy(err => {
      if (err) {
        console.error('[AuthController.logout] Error destroying session:', err);
        return res.status(500).json({ pesan: 'Gagal keluar dari sesi' });
      }
      res.clearCookie('connect.sid');
      return res.status(204).send();
    });
  },

  /**
   * Check Current User Session
   * GET /api/auth/me
   */
  async me(req, res) {
    if (req.session && req.session.user) {
      return res.status(200).json(req.session.user);
    }
    return res.status(401).json({ pesan: 'Belum login' });
  },

  /**
   * F-12, KF-22: Get Stored Dietary Restriction Profile
   * GET /api/auth/profile/restrictions
   */
  async getRestrictions(req, res) {
    try {
      const userId = req.session.user.id;
      const pantangan = await User.getDietaryProfile(userId);
      return res.status(200).json({ pantangan });
    } catch (err) {
      console.error('[AuthController.getRestrictions] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * F-12, KF-22: Update Stored Dietary Restriction Profile
   * PUT /api/auth/profile/restrictions
   */
  async updateRestrictions(req, res) {
    try {
      const userId = req.session.user.id;
      const { pantangan } = req.body || {};

      if (!Array.isArray(pantangan)) {
        return res.status(422).json({ pesan: 'Format profil pantangan tidak valid' });
      }

      if (pantangan.length > 10) {
        return res.status(422).json({ pesan: 'Maksimal 10 pantangan' });
      }

      // Sanitize items
      const cleanList = pantangan
        .map(p => (typeof p === 'string' ? p.trim().toLowerCase() : ''))
        .filter(Boolean);

      await User.updateDietaryProfile(userId, cleanList);
      return res.status(200).json({
        pesan: 'Profil pantangan berhasil disimpan',
        pantangan: cleanList
      });
    } catch (err) {
      console.error('[AuthController.updateRestrictions] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  }
};

module.exports = AuthController;
