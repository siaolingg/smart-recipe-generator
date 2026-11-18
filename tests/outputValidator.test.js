/**
 * Unit Tests for OutputValidator
 * Implements V-01..V-05, BR-05, BR-06, BR-07, BR-09, Tabel 30
 */

const OutputValidator = require('../src/services/outputValidator');

describe('OutputValidator Unit Tests', () => {
  const sampleValidRecipe = {
    judul: 'Ayam Goreng Bawang Simpel',
    estimasi_waktu: 25,
    daftar_bahan: [
      { nama: 'daging ayam', jumlah: '250 gram' },
      { nama: 'bawang merah', jumlah: '4 siung' },
      { nama: 'garam', jumlah: '1/2 sdt' },
      { nama: 'minyak goreng', jumlah: '2 sdm' }
    ],
    langkah_memasak: [
      'Potong ayam sesuai selera dan bumbui dengan garam.',
      'Iris bawang merah halus.',
      'Panaskan minyak goreng di wajan.',
      'Goreng ayam dan bawang merah sampai matang kecokelatan.'
    ]
  };

  const sampleSpec = {
    bahanUtama: ['ayam', 'bawang merah'],
    waktuMaksimal: 30,
    pantangan: ['tanpa kacang'],
    hindari: []
  };

  describe('validateSchema() - V-01, BR-09', () => {
    test('Validates a complete and compliant recipe JSON schema', () => {
      expect(OutputValidator.validateSchema(sampleValidRecipe)).toBe(true);
      expect(OutputValidator.getSchemaErrors(sampleValidRecipe)).toHaveLength(0);
    });

    test('Rejects when required property "judul" is missing', () => {
      const { judul, ...invalid } = sampleValidRecipe;
      expect(OutputValidator.validateSchema(invalid)).toBe(false);
    });

    test('Rejects when "estimasi_waktu" is string instead of integer', () => {
      const invalid = { ...sampleValidRecipe, estimasi_waktu: '25 menit' };
      expect(OutputValidator.validateSchema(invalid)).toBe(false);
    });

    test('Rejects when "daftar_bahan" is empty array', () => {
      const invalid = { ...sampleValidRecipe, daftar_bahan: [] };
      expect(OutputValidator.validateSchema(invalid)).toBe(false);
    });

    test('Rejects when ingredient object is missing "jumlah"', () => {
      const invalid = {
        ...sampleValidRecipe,
        daftar_bahan: [{ nama: 'ayam' }]
      };
      expect(OutputValidator.validateSchema(invalid)).toBe(false);
    });

    test('Rejects non-object input or null', () => {
      expect(OutputValidator.validateSchema(null)).toBe(false);
      expect(OutputValidator.validateSchema('bukan json')).toBe(false);
    });
  });

  describe('checkCompliance() - V-02, V-03, V-04, V-05', () => {
    test('Passes when recipe conforms to ingredients, time, and restrictions', () => {
      const violations = OutputValidator.checkCompliance(sampleValidRecipe, sampleSpec);
      expect(violations).toHaveLength(0);
    });

    test('TC-24 / V-02 (BR-05): Catches unauthorized ingredients not in spec or pantry', () => {
      const recipeWithCheese = {
        ...sampleValidRecipe,
        daftar_bahan: [
          ...sampleValidRecipe.daftar_bahan,
          { nama: 'keju cheddar parut', jumlah: '50 gram' }
        ]
      };
      const violations = OutputValidator.checkCompliance(recipeWithCheese, sampleSpec);
      expect(violations.some(v => v.includes('Bahan "keju cheddar parut" tidak diizinkan'))).toBe(true);
    });

    test('TC-23 / V-03 (BR-06): Catches when estimasi_waktu exceeds waktuMaksimal', () => {
      const recipeTooLong = {
        ...sampleValidRecipe,
        estimasi_waktu: 45 // spec is 30
      };
      const violations = OutputValidator.checkCompliance(recipeTooLong, sampleSpec);
      expect(violations).toContain('Estimasi 45 menit melebihi 30 menit');
    });

    test('V-04 (BR-07): Catches allergen/restriction keywords in ingredients list', () => {
      const recipeWithPeanut = {
        ...sampleValidRecipe,
        daftar_bahan: [
          ...sampleValidRecipe.daftar_bahan,
          { nama: 'saus kacang', jumlah: '2 sdm' }
        ]
      };
      const violations = OutputValidator.checkCompliance(recipeWithPeanut, sampleSpec);
      expect(violations.some(v => v.includes('dilarang pantangan'))).toBe(true);
    });

    test('V-04 (BR-07): Catches allergen/restriction keywords inside cooking steps', () => {
      const recipeWithPeanutInStep = {
        ...sampleValidRecipe,
        langkah_memasak: [
          ...sampleValidRecipe.langkah_memasak,
          'Taburkan selai kacang di atas ayam sebelum disajikan.'
        ]
      };
      const violations = OutputValidator.checkCompliance(recipeWithPeanutInStep, sampleSpec);
      expect(violations.some(v => v.includes('dilarang pantangan'))).toBe(true);
    });

    test('V-05 (US-15): Catches duplicate recipe title when regenerated', () => {
      const regenerateSpec = {
        ...sampleSpec,
        hindari: ['Ayam Goreng Bawang Simpel']
      };
      const violations = OutputValidator.checkCompliance(sampleValidRecipe, regenerateSpec);
      expect(violations).toContain('Judul sama dengan resep sebelumnya');
    });

    test('Returns violation if recipe or spec is null', () => {
      expect(OutputValidator.checkCompliance(null, sampleSpec)).toContain('Resep atau spesifikasi tidak boleh kosong');
    });
  });

  describe('isBahanDasar()', () => {
    test('Recognizes pantry ingredients', () => {
      expect(OutputValidator.isBahanDasar('garam')).toBe(true);
      expect(OutputValidator.isBahanDasar('minyak goreng kelapa')).toBe(true);
      expect(OutputValidator.isBahanDasar('gula pasir')).toBe(true);
      expect(OutputValidator.isBahanDasar('air matang')).toBe(true);
      expect(OutputValidator.isBahanDasar('merica bubuk')).toBe(true);
    });

    test('Returns false for main ingredients', () => {
      expect(OutputValidator.isBahanDasar('daging ayam')).toBe(false);
      expect(OutputValidator.isBahanDasar('udang')).toBe(false);
    });
  });
});
