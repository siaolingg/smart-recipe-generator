/**
 * Smart Recipe Generator - SavedRecipeController
 * Handles saving, viewing, searching, and deleting recipes
 * Implements UC-08, UC-09, UC-10, BR-14, BR-15
 */

const SavedRecipe = require('../models/savedRecipe');

const SavedRecipeController = {
  /**
   * UC-08: Save Recipe
   * POST /api/saved-recipes
   */
  async create(req, res) {
    try {
      const userId = req.session.user.id;
      const { spesifikasi, resep } = req.body || {};

      if (!resep || !resep.judul || !resep.daftar_bahan || !resep.langkah_memasak) {
        return res.status(422).json({ pesan: 'Data resep tidak lengkap' });
      }

      // BR-15: Cegah resep duplikat untuk pengguna yang sama
      const alreadyExists = await SavedRecipe.existsForUser(userId, resep.judul, spesifikasi);
      if (alreadyExists) {
        return res.status(409).json({ pesan: 'Resep sudah ada di Resep Saya' });
      }

      const newId = await SavedRecipe.create(userId, {
        judul: resep.judul,
        estimasi_waktu: resep.estimasi_waktu,
        spesifikasi: spesifikasi || {},
        daftar_bahan: resep.daftar_bahan,
        langkah_memasak: resep.langkah_memasak
      });

      return res.status(201).json({
        pesan: 'Resep berhasil disimpan',
        id: newId
      });
    } catch (err) {
      console.error('[SavedRecipeController.create] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * UC-09: List Saved Recipes
   * GET /api/saved-recipes?q=
   */
  async list(req, res) {
    try {
      const userId = req.session.user.id;
      const q = req.query.q || '';

      const recipes = await SavedRecipe.findByUser(userId, q);
      return res.status(200).json(recipes);
    } catch (err) {
      console.error('[SavedRecipeController.list] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * UC-09: Recipe Detail
   * GET /api/saved-recipes/:id
   */
  async detail(req, res) {
    try {
      const userId = req.session.user.id;
      const recipeId = req.params.id;

      // BR-14: Pengguna hanya dapat membaca resep miliknya sendiri; jika bukan, kembalikan 404
      const recipe = await SavedRecipe.findByIdForUser(recipeId, userId);
      if (!recipe) {
        return res.status(404).json({ pesan: 'Resep tidak ditemukan' });
      }

      return res.status(200).json(recipe);
    } catch (err) {
      console.error('[SavedRecipeController.detail] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * UC-10: Delete Saved Recipe
   * DELETE /api/saved-recipes/:id
   */
  async remove(req, res) {
    try {
      const userId = req.session.user.id;
      const recipeId = req.params.id;

      // BR-14: Pengguna hanya dapat menghapus resep miliknya sendiri; jika bukan, kembalikan 404
      const deleted = await SavedRecipe.deleteByIdForUser(recipeId, userId);
      if (!deleted) {
        return res.status(404).json({ pesan: 'Resep tidak ditemukan' });
      }

      return res.status(204).send();
    } catch (err) {
      console.error('[SavedRecipeController.remove] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  },

  /**
   * F-11, KF-21: Update Personal Note for Recipe (max 1000 chars)
   * PUT /api/saved-recipes/:id/note
   */
  async updateNote(req, res) {
    try {
      const userId = req.session.user.id;
      const recipeId = req.params.id;
      const { catatan } = req.body || {};

      if (catatan !== undefined && catatan !== null && String(catatan).trim().length > 1000) {
        return res.status(422).json({ pesan: 'Catatan maksimal 1.000 karakter.' });
      }

      // BR-14, HA-09: Pengguna hanya dapat mengakses resep miliknya sendiri
      const existing = await SavedRecipe.findByIdForUser(recipeId, userId);
      if (!existing) {
        return res.status(404).json({ pesan: 'Resep tidak ditemukan' });
      }

      const noteToSave = catatan ? String(catatan).trim() : '';
      await SavedRecipe.updateNote(recipeId, userId, noteToSave);

      return res.status(200).json({
        pesan: 'Catatan berhasil disimpan',
        catatan: noteToSave
      });
    } catch (err) {
      console.error('[SavedRecipeController.updateNote] Error:', err);
      return res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
    }
  }
};

module.exports = SavedRecipeController;
