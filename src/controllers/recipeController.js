/**
 * Smart Recipe Generator - RecipeController
 * Orchestrates recipe generation with Spec-Driven Execution, validation, and retry mechanism
 * Implements UC-05, UC-07, BR-05, BR-06, BR-07, BR-08, BR-09, BR-10, V-01..V-06, F-04..F-07
 */

const SpecValidator = require('../../shared/specValidator');
const PromptBuilder = require('../services/promptBuilder');
const OutputValidator = require('../services/outputValidator');
const defaultGeminiService = require('../services/gemini');

let geminiService = defaultGeminiService;

const RecipeController = {
  /**
   * Allows injecting a custom Gemini service for testing
   * @param {object} mockService
   */
  setGeminiService(mockService) {
    geminiService = mockService;
  },

  /**
   * Resets to default Gemini service
   */
  resetGeminiService() {
    geminiService = defaultGeminiService;
  },

  /**
   * POST /api/recipes/generate
   * Generates or regenerates a recipe according to user specification
   */
  async generate(req, res) {
    const rawSpec = req.body || {};

    // 1. Validasi spesifikasi & deteksi konflik (BR-01..BR-04, KF-01..KF-04)
    const { valid, galat } = SpecValidator.validateAll(rawSpec);
    if (!valid) {
      return res.status(422).json({
        galat,
        pesan: galat[0]
      });
    }

    // Normalisasi spesifikasi
    const spec = {
      bahanUtama: SpecValidator.normalizeBahan(rawSpec.bahanUtama),
      waktuMaksimal: Number(rawSpec.waktuMaksimal) || 30,
      pantangan: SpecValidator.normalizePantangan(rawSpec.pantangan),
      hindari: Array.isArray(rawSpec.hindari) ? rawSpec.hindari : []
    };

    let catatan = [];

    // 2. Loop eksekusi AI dan kepatuhan (Maksimal 3 percobaan, BR-10, KF-11)
    for (let percobaan = 1; percobaan <= 3; percobaan++) {
      const prompt = PromptBuilder.build(spec, catatan);
      let json;

      try {
        json = await geminiService.callGemini(prompt);
      } catch (err) {
        console.error(`[RecipeController] Error saat memanggil Gemini (Percobaan ${percobaan}):`, err.message);
        return res.status(503).json({
          pesan: 'Layanan AI sedang sibuk, coba lagi.'
        });
      }

      // V-01: Validasi Skema JSON (KF-09)
      if (!OutputValidator.validateSchema(json)) {
        catatan = ['Format JSON tidak sesuai skema'];
        continue;
      }

      // V-02..V-05: Validasi Kepatuhan terhadap spesifikasi (KF-10)
      const pelanggaran = OutputValidator.checkCompliance(json, spec);

      if (pelanggaran.length === 0) {
        // Resep lolos semua validasi kepatuhan!
        const tokenUsage = json._tokenUsage || (geminiService.getLastUsage ? geminiService.getLastUsage() : null);
        if (tokenUsage) {
          console.log(`[RecipeController] Sukses pada percobaan ke-${percobaan}. Token: prompt=${tokenUsage.promptTokenCount}, candidates=${tokenUsage.candidatesTokenCount}, total=${tokenUsage.totalTokenCount}`);
        }

        // F-10, KF-20: Riwayat Resep Otomatis bagi Pengguna Login (maks 20 resep)
        let savedRecipeId = null;
        if (req.session && req.session.user && req.session.user.id) {
          try {
            const SavedRecipe = require('../models/savedRecipe');
            savedRecipeId = await SavedRecipe.create(req.session.user.id, {
              judul: json.judul,
              estimasi_waktu: json.estimasi_waktu,
              spesifikasi: spec,
              daftar_bahan: json.daftar_bahan,
              langkah_memasak: json.langkah_memasak
            });
          } catch (saveErr) {
            console.error('[RecipeController] Gagal menyimpan riwayat otomatis:', saveErr.message);
          }
        }

        return res.status(200).json({
          resep: json,
          savedRecipeId,
          kepatuhan: {
            waktu: true,
            bahan: true,
            pantangan: true,
            percobaan
          }
        });
      }

      // Catat pelanggaran untuk perbaikan di prompt berikutnya (Lapis 5)
      catatan = pelanggaran;
    }

    // V-06: Gagal setelah 3 percobaan berturut-turut (HTTP 502, KF-12)
    return res.status(502).json({
      pesan: 'Resep tidak dapat dibuat sesuai spesifikasi. Coba tambah bahan atau longgarkan waktu.'
    });
  }
};

module.exports = RecipeController;
