/**
 * Smart Recipe Generator - SavedRecipe Model
 * Implements entity SavedRecipe, Automatic History (F-10, KF-20), and Personal Notes (F-11, KF-21)
 * Implements BR-14, BR-15 with parameterized queries (? placeholders)
 */

const { getPool, inMemoryDb } = require('../db/db');

function normalizeSpecForComparison(spec) {
  if (!spec) return '';
  const bahan = Array.isArray(spec.bahanUtama)
    ? [...spec.bahanUtama].map(b => String(b).trim().toLowerCase()).sort().join(',')
    : '';
  const waktu = Number(spec.waktuMaksimal) || 0;
  const pantangan = Array.isArray(spec.pantangan)
    ? [...spec.pantangan].map(p => String(p).trim().toLowerCase()).sort().join(',')
    : '';
  return `${bahan}|${waktu}|${pantangan}`;
}

const SavedRecipe = {
  /**
   * Checks if duplicate recipe already exists for this user (BR-15).
   * @param {number} userId
   * @param {string} judul
   * @param {object} spec
   * @returns {Promise<boolean>}
   */
  async existsForUser(userId, judul, spec) {
    const numUserId = Number(userId);
    const cleanJudul = (judul || '').trim().toLowerCase();
    const specHash = normalizeSpecForComparison(spec);

    const recipes = await this.findByUser(numUserId);
    for (const r of recipes) {
      if ((r.judul || '').trim().toLowerCase() === cleanJudul) {
        const existingSpecHash = normalizeSpecForComparison(r.spesifikasi);
        if (existingSpecHash === specHash) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Creates a saved recipe.
   * @param {number} userId
   * @param {object} data - { judul, estimasi_waktu, spesifikasi, daftar_bahan, langkah_memasak, catatan }
   * @returns {Promise<number>} Inserted recipe ID
   */
  async create(userId, data) {
    const numUserId = Number(userId);
    const pool = await getPool();

    const spesifikasiJson = typeof data.spesifikasi === 'string'
      ? data.spesifikasi
      : JSON.stringify(data.spesifikasi || {});

    const daftarBahanJson = typeof data.daftar_bahan === 'string'
      ? data.daftar_bahan
      : JSON.stringify(data.daftar_bahan || []);

    const langkahMemasakJson = typeof data.langkah_memasak === 'string'
      ? data.langkah_memasak
      : JSON.stringify(data.langkah_memasak || []);

    const catatanVal = data.catatan ? String(data.catatan).slice(0, 1000) : null;

    if (pool) {
      const [result] = await pool.query(
        `INSERT INTO saved_recipes 
         (user_id, judul, estimasi_waktu, spesifikasi, daftar_bahan, langkah_memasak, catatan) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          numUserId,
          data.judul,
          Number(data.estimasi_waktu) || 0,
          spesifikasiJson,
          daftarBahanJson,
          langkahMemasakJson,
          catatanVal
        ]
      );
      const insertedId = result.insertId;
      await this.trimToMax(numUserId, 20);
      return insertedId;
    }

    // In-memory fallback
    const id = inMemoryDb.recipeIdSeq++;
    const newRecipe = {
      id,
      user_id: numUserId,
      judul: data.judul,
      estimasi_waktu: Number(data.estimasi_waktu) || 0,
      spesifikasi: typeof data.spesifikasi === 'string' ? JSON.parse(data.spesifikasi) : data.spesifikasi,
      daftar_bahan: typeof data.daftar_bahan === 'string' ? JSON.parse(data.daftar_bahan) : data.daftar_bahan,
      langkah_memasak: typeof data.langkah_memasak === 'string' ? JSON.parse(data.langkah_memasak) : data.langkah_memasak,
      catatan: catatanVal,
      created_at: new Date()
    };
    inMemoryDb.saved_recipes.push(newRecipe);
    await this.trimToMax(numUserId, 20);
    return id;
  },

  /**
   * Enforces maximum recipe history limit (F-10, KF-20, HA-05).
   * Keeps at most `max` newest recipes, removes oldest.
   * @param {number} userId
   * @param {number} max
   */
  async trimToMax(userId, max = 20) {
    const numUserId = Number(userId);
    const pool = await getPool();

    if (pool) {
      const [rows] = await pool.query(
        'SELECT id FROM saved_recipes WHERE user_id = ? ORDER BY created_at DESC, id DESC',
        [numUserId]
      );
      if (rows.length > max) {
        const idsToDelete = rows.slice(max).map(r => r.id);
        if (idsToDelete.length > 0) {
          await pool.query('DELETE FROM saved_recipes WHERE id IN (?)', [idsToDelete]);
        }
      }
      return;
    }

    // In-memory fallback
    const userRecipes = inMemoryDb.saved_recipes
      .filter(r => r.user_id === numUserId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (userRecipes.length > max) {
      const toRemove = userRecipes.slice(max);
      const removeIds = new Set(toRemove.map(r => r.id));
      inMemoryDb.saved_recipes = inMemoryDb.saved_recipes.filter(r => !removeIds.has(r.id));
    }
  },

  /**
   * Finds saved recipes belonging to user, optionally filtered by keyword q (US-18, US-21).
   * Sorted newest to oldest, max 20 recipes.
   * @param {number} userId
   * @param {string} [q]
   * @returns {Promise<object[]>}
   */
  async findByUser(userId, q = '') {
    const numUserId = Number(userId);
    const pool = await getPool();
    let recipes = [];

    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, user_id, judul, estimasi_waktu, spesifikasi, daftar_bahan, langkah_memasak, catatan, created_at FROM saved_recipes WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20',
        [numUserId]
      );

      recipes = rows.map(r => ({
        ...r,
        spesifikasi: typeof r.spesifikasi === 'string' ? JSON.parse(r.spesifikasi) : r.spesifikasi,
        daftar_bahan: typeof r.daftar_bahan === 'string' ? JSON.parse(r.daftar_bahan) : r.daftar_bahan,
        langkah_memasak: typeof r.langkah_memasak === 'string' ? JSON.parse(r.langkah_memasak) : r.langkah_memasak,
        catatan: r.catatan || null
      }));
    } else {
      // In-memory fallback
      recipes = inMemoryDb.saved_recipes
        .filter(r => r.user_id === numUserId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20)
        .map(r => ({ ...r }));
    }

    // Filter by query (case-insensitive: matches title or ingredients, US-21, TC-42)
    if (q && q.trim()) {
      const search = q.trim().toLowerCase();
      recipes = recipes.filter(r => {
        // match title
        if ((r.judul || '').toLowerCase().includes(search)) return true;

        // match ingredients in daftar_bahan
        if (Array.isArray(r.daftar_bahan)) {
          const matchBahan = r.daftar_bahan.some(b => (b.nama || '').toLowerCase().includes(search));
          if (matchBahan) return true;
        }

        // match ingredients in original spec
        if (r.spesifikasi && Array.isArray(r.spesifikasi.bahanUtama)) {
          const matchSpecBahan = r.spesifikasi.bahanUtama.some(b => (b || '').toLowerCase().includes(search));
          if (matchSpecBahan) return true;
        }

        return false;
      });
    }

    return recipes;
  },

  /**
   * Finds a saved recipe by id for a specific user (BR-14, HA-06, HA-09).
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async findByIdForUser(id, userId) {
    const numId = Number(id);
    const numUserId = Number(userId);
    const pool = await getPool();

    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, user_id, judul, estimasi_waktu, spesifikasi, daftar_bahan, langkah_memasak, catatan, created_at FROM saved_recipes WHERE id = ? AND user_id = ? LIMIT 1',
        [numId, numUserId]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        ...r,
        spesifikasi: typeof r.spesifikasi === 'string' ? JSON.parse(r.spesifikasi) : r.spesifikasi,
        daftar_bahan: typeof r.daftar_bahan === 'string' ? JSON.parse(r.daftar_bahan) : r.daftar_bahan,
        langkah_memasak: typeof r.langkah_memasak === 'string' ? JSON.parse(r.langkah_memasak) : r.langkah_memasak,
        catatan: r.catatan || null
      };
    }

    // In-memory fallback
    const recipe = inMemoryDb.saved_recipes.find(r => r.id === numId && r.user_id === numUserId);
    if (!recipe) return null;
    return { ...recipe };
  },

  /**
   * Updates personal recipe note (F-11, KF-21, HA-07).
   * Max 1,000 characters.
   * @param {number} id
   * @param {number} userId
   * @param {string} catatan
   * @returns {Promise<boolean>}
   */
  async updateNote(id, userId, catatan) {
    const numId = Number(id);
    const numUserId = Number(userId);
    const pool = await getPool();
    const cleanNote = catatan ? String(catatan).trim() : '';

    if (cleanNote.length > 1000) {
      throw new Error('Catatan maksimal 1.000 karakter.');
    }

    if (pool) {
      const [result] = await pool.query(
        'UPDATE saved_recipes SET catatan = ? WHERE id = ? AND user_id = ?',
        [cleanNote, numId, numUserId]
      );
      return result.affectedRows > 0;
    }

    // In-memory fallback
    const recipe = inMemoryDb.saved_recipes.find(r => r.id === numId && r.user_id === numUserId);
    if (!recipe) return false;
    recipe.catatan = cleanNote;
    return true;
  },

  /**
   * Deletes a saved recipe by id for a specific user (BR-14).
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean>} True if deleted, false if not found or not owned
   */
  async deleteByIdForUser(id, userId) {
    const numId = Number(id);
    const numUserId = Number(userId);
    const pool = await getPool();

    if (pool) {
      const [result] = await pool.query(
        'DELETE FROM saved_recipes WHERE id = ? AND user_id = ?',
        [numId, numUserId]
      );
      return result.affectedRows > 0;
    }

    // In-memory fallback
    const idx = inMemoryDb.saved_recipes.findIndex(r => r.id === numId && r.user_id === numUserId);
    if (idx === -1) return false;
    inMemoryDb.saved_recipes.splice(idx, 1);
    return true;
  }
};

module.exports = SavedRecipe;
