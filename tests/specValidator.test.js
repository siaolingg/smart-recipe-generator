/**
 * Unit Tests for SpecValidator
 * Implements Tabel 30 (Rencana unit test), BR-01..BR-04, TC-13..TC-21
 */

const SpecValidator = require('../shared/specValidator');

describe('SpecValidator Unit Tests', () => {
  describe('normalizeBahan()', () => {
    test('TC-13: Normalizes uppercase and trims duplicates ("Telur, telur , AYAM" -> ["telur", "ayam"])', () => {
      const result = SpecValidator.normalizeBahan('Telur, telur , AYAM');
      expect(result).toEqual(['telur', 'ayam']);
    });

    test('Handles array of ingredients with mixed casing and spaces', () => {
      const result = SpecValidator.normalizeBahan([' AYAM ', 'ayam', 'Wortel ']);
      expect(result).toEqual(['ayam', 'wortel']);
    });

    test('Returns empty array for empty string, null, or undefined', () => {
      expect(SpecValidator.normalizeBahan('')).toEqual([]);
      expect(SpecValidator.normalizeBahan(null)).toEqual([]);
      expect(SpecValidator.normalizeBahan(undefined)).toEqual([]);
    });
  });

  describe('normalizePantangan()', () => {
    test('Normalizes and deduplicates restriction strings and arrays', () => {
      const result = SpecValidator.normalizePantangan(['Tanpa Kacang', 'tanpa kacang', 'Vegetarian']);
      expect(result).toEqual(['tanpa kacang', 'vegetarian']);
    });
  });

  describe('validate() - BR-01, BR-02, BR-03', () => {
    test('TC-14: Rejects 0 ingredients with "Isi minimal 1 bahan"', () => {
      const galat = SpecValidator.validate({
        bahanUtama: [],
        waktuMaksimal: 30,
        pantangan: []
      });
      expect(galat).toContain('Isi minimal 1 bahan');
    });

    test('TC-15: Accepts exactly 15 distinct ingredients (Boundary Value)', () => {
      const bahan15 = Array.from({ length: 15 }, (_, i) => `bahan-${i + 1}`);
      const galat = SpecValidator.validate({
        bahanUtama: bahan15,
        waktuMaksimal: 30,
        pantangan: []
      });
      expect(galat).toHaveLength(0);
    });

    test('TC-16: Rejects 16 distinct ingredients with "Maksimal 15 bahan"', () => {
      const bahan16 = Array.from({ length: 16 }, (_, i) => `bahan-${i + 1}`);
      const galat = SpecValidator.validate({
        bahanUtama: bahan16,
        waktuMaksimal: 30,
        pantangan: []
      });
      expect(galat).toContain('Maksimal 15 bahan');
    });

    test('Rejects ingredient with length < 2 or > 40 characters', () => {
      const galatShort = SpecValidator.validate({
        bahanUtama: ['a'],
        waktuMaksimal: 30
      });
      expect(galatShort.some(g => g.includes('2–40 karakter'))).toBe(true);

      const galatLong = SpecValidator.validate({
        bahanUtama: ['a'.repeat(41)],
        waktuMaksimal: 30
      });
      expect(galatLong.some(g => g.includes('2–40 karakter'))).toBe(true);
    });

    test('Rejects ingredient containing disallowed characters', () => {
      const galat = SpecValidator.validate({
        bahanUtama: ['ayam<script>'],
        waktuMaksimal: 30
      });
      expect(galat.some(g => g.includes('hanya boleh memuat huruf, angka, spasi'))).toBe(true);
    });

    test('TC-17: Rejects cooking time 4 minutes (BVA: batas - 1)', () => {
      const galat = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 4
      });
      expect(galat).toContain('Waktu maksimal harus berupa bilangan bulat antara 5–180 menit');
    });

    test('TC-18: Accepts cooking times 5 and 180 minutes (BVA: batas)', () => {
      const galat5 = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 5
      });
      expect(galat5).toHaveLength(0);

      const galat180 = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 180
      });
      expect(galat180).toHaveLength(0);
    });

    test('TC-19: Rejects cooking time 181 minutes and non-numeric value', () => {
      const galat181 = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 181
      });
      expect(galat181).toContain('Waktu maksimal harus berupa bilangan bulat antara 5–180 menit');

      const galatAbc = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 'abc'
      });
      expect(galatAbc).toContain('Waktu maksimal harus berupa bilangan bulat antara 5–180 menit');
    });

    test('TC-21: Rejects 11 dietary restrictions (BVA: batas + 1)', () => {
      const pantangan11 = Array.from({ length: 11 }, (_, i) => `pantangan-${i + 1}`);
      const galat = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 30,
        pantangan: pantangan11
      });
      expect(galat).toContain('Maksimal 10 pantangan');
    });

    test('Rejects restriction exceeding 30 characters', () => {
      const galat = SpecValidator.validate({
        bahanUtama: ['ayam'],
        waktuMaksimal: 30,
        pantangan: ['p'.repeat(31)]
      });
      expect(galat.some(g => g.includes('melebihi batas 30 karakter'))).toBe(true);
    });
  });

  describe('detectConflict() - BR-04, TC-20', () => {
    test('TC-20: Detects conflict between "telur" and "tanpa telur"', () => {
      const konflik = SpecValidator.detectConflict({
        bahanUtama: ['telur', 'nasi'],
        pantangan: ['tanpa telur']
      });
      expect(konflik).toContain('telur bertentangan dengan pantangan tanpa telur');
    });

    test('Detects conflict between "udang" and "tanpa seafood"', () => {
      const konflik = SpecValidator.detectConflict({
        bahanUtama: ['udang', 'bawang'],
        pantangan: ['tanpa seafood']
      });
      expect(konflik).toContain('udang bertentangan dengan pantangan tanpa seafood');
    });

    test('Detects conflict between "kentang" and "rendah karbo"', () => {
      const konflik = SpecValidator.detectConflict({
        bahanUtama: ['daging sapi', 'kentang', 'wortel'],
        pantangan: ['rendah karbo']
      });
      expect(konflik).toContain('kentang bertentangan dengan pantangan rendah karbo');
    });

    test('Detects conflict with custom restriction (e.g. "tanpa tempe" vs "tempe")', () => {
      const konflik = SpecValidator.detectConflict({
        bahanUtama: ['tempe', 'tahu'],
        pantangan: ['tanpa tempe']
      });
      expect(konflik).toContain('tempe bertentangan dengan pantangan tanpa tempe');
    });

    test('Returns empty array when there are no conflicts', () => {
      const konflik = SpecValidator.detectConflict({
        bahanUtama: ['ayam', 'wortel', 'bawang'],
        pantangan: ['tanpa kacang']
      });
      expect(konflik).toHaveLength(0);
    });
  });

  describe('validateAll()', () => {
    test('Returns valid: true when spec is completely compliant', () => {
      const res = SpecValidator.validateAll({
        bahanUtama: ['ayam', 'telur', 'bawang merah'],
        waktuMaksimal: 30,
        pantangan: ['tanpa kacang']
      });
      expect(res.valid).toBe(true);
      expect(res.galat).toHaveLength(0);
    });

    test('Returns valid: false with collected errors on invalid input and conflict', () => {
      const res = SpecValidator.validateAll({
        bahanUtama: ['udang'],
        waktuMaksimal: 3, // invalid waktu
        pantangan: ['tanpa seafood'] // conflict
      });
      expect(res.valid).toBe(false);
      expect(res.galat.length).toBeGreaterThanOrEqual(2);
    });
  });
});
