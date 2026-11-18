/**
 * Smart Recipe Generator - OutputValidator
 * Validates AI output schema & compliance against user specifications
 * Implements V-01 through V-05, BR-05, BR-06, BR-07, BR-09
 */

const Ajv = require('ajv');
const schema = require('../schemas/recipeResult.schema.json');
const { BAHAN_DASAR, PETA_PANTANGAN } = require('../../shared/spec-rules');

const ajv = new Ajv({ allErrors: true });
const validateSchemaFn = ajv.compile(schema);

function norm(str) {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWordOrPhrase(text, keyword) {
  const cleanText = norm(text);
  const cleanKw = norm(keyword);
  if (!cleanText || !cleanKw) return false;

  // Use word boundaries so that short keywords like "mi" do not falsely match "minyak" or "tumis"
  const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanKw)}([^a-z0-9]|$)`, 'i');
  return regex.test(cleanText);
}

function getKataKunciPantangan(pantanganList) {
  if (!Array.isArray(pantanganList)) return [];
  const keywords = [];

  for (const p of pantanganList) {
    const cleanP = norm(p);
    if (PETA_PANTANGAN[cleanP]) {
      keywords.push(...PETA_PANTANGAN[cleanP]);
    } else if (cleanP.startsWith('tanpa ')) {
      const kw = cleanP.slice(6).trim();
      if (kw) keywords.push(kw);
    } else {
      keywords.push(cleanP);
    }
  }

  return [...new Set(keywords.map(k => norm(k)))];
}

const OutputValidator = {
  RESEP_SCHEMA: schema,

  /**
   * V-01 / BR-09: Validates that the input matches RecipeResult schema.
   * @param {any} json
   * @returns {boolean}
   */
  validateSchema(json) {
    if (!json || typeof json !== 'object') return false;
    return Boolean(validateSchemaFn(json));
  },

  /**
   * Gets schema validation errors.
   * @param {any} json
   * @returns {string[]}
   */
  getSchemaErrors(json) {
    if (!json || typeof json !== 'object') return ['Keluaran bukan objek JSON yang valid'];
    const valid = validateSchemaFn(json);
    if (valid) return [];
    return (validateSchemaFn.errors || []).map(err => `${err.instancePath || 'root'} ${err.message}`);
  },

  /**
   * Checks full compliance against specifications:
   * V-02 (BR-05): Every ingredient is in user ingredients or basic pantry
   * V-03 (BR-06): estimasi_waktu <= waktuMaksimal
   * V-04 (BR-07): No forbidden keywords in ingredients or steps
   * V-05 (US-15): Different title from avoid list on regenerate
   * @param {object} resep - Parsed JSON recipe object
   * @param {object} spec - Validated RecipeSpec object
   * @returns {string[]} List of violation messages
   */
  checkCompliance(resep, spec) {
    const pelanggaran = [];
    if (!resep || !spec) {
      pelanggaran.push('Resep atau spesifikasi tidak boleh kosong');
      return pelanggaran;
    }

    const bahanUtamaNorm = (spec.bahanUtama || []).map(norm);
    const bahanDasarNorm = BAHAN_DASAR.map(norm);
    const izin = [...bahanUtamaNorm, ...bahanDasarNorm];

    // V-02 / BR-05: Pemeriksaan bahan diizinkan
    if (Array.isArray(resep.daftar_bahan)) {
      for (const b of resep.daftar_bahan) {
        const namaBahan = norm(b.nama);
        const match = izin.some(iz => containsWordOrPhrase(namaBahan, iz) || containsWordOrPhrase(iz, namaBahan));
        if (!match) {
          pelanggaran.push(`Bahan "${b.nama}" tidak diizinkan`);
        }
      }
    } else {
      pelanggaran.push('Daftar bahan tidak valid');
    }

    // V-03 / BR-06: Estimasi waktu <= waktuMaksimal
    const waktuMaksimal = Number(spec.waktuMaksimal);
    if (resep.estimasi_waktu > waktuMaksimal) {
      pelanggaran.push(`Estimasi ${resep.estimasi_waktu} menit melebihi ${waktuMaksimal} menit`);
    }

    // V-04 / BR-07: Tidak ada kata kunci pantangan di bahan maupun langkah
    const kataKunci = getKataKunciPantangan(spec.pantangan);
    const teksResep = norm(JSON.stringify(resep));

    for (const kw of kataKunci) {
      if (containsWordOrPhrase(teksResep, kw)) {
        pelanggaran.push(`Mengandung "${kw}" yang dilarang pantangan`);
      }
    }

    // V-05: Buat Ulang - judul harus berbeda dari daftar hindari
    if (Array.isArray(spec.hindari) && spec.hindari.length > 0) {
      const judulResepNorm = norm(resep.judul);
      const isDuplicate = spec.hindari.some(h => norm(h) === judulResepNorm);
      if (isDuplicate) {
        pelanggaran.push('Judul sama dengan resep sebelumnya');
      }
    }

    return pelanggaran;
  },

  /**
   * Helper to identify if a recipe ingredient is basic pantry
   * @param {string} ingredientName
   * @returns {boolean}
   */
  isBahanDasar(ingredientName) {
    const nameNorm = norm(ingredientName);
    return BAHAN_DASAR.some(bd => containsWordOrPhrase(nameNorm, bd));
  }
};

module.exports = OutputValidator;
