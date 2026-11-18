/**
 * Smart Recipe Generator - SpecValidator
 * Validation, Normalization & Conflict Detection logic shared between Client and Server
 * Implements BR-01, BR-02, BR-03, BR-04, TC-13..TC-21
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const rules = require('./spec-rules');
    module.exports = factory(rules);
  } else {
    const rules = (root && root.SpecRules) || {};
    root.SpecValidator = factory(rules);
  }
}(typeof self !== 'undefined' ? self : this, function (rules) {
  'use strict';

  const BAHAN_DASAR = (rules && rules.BAHAN_DASAR) || ['garam', 'gula', 'merica', 'minyak goreng', 'air'];
  const PETA_PANTANGAN = (rules && rules.PETA_PANTANGAN) || {
    'tanpa kacang': ['kacang', 'kacang tanah', 'selai kacang', 'mede', 'almon'],
    'tanpa susu': ['susu', 'keju', 'mentega', 'krim', 'yoghurt'],
    'tanpa telur': ['telur', 'mayones'],
    'tanpa seafood': ['udang', 'cumi', 'kerang', 'kepiting', 'ikan', 'teri'],
    'tanpa gluten': ['tepung terigu', 'roti', 'mi', 'pasta'],
    'rendah karbo': ['nasi', 'mi', 'roti', 'kentang', 'gula', 'tepung'],
    'vegetarian': ['ayam', 'daging', 'sapi', 'kambing', 'babi', 'ikan', 'udang', 'cumi', 'kerang']
  };
  const ATURAN_BATAS = (rules && rules.ATURAN_BATAS) || {
    MIN_BAHAN: 1,
    MAX_BAHAN: 15,
    MIN_PANJANG_BAHAN: 2,
    MAX_PANJANG_BAHAN: 40,
    MIN_WAKTU: 5,
    MAX_WAKTU: 180,
    DEFAULT_WAKTU: 30,
    MAX_PANTANGAN: 10,
    MAX_PANJANG_PANTANGAN: 30
  };

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function containsWordOrPhrase(text, keyword) {
    if (!text || !keyword) return false;
    const cleanText = text.toLowerCase().trim();
    const cleanKw = keyword.toLowerCase().trim();
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanKw)}([^a-z0-9]|$)`, 'i');
    return regex.test(cleanText);
  }

  const SpecValidator = {
    /**
     * Normalizes ingredients input (deduplicates, trims, lowercases).
     * @param {string|string[]} input
     * @returns {string[]}
     */
    normalizeBahan(input) {
      if (!input) return [];
      let list = [];
      if (typeof input === 'string') {
        list = input.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(input)) {
        list = input.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
      }
      const unique = [];
      for (const item of list) {
        const lower = item.toLowerCase();
        if (lower && !unique.includes(lower)) {
          unique.push(lower);
        }
      }
      return unique;
    },

    /**
     * Normalizes dietary restrictions.
     * @param {string|string[]} input
     * @returns {string[]}
     */
    normalizePantangan(input) {
      if (!input) return [];
      let list = [];
      if (typeof input === 'string') {
        list = input.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(input)) {
        list = input.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
      }
      const unique = [];
      for (const item of list) {
        const lower = item.toLowerCase();
        if (lower && !unique.includes(lower)) {
          unique.push(lower);
        }
      }
      return unique;
    },

    /**
     * Validates RecipeSpec input before submitting or processing.
     * @param {object} spec
     * @returns {string[]} List of error messages (empty if valid)
     */
    validate(spec) {
      const galat = [];

      if (!spec || typeof spec !== 'object') {
        galat.push('Isi minimal 1 bahan');
        return galat;
      }

      // Validasi Bahan Utama (BR-01)
      const bahanUtama = spec.bahanUtama;
      if (!Array.isArray(bahanUtama) || bahanUtama.length === 0) {
        galat.push('Isi minimal 1 bahan');
      } else {
        if (bahanUtama.length > ATURAN_BATAS.MAX_BAHAN) {
          galat.push(`Maksimal ${ATURAN_BATAS.MAX_BAHAN} bahan`);
        }
        const regexKarakter = /^[a-zA-Z0-9\s\-]+$/;
        for (const item of bahanUtama) {
          if (typeof item !== 'string' || item.trim().length === 0) {
            galat.push('Nama bahan tidak boleh kosong.');
          } else {
            const trimmed = item.trim();
            if (trimmed.length < ATURAN_BATAS.MIN_PANJANG_BAHAN || trimmed.length > ATURAN_BATAS.MAX_PANJANG_BAHAN) {
              galat.push(`Nama bahan "${trimmed}" harus antara ${ATURAN_BATAS.MIN_PANJANG_BAHAN}–${ATURAN_BATAS.MAX_PANJANG_BAHAN} karakter.`);
            }
            if (!regexKarakter.test(trimmed)) {
              galat.push(`Nama bahan "${trimmed}" hanya boleh memuat huruf, angka, spasi, dan tanda hubung.`);
            }
          }
        }
      }

      // Validasi Waktu Maksimal (BR-02)
      const waktu = spec.waktuMaksimal;
      if (waktu === undefined || waktu === null || waktu === '') {
        galat.push(`Waktu maksimal harus berupa bilangan bulat antara ${ATURAN_BATAS.MIN_WAKTU}–${ATURAN_BATAS.MAX_WAKTU} menit`);
      } else {
        const numWaktu = Number(waktu);
        if (isNaN(numWaktu) || !Number.isInteger(numWaktu) || numWaktu < ATURAN_BATAS.MIN_WAKTU || numWaktu > ATURAN_BATAS.MAX_WAKTU) {
          galat.push(`Waktu maksimal harus berupa bilangan bulat antara ${ATURAN_BATAS.MIN_WAKTU}–${ATURAN_BATAS.MAX_WAKTU} menit`);
        }
      }

      // Validasi Pantangan (BR-03)
      const pantangan = spec.pantangan;
      if (pantangan !== undefined && pantangan !== null) {
        if (!Array.isArray(pantangan)) {
          galat.push('Pantangan harus berupa daftar pilihan.');
        } else {
          if (pantangan.length > ATURAN_BATAS.MAX_PANTANGAN) {
            galat.push(`Maksimal ${ATURAN_BATAS.MAX_PANTANGAN} pantangan`);
          }
          for (const item of pantangan) {
            if (typeof item !== 'string' || item.trim().length === 0) {
              galat.push('Pilihan pantangan tidak valid.');
            } else if (item.trim().length > ATURAN_BATAS.MAX_PANJANG_PANTANGAN) {
              galat.push(`Pantangan "${item.trim()}" melebihi batas ${ATURAN_BATAS.MAX_PANJANG_PANTANGAN} karakter`);
            }
          }
        }
      }

      return galat;
    },

    /**
     * Detects conflicts between ingredients and dietary restrictions.
     * Implements BR-04: Deteksi Konflik Bahan vs Pantangan
     * @param {object} spec
     * @returns {string[]} List of conflict warnings
     */
    detectConflict(spec) {
      const konflik = [];
      if (!spec || !Array.isArray(spec.bahanUtama) || !Array.isArray(spec.pantangan)) {
        return konflik;
      }

      const bahanUtama = spec.bahanUtama.map(b => (typeof b === 'string' ? b.trim().toLowerCase() : ''));
      const daftarPantangan = spec.pantangan.map(p => (typeof p === 'string' ? p.trim().toLowerCase() : ''));

      for (const pantangan of daftarPantangan) {
        let keywords = [];

        if (PETA_PANTANGAN[pantangan]) {
          keywords = PETA_PANTANGAN[pantangan];
        } else if (pantangan.startsWith('tanpa ')) {
          const rawKeyword = pantangan.replace('tanpa ', '').trim();
          keywords = [rawKeyword];
          for (const [key, list] of Object.entries(PETA_PANTANGAN)) {
            if (key.includes(rawKeyword) || rawKeyword.includes(key.replace('tanpa ', ''))) {
              keywords = [...new Set([...keywords, ...list])];
            }
          }
        } else {
          keywords.push(pantangan);
        }

        // Check each ingredient against forbidden keywords using word boundaries
        for (const bahan of bahanUtama) {
          for (const kw of keywords) {
            if (containsWordOrPhrase(bahan, kw) || containsWordOrPhrase(kw, bahan)) {
              konflik.push(`${bahan} bertentangan dengan pantangan ${pantangan}`);
              break;
            }
          }
        }
      }

      return konflik;
    },

    /**
     * Helper to perform both validation and conflict check.
     * @param {object} spec
     * @returns {{ valid: boolean, galat: string[], formatGalat: string[], konflik: string[] }}
     */
    validateAll(spec) {
      const galat = this.validate(spec);
      const konflik = this.detectConflict(spec);
      const allErrors = [...galat, ...konflik];
      return {
        valid: allErrors.length === 0,
        galat: allErrors,
        formatGalat: galat,
        konflik
      };
    }
  };

  return SpecValidator;
}));
