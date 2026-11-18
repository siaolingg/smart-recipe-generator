/**
 * Smart Recipe Generator - User Model
 * Implements entity User (Gambar 25 Class Diagram) & Dietary Restriction Profile (F-12, KF-22)
 * Uses parameterized queries (? placeholders)
 */

const bcrypt = require('bcryptjs');
const { getPool, inMemoryDb } = require('../db/db');

const User = {
  /**
   * Hashes a password with bcrypt (cost >= 10, BR-12)
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashKataSandi(password) {
    return bcrypt.hash(password, 10);
  },

  /**
   * Verifies plain text password against hash
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  /**
   * Finds a user by email
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const pool = await getPool();

    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, nama, email, password_hash, profil_pantangan, created_at FROM users WHERE email = ? LIMIT 1',
        [cleanEmail]
      );
      if (!rows[0]) return null;
      const u = rows[0];
      return {
        ...u,
        profil_pantangan: typeof u.profil_pantangan === 'string' ? JSON.parse(u.profil_pantangan) : (u.profil_pantangan || [])
      };
    }

    // In-memory fallback
    const user = inMemoryDb.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) return null;
    return {
      ...user,
      profil_pantangan: Array.isArray(user.profil_pantangan) ? [...user.profil_pantangan] : []
    };
  },

  /**
   * Finds a user by ID
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const numId = Number(id);
    const pool = await getPool();

    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, nama, email, profil_pantangan, created_at FROM users WHERE id = ? LIMIT 1',
        [numId]
      );
      if (!rows[0]) return null;
      const u = rows[0];
      return {
        id: u.id,
        nama: u.nama,
        email: u.email,
        profil_pantangan: typeof u.profil_pantangan === 'string' ? JSON.parse(u.profil_pantangan) : (u.profil_pantangan || []),
        created_at: u.created_at
      };
    }

    // In-memory fallback
    const user = inMemoryDb.users.find(u => u.id === numId);
    if (!user) return null;
    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      profil_pantangan: Array.isArray(user.profil_pantangan) ? [...user.profil_pantangan] : [],
      created_at: user.created_at
    };
  },

  /**
   * Creates a new user
   * @param {string} nama
   * @param {string} email
   * @param {string} passwordHash
   * @returns {Promise<object>}
   */
  async create(nama, email, passwordHash) {
    const cleanNama = nama.trim();
    const cleanEmail = email.trim().toLowerCase();
    const pool = await getPool();

    if (pool) {
      const [result] = await pool.query(
        'INSERT INTO users (nama, email, password_hash, profil_pantangan) VALUES (?, ?, ?, ?)',
        [cleanNama, cleanEmail, passwordHash, JSON.stringify([])]
      );
      return {
        id: result.insertId,
        nama: cleanNama,
        email: cleanEmail,
        profil_pantangan: []
      };
    }

    // In-memory fallback
    const newUser = {
      id: inMemoryDb.userIdSeq++,
      nama: cleanNama,
      email: cleanEmail,
      password_hash: passwordHash,
      profil_pantangan: [],
      created_at: new Date()
    };
    inMemoryDb.users.push(newUser);
    return {
      id: newUser.id,
      nama: newUser.nama,
      email: newUser.email,
      profil_pantangan: []
    };
  },

  /**
   * Gets dietary restriction profile (F-12, KF-22)
   * @param {number} userId
   * @returns {Promise<string[]>}
   */
  async getDietaryProfile(userId) {
    const user = await this.findById(userId);
    if (!user) return [];
    return Array.isArray(user.profil_pantangan) ? user.profil_pantangan : [];
  },

  /**
   * Updates dietary restriction profile (F-12, KF-22)
   * @param {number} userId
   * @param {string[]} pantanganList
   * @returns {Promise<boolean>}
   */
  async updateDietaryProfile(userId, pantanganList) {
    const numId = Number(userId);
    const cleanList = Array.isArray(pantanganList)
      ? pantanganList.map(p => String(p).trim()).filter(Boolean)
      : [];

    const pool = await getPool();
    if (pool) {
      const [result] = await pool.query(
        'UPDATE users SET profil_pantangan = ? WHERE id = ?',
        [JSON.stringify(cleanList), numId]
      );
      return result.affectedRows > 0;
    }

    // In-memory fallback
    const user = inMemoryDb.users.find(u => u.id === numId);
    if (!user) return false;
    user.profil_pantangan = cleanList;
    return true;
  }
};

module.exports = User;
