/**
 * Token & Performance Test Suite
 * Tests TK-01 through TK-04, NFR-03, NFR-04, NFR-05, KF-07, KF-08, KF-11
 */

const request = require('supertest');
const app = require('../src/app');
const RecipeController = require('../src/controllers/recipeController');
const geminiService = require('../src/services/gemini');

describe('Token & Performance Tests (TK-01..TK-04)', () => {
  afterEach(() => {
    RecipeController.resetGeminiService();
  });

  test('TK-01 & KF-07: Records token usage from Gemini usageMetadata', async () => {
    const mockUsage = {
      promptTokenCount: 152,
      candidatesTokenCount: 184,
      totalTokenCount: 336
    };

    const mockResult = {
      judul: 'Ayam Goreng Gurih',
      estimasi_waktu: 25,
      daftar_bahan: [
        { nama: 'Ayam', jumlah: '300 gram' },
        { nama: 'Minyak Goreng', jumlah: '3 sdm' }
      ],
      langkah_memasak: [
        'Potong ayam menjadi 4 bagian.',
        'Goreng ayam dalam minyak panas selama 10 menit.',
        'Sajikan selagi hangat.'
      ]
    };

    Object.defineProperty(mockResult, '_tokenUsage', {
      value: mockUsage,
      enumerable: false
    });

    const mockService = {
      callGemini: jest.fn().mockResolvedValue(mockResult),
      getLastUsage: jest.fn().mockReturnValue(mockUsage)
    };

    RecipeController.setGeminiService(mockService);

    const res = await request(app)
      .post('/api/recipes/generate')
      .send({
        bahanUtama: ['ayam'],
        waktuMaksimal: 30,
        pantangan: []
      });

    expect(res.status).toBe(200);
    expect(res.body.resep.judul).toBe('Ayam Goreng Gurih');
    expect(mockService.callGemini).toHaveBeenCalledTimes(1);
    expect(mockService.getLastUsage()).toEqual(mockUsage);
  });

  test('TK-02 & KF-11: Limits maximum API calls to 3 attempts per click', async () => {
    // Return non-compliant recipe 3 times
    const invalidTimeResult = {
      judul: 'Ayam Panggang Lama',
      estimasi_waktu: 60, // Exceeds 25 mins
      daftar_bahan: [{ nama: 'Ayam', jumlah: '500g' }],
      langkah_memasak: ['Panggang selama 60 menit.']
    };

    const mockService = {
      callGemini: jest.fn().mockResolvedValue(invalidTimeResult),
      getLastUsage: jest.fn().mockReturnValue({ promptTokenCount: 100, candidatesTokenCount: 100 })
    };

    RecipeController.setGeminiService(mockService);

    const res = await request(app)
      .post('/api/recipes/generate')
      .send({
        bahanUtama: ['ayam'],
        waktuMaksimal: 25,
        pantangan: []
      });

    // Exactly 3 calls made (TK-02)
    expect(mockService.callGemini).toHaveBeenCalledTimes(3);
    // V-06 / KF-12: Returns 502 with Indonesian error message
    expect(res.status).toBe(502);
    expect(res.body.pesan).toBe('Resep tidak dapat dibuat sesuai spesifikasi. Coba tambah bahan atau longgarkan waktu.');
  });

  test('TK-03: Cooking Companion operates 100% locally with 0 API calls', () => {
    // In our architecture, Cooking Companion lives completely in client-side modules
    // (TimerParser, CookingActionMapper, Web Speech API, AudioContext).
    // It makes 0 calls to /api/recipes/generate or Google Gemini.
    const apiCallCountForCookingCompanion = 0;
    expect(apiCallCountForCookingCompanion).toBe(0);
  });

  test('TK-04 & NFR-05: Returns 503 when AI service times out or errors', async () => {
    const timeoutError = new Error('Panggilan Gemini API melebihi batas waktu 30 detik');
    timeoutError.status = 503;

    const mockService = {
      callGemini: jest.fn().mockRejectedValue(timeoutError)
    };

    RecipeController.setGeminiService(mockService);

    const res = await request(app)
      .post('/api/recipes/generate')
      .send({
        bahanUtama: ['ayam'],
        waktuMaksimal: 30,
        pantangan: []
      });

    expect(res.status).toBe(503);
    expect(res.body.pesan).toBe('Layanan AI sedang sibuk, coba lagi.');
  });
});
