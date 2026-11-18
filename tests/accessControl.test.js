/**
 * Automated Tests for Hak Akses (HA-01 s.d. HA-09) - PRD Version 3.0
 * Implements Tabel 17 & Tabel 18 (Spesifikasi Eksekusi AI v3.0, NFR-08, NFR-12)
 */

const request = require('supertest');
const app = require('../src/app');
const RecipeController = require('../src/controllers/recipeController');
const { resetRateLimits } = require('../src/middleware/rateLimit');
const { inMemoryDb, resetInMemoryDb } = require('../src/db/db');

describe('Hak Akses & PRD Version 3.0 Tests (HA-01 s.d. HA-09)', () => {
  let userACookie = null;
  let userBCookie = null;
  let userARecipeId = null;
  let userBRecipeId = null;
  let geminiCallCount = 0;
  let lastPromptPassed = '';

  const createCompliantRecipeFromPrompt = (prompt, callIndex) => {
    let bahanList = ['ayam'];
    const matchBahan = prompt.match(/1\. Bahan yang boleh dipakai HANYA: <<<([\s\S]*?)>>>/);
    if (matchBahan && matchBahan[1]) {
      bahanList = matchBahan[1].split(',').map(s => s.trim()).filter(Boolean);
      if (bahanList.length === 0) bahanList = ['ayam'];
    }

    let waktu = 20;
    const matchWaktu = prompt.match(/TIDAK BOLEH lebih dari (\d+) menit/);
    if (matchWaktu && matchWaktu[1]) {
      waktu = Math.min(25, parseInt(matchWaktu[1], 10));
    }

    return {
      judul: `Resep Spesial Lezat Ke-${callIndex}`,
      estimasi_waktu: waktu,
      daftar_bahan: [
        ...bahanList.map(b => ({ nama: b, jumlah: '150 gr' })),
        { nama: 'garam', jumlah: '1 sdt' },
        { nama: 'air', jumlah: '100 ml' }
      ],
      langkah_memasak: [
        `Siapkan bahan utama ${bahanList.join(', ')}.`,
        `Masak bersama garam dan air selama ${waktu} menit hingga matang sempurna.`
      ]
    };
  };

  beforeAll(async () => {
    resetInMemoryDb();
    resetRateLimits();

    // Register User A
    await request(app)
      .post('/api/auth/register')
      .send({
        nama: 'User A',
        email: 'usera@mail.com',
        kataSandi: 'rahasia123',
        konfirmasi: 'rahasia123'
      });

    const loginARes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usera@mail.com', kataSandi: 'rahasia123' });
    userACookie = loginARes.headers['set-cookie'];

    // Register User B
    await request(app)
      .post('/api/auth/register')
      .send({
        nama: 'User B',
        email: 'userb@mail.com',
        kataSandi: 'rahasia123',
        konfirmasi: 'rahasia123'
      });

    const loginBRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'userb@mail.com', kataSandi: 'rahasia123' });
    userBCookie = loginBRes.headers['set-cookie'];

    // Mock Gemini Service
    RecipeController.setGeminiService({
      callGemini: async (prompt) => {
        geminiCallCount++;
        lastPromptPassed = prompt;
        return createCompliantRecipeFromPrompt(prompt, geminiCallCount);
      },
      getLastUsage: () => ({
        promptTokenCount: 150,
        candidatesTokenCount: 200,
        totalTokenCount: 350
      })
    });
  });

  beforeEach(() => {
    resetRateLimits();
  });

  afterAll(() => {
    RecipeController.resetGeminiService();
  });

  // -------------------------------------------------------------
  // HA-01: Kuota tamu (Guest Quota)
  // -------------------------------------------------------------
  test('HA-01: Kuota tamu 5 permintaan per menit; permintaan ke-6 dijawab 429 dengan ajakan masuk', async () => {
    resetRateLimits();

    // 5 requests as guest
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/recipes/generate')
        .send({ bahanUtama: ['ayam'], waktuMaksimal: 30 });
      expect(res.status).toBe(200);
    }

    // 6th request as guest should be rate-limited (HTTP 429)
    const res6 = await request(app)
      .post('/api/recipes/generate')
      .send({ bahanUtama: ['ayam'], waktuMaksimal: 30 });

    expect(res6.status).toBe(429);
    expect(res6.body.pesan).toBe('Batas permintaan tamu tercapai. Coba lagi dalam 1 menit, atau masuk untuk kuota 10 per menit.');
  });

  // -------------------------------------------------------------
  // HA-02: Kuota pengguna login (Logged-in Quota)
  // -------------------------------------------------------------
  test('HA-02: Kuota pengguna login 10 permintaan per menit; permintaan ke-11 dijawab 429', async () => {
    resetRateLimits();

    // 10 requests as logged-in user
    for (let i = 1; i <= 10; i++) {
      const res = await request(app)
        .post('/api/recipes/generate')
        .set('Cookie', userACookie)
        .send({ bahanUtama: ['ayam'], waktuMaksimal: 30 });
      expect(res.status).toBe(200);
    }

    // 11th request as logged-in user should be rate-limited (HTTP 429)
    const res11 = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['ayam'], waktuMaksimal: 30 });

    expect(res11.status).toBe(429);
    expect(res11.body.pesan).toBe('Terlalu banyak permintaan, coba lagi dalam 1 menit.');
  });

  // -------------------------------------------------------------
  // HA-03: Buat Ulang tamu (Guest Regeneration Limit)
  // -------------------------------------------------------------
  test('HA-03: Tamu diizinkan 1x Buat Ulang; Buat Ulang ke-2 pada resep yang sama ditolak (429)', async () => {
    resetRateLimits();

    // Initial recipe generation
    const initRes = await request(app)
      .post('/api/recipes/generate')
      .send({ bahanUtama: ['ayam', 'bawang merah'], waktuMaksimal: 30 });
    expect(initRes.status).toBe(200);
    const title1 = initRes.body.resep.judul;

    // 1st Regeneration by guest -> Accepted (HTTP 200)
    const regen1Res = await request(app)
      .post('/api/recipes/generate')
      .send({
        bahanUtama: ['ayam', 'bawang merah'],
        waktuMaksimal: 30,
        hindari: [title1]
      });
    expect(regen1Res.status).toBe(200);
    const title2 = regen1Res.body.resep.judul;

    // 2nd Regeneration by guest on same recipe chain -> Rejected (HTTP 429)
    const regen2Res = await request(app)
      .post('/api/recipes/generate')
      .send({
        bahanUtama: ['ayam', 'bawang merah'],
        waktuMaksimal: 30,
        hindari: [title1, title2]
      });

    expect(regen2Res.status).toBe(429);
    expect(regen2Res.body.pesan).toBe('Masuk untuk membuat hingga 3 variasi.');
  });

  // -------------------------------------------------------------
  // HA-04: Buat Ulang pengguna login (Logged-in Regeneration Limit)
  // -------------------------------------------------------------
  test('HA-04: Pengguna login diizinkan hingga 3x Buat Ulang; Buat Ulang ke-4 ditolak (429)', async () => {
    resetRateLimits();

    // Initial recipe generation
    const initRes = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['tahu', 'tempe'], waktuMaksimal: 25 });
    expect(initRes.status).toBe(200);
    const title1 = initRes.body.resep.judul;

    // 1st Regeneration -> 200
    const regen1 = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['tahu', 'tempe'], waktuMaksimal: 25, hindari: [title1] });
    expect(regen1.status).toBe(200);
    const title2 = regen1.body.resep.judul;

    // 2nd Regeneration -> 200
    const regen2 = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['tahu', 'tempe'], waktuMaksimal: 25, hindari: [title1, title2] });
    expect(regen2.status).toBe(200);
    const title3 = regen2.body.resep.judul;

    // 3rd Regeneration -> 200
    const regen3 = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['tahu', 'tempe'], waktuMaksimal: 25, hindari: [title1, title2, title3] });
    expect(regen3.status).toBe(200);
    const title4 = regen3.body.resep.judul;

    // 4th Regeneration on same recipe chain -> Rejected (HTTP 429)
    const regen4 = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['tahu', 'tempe'], waktuMaksimal: 25, hindari: [title1, title2, title3, title4] });

    expect(regen4.status).toBe(429);
    expect(regen4.body.pesan).toBe('Batas 3 variasi untuk resep ini tercapai.');
  });

  // -------------------------------------------------------------
  // HA-05: Riwayat otomatis (Automatic History, max 20)
  // -------------------------------------------------------------
  test('HA-05: Riwayat otomatis: 21 resep lolos verifikasi tersimpan otomatis, resep ke-21 menggeser yang tertua', async () => {
    resetRateLimits();

    // Clear existing recipes for User A
    const listBefore = await request(app).get('/api/saved-recipes').set('Cookie', userACookie);
    for (const r of listBefore.body) {
      await request(app).delete(`/api/saved-recipes/${r.id}`).set('Cookie', userACookie);
    }

    // Generate 21 recipes
    for (let i = 1; i <= 21; i++) {
      resetRateLimits(); // avoid per-minute block in loop
      const res = await request(app)
        .post('/api/recipes/generate')
        .set('Cookie', userACookie)
        .send({ bahanUtama: [`bahan-${i}`], waktuMaksimal: 30 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('savedRecipeId');
      if (i === 21) userARecipeId = res.body.savedRecipeId;
    }

    // Fetch history
    const historyRes = await request(app)
      .get('/api/saved-recipes')
      .set('Cookie', userACookie);

    expect(historyRes.status).toBe(200);
    // Must be exactly 20 recipes retained (the 21st displaced the 1st oldest)
    expect(historyRes.body).toHaveLength(20);
  });

  // -------------------------------------------------------------
  // HA-06: Membuka riwayat tanpa memanggil AI (0 token)
  // -------------------------------------------------------------
  test('HA-06: Membuka resep dari riwayat tidak memanggil Gemini API (0 panggilan AI)', async () => {
    expect(userARecipeId).toBeTruthy();

    const geminiCallsBefore = geminiCallCount;

    const res = await request(app)
      .get(`/api/saved-recipes/${userARecipeId}`)
      .set('Cookie', userACookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userARecipeId);
    expect(res.body.judul).toBeTruthy();

    // Gemini call count must NOT increase
    expect(geminiCallCount).toBe(geminiCallsBefore);
  });

  // -------------------------------------------------------------
  // HA-07: Catatan pribadi (Personal Notes, max 1000 chars, privacy)
  // -------------------------------------------------------------
  test('HA-07: Catatan pribadi: tulis catatan, tersimpan ≤ 1000 karakter, dan tidak pernah dikirim ke prompt AI', async () => {
    const noteText = 'Gunakan api kecil agar daging tidak gosong, tambahkan daun jeruk.';

    // Save note
    const saveNoteRes = await request(app)
      .put(`/api/saved-recipes/${userARecipeId}/note`)
      .set('Cookie', userACookie)
      .send({ catatan: noteText });

    expect(saveNoteRes.status).toBe(200);
    expect(saveNoteRes.body.catatan).toBe(noteText);

    // Verify persisted
    const detailRes = await request(app)
      .get(`/api/saved-recipes/${userARecipeId}`)
      .set('Cookie', userACookie);
    expect(detailRes.body.catatan).toBe(noteText);

    // Generate another recipe to inspect the prompt
    resetRateLimits();
    await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({ bahanUtama: ['telur'], waktuMaksimal: 15 });

    // CRITICAL PRIVACY: Note content must NEVER appear in prompt
    expect(lastPromptPassed).not.toContain(noteText);
    expect(lastPromptPassed).not.toContain('Gunakan api kecil');

    // Test rejection of note > 1000 chars
    const over1000 = 'a'.repeat(1001);
    const rejectRes = await request(app)
      .put(`/api/saved-recipes/${userARecipeId}/note`)
      .set('Cookie', userACookie)
      .send({ catatan: over1000 });

    expect(rejectRes.status).toBe(422);
    expect(rejectRes.body.pesan).toBe('Catatan maksimal 1.000 karakter.');
  });

  // -------------------------------------------------------------
  // HA-08: Profil pantangan tersimpan (Dietary Restriction Profile)
  // -------------------------------------------------------------
  test('HA-08: Profil pantangan tersimpan: simpan profil, buka profil, deteksi konflik tetap berlaku', async () => {
    // 1. Save dietary profile
    const saveProfRes = await request(app)
      .put('/api/auth/profile/restrictions')
      .set('Cookie', userACookie)
      .send({ pantangan: ['tanpa kacang', 'tanpa gluten'] });

    expect(saveProfRes.status).toBe(200);
    expect(saveProfRes.body.pantangan).toEqual(['tanpa kacang', 'tanpa gluten']);

    // 2. Fetch profile
    const getProfRes = await request(app)
      .get('/api/auth/profile/restrictions')
      .set('Cookie', userACookie);

    expect(getProfRes.status).toBe(200);
    expect(getProfRes.body.pantangan).toEqual(['tanpa kacang', 'tanpa gluten']);

    // 3. Test conflict detection with populated profile restriction
    resetRateLimits();
    const conflictRes = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userACookie)
      .send({
        bahanUtama: ['kacang tanah', 'ayam'],
        waktuMaksimal: 30,
        pantangan: getProfRes.body.pantangan // populated from profile
      });

    expect(conflictRes.status).toBe(422);
    expect(conflictRes.body.galat.some(g => g.includes('bertentangan dengan pantangan tanpa kacang'))).toBe(true);
  });

  // -------------------------------------------------------------
  // HA-09: Akses tanpa hak (Unauthorized Access)
  // -------------------------------------------------------------
  test('HA-09: Tamu ditolak 401 saat membuka riwayat/catatan/profil; Pengguna A membuka data Pengguna B dijawab 404', async () => {
    // 1. Guest access to saved recipes history -> 401
    const guestHistory = await request(app).get('/api/saved-recipes');
    expect(guestHistory.status).toBe(401);
    expect(guestHistory.body.pesan).toBe('Masuk untuk memakai riwayat, catatan, dan profil pantangan.');

    // 2. Guest access to update note -> 401
    const guestNote = await request(app)
      .put(`/api/saved-recipes/${userARecipeId}/note`)
      .send({ catatan: 'Catatan tamu' });
    expect(guestNote.status).toBe(401);
    expect(guestNote.body.pesan).toBe('Masuk untuk memakai riwayat, catatan, dan profil pantangan.');

    // 3. Guest access to profile restrictions -> 401
    const guestProfile = await request(app).get('/api/auth/profile/restrictions');
    expect(guestProfile.status).toBe(401);
    expect(guestProfile.body.pesan).toBe('Masuk untuk memakai riwayat, catatan, dan profil pantangan.');

    // 4. Create recipe for User B
    resetRateLimits();
    const userBGen = await request(app)
      .post('/api/recipes/generate')
      .set('Cookie', userBCookie)
      .send({ bahanUtama: ['ikan'], waktuMaksimal: 20 });
    userBRecipeId = userBGen.body.savedRecipeId;
    expect(userBRecipeId).toBeTruthy();

    // 5. User A attempts to view User B's recipe -> 404
    const crossViewRes = await request(app)
      .get(`/api/saved-recipes/${userBRecipeId}`)
      .set('Cookie', userACookie);
    expect(crossViewRes.status).toBe(404);
    expect(crossViewRes.body.pesan).toBe('Resep tidak ditemukan');

    // 6. User A attempts to edit User B's note -> 404
    const crossNoteRes = await request(app)
      .put(`/api/saved-recipes/${userBRecipeId}/note`)
      .set('Cookie', userACookie)
      .send({ catatan: 'Membajak catatan B' });
    expect(crossNoteRes.status).toBe(404);
    expect(crossNoteRes.body.pesan).toBe('Resep tidak ditemukan');

    // 7. Verify User B's recipe note remains untouched
    const userBCheck = await request(app)
      .get(`/api/saved-recipes/${userBRecipeId}`)
      .set('Cookie', userBCookie);
    expect(userBCheck.body.catatan).toBeNull();
  });
});
