/**
 * Integration & API Tests for Smart Recipe Generator
 * Implements Tabel 28 (Kasus Uji Black Box TC-01 s.d. TC-46)
 */

const request = require('supertest');
const app = require('../src/app');
const RecipeController = require('../src/controllers/recipeController');
const { inMemoryDb, resetInMemoryDb } = require('../src/db/db');
const { resetRateLimits } = require('../src/middleware/rateLimit');

describe('API Integration Tests', () => {
  let rinaCookie = null;
  let budiCookie = null;
  let rinaRecipeId = null;
  let budiRecipeId = null;

  beforeAll(() => {
    resetInMemoryDb();
  });

  beforeEach(() => {
    resetRateLimits();
  });

  afterAll(() => {
    RecipeController.resetGeminiService();
  });

  describe('EP-01 / UC-01: Registrasi Akun', () => {
    test('TC-01: Registrasi dengan data valid (201)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nama: 'Rina',
          email: 'rina@mail.com',
          kataSandi: 'resep123',
          konfirmasi: 'resep123'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('rina@mail.com');
    });

    test('TC-02: Registrasi dengan format email salah (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nama: 'Rina',
          email: 'rina@mail',
          kataSandi: 'resep123',
          konfirmasi: 'resep123'
        });

      expect(res.status).toBe(422);
      expect(res.body.pesan).toContain('Format email tidak valid');
    });

    test('TC-03: Registrasi dengan kata sandi 7 karakter (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nama: 'Rina',
          email: 'rina2@mail.com',
          kataSandi: 'resep12',
          konfirmasi: 'resep12'
        });

      expect(res.status).toBe(422);
      expect(res.body.pesan).toContain('minimal 8 karakter');
    });

    test('TC-05: Konfirmasi kata sandi berbeda (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nama: 'Rina',
          email: 'rina3@mail.com',
          kataSandi: 'resep123',
          konfirmasi: 'resep321'
        });

      expect(res.status).toBe(422);
      expect(res.body.pesan).toContain('Konfirmasi kata sandi tidak sama');
    });

    test('TC-06: Email sudah terdaftar (409)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nama: 'Rina Duplikat',
          email: 'rina@mail.com',
          kataSandi: 'resep123',
          konfirmasi: 'resep123'
        });

      expect(res.status).toBe(409);
      expect(res.body.pesan).toContain('Email sudah terdaftar');
    });

    test('Register user Budi for cross-user tests', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nama: 'Budi',
          email: 'budi@mail.com',
          kataSandi: 'budi1234',
          konfirmasi: 'budi1234'
        });

      expect(res.status).toBe(201);
    });
  });

  describe('EP-01 / UC-02: Login & Sesi', () => {
    test('TC-09: Kolom email atau sandi kosong (422)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', kataSandi: '' });

      expect(res.status).toBe(422);
      expect(res.body.pesan).toContain('wajib diisi');
    });

    test('TC-08: Kata sandi salah (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rina@mail.com', kataSandi: 'salah123' });

      expect(res.status).toBe(401);
      expect(res.body.pesan).toBe('Email atau kata sandi salah');
    });

    test('TC-07: Login dengan kredensial benar (200 + cookie sesi)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rina@mail.com', kataSandi: 'resep123' });

      expect(res.status).toBe(200);
      expect(res.body.user.nama).toBe('Rina');
      expect(res.headers['set-cookie']).toBeDefined();
      rinaCookie = res.headers['set-cookie'];
    });

    test('Login user Budi to get budiCookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'budi@mail.com', kataSandi: 'budi1234' });

      expect(res.status).toBe(200);
      budiCookie = res.headers['set-cookie'];
    });

    test('GET /api/auth/me returns current session user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('rina@mail.com');
    });
  });

  describe('EP-02 & EP-03 / UC-04, UC-05: Buat Resep dengan AI', () => {
    test('TC-14: Tanpa bahan ditolak (422)', async () => {
      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: [],
          waktuMaksimal: 30
        });

      expect(res.status).toBe(422);
      expect(res.body.galat).toContain('Isi minimal 1 bahan');
    });

    test('TC-20: Konflik bahan dan pantangan ditolak (422)', async () => {
      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: ['telur', 'nasi'],
          waktuMaksimal: 30,
          pantangan: ['tanpa telur']
        });

      expect(res.status).toBe(422);
      expect(res.body.galat.some(g => g.includes('telur bertentangan dengan pantangan tanpa telur'))).toBe(true);
    });

    test('TC-22: Buat resep dari spesifikasi valid berhasil (200)', async () => {
      // Mock Gemini returns compliant recipe
      RecipeController.setGeminiService({
        callGemini: async () => ({
          judul: 'Tumis Ayam Bawang Gurih',
          estimasi_waktu: 20,
          daftar_bahan: [
            { nama: 'ayam fillet', jumlah: '200 gr' },
            { nama: 'bawang merah', jumlah: '3 siung' },
            { nama: 'minyak goreng', jumlah: '1 sdm' },
            { nama: 'garam', jumlah: 'secukupnya' }
          ],
          langkah_memasak: [
            'Potong ayam fillet dadu.',
            'Tumis bawang merah dengan minyak hingga harum.',
            'Masukkan ayam dan garam, masak hingga matang 15 menit.'
          ]
        })
      });

      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: ['ayam', 'bawang merah'],
          waktuMaksimal: 30,
          pantangan: ['tanpa kacang']
        });

      expect(res.status).toBe(200);
      expect(res.body.resep.judul).toBe('Tumis Ayam Bawang Gurih');
      expect(res.body.kepatuhan).toEqual({
        waktu: true,
        bahan: true,
        pantangan: true,
        percobaan: 1
      });
    });

    test('TC-23 & TC-24: Percobaan ulang berhasil jika percobaan 1 melanggar spesifikasi (200, percobaan: 2)', async () => {
      let callCount = 0;
      RecipeController.setGeminiService({
        callGemini: async (prompt) => {
          callCount++;
          if (callCount === 1) {
            // Attempt 1: violates with unauthorized ingredient "kacang tanah"
            return {
              judul: 'Ayam Bumbu Kacang',
              estimasi_waktu: 20,
              daftar_bahan: [
                { nama: 'ayam', jumlah: '200 gr' },
                { nama: 'kacang tanah', jumlah: '50 gr' },
                { nama: 'garam', jumlah: '1/2 sdt' }
              ],
              langkah_memasak: ['Haluskan kacang dan masak bersama ayam.']
            };
          }
          // Attempt 2: corrected
          return {
            judul: 'Ayam Bumbu Garam',
            estimasi_waktu: 20,
            daftar_bahan: [
              { nama: 'ayam', jumlah: '200 gr' },
              { nama: 'garam', jumlah: '1/2 sdt' },
              { nama: 'air', jumlah: '100 ml' }
            ],
            langkah_memasak: ['Rebus ayam bersama garam dan air.']
          };
        }
      });

      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: ['ayam'],
          waktuMaksimal: 30,
          pantangan: ['tanpa kacang']
        });

      expect(res.status).toBe(200);
      expect(res.body.kepatuhan.percobaan).toBe(2);
      expect(res.body.resep.judul).toBe('Ayam Bumbu Garam');
    });

    test('TC-26: Gagal 3 kali berturut-turut menghasilkan 502 dengan saran', async () => {
      // Mock Gemini returning non-compliant recipe 3 times
      RecipeController.setGeminiService({
        callGemini: async () => ({
          judul: 'Resep Melanggar Waktu',
          estimasi_waktu: 60, // Exceeds waktuMaksimal 30
          daftar_bahan: [{ nama: 'ayam', jumlah: '200 gr' }],
          langkah_memasak: ['Masak ayam selama 60 menit.']
        })
      });

      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: ['ayam'],
          waktuMaksimal: 30
        });

      expect(res.status).toBe(502);
      expect(res.body.pesan).toBe('Resep tidak dapat dibuat sesuai spesifikasi. Coba tambah bahan atau longgarkan waktu.');
    });

    test('Layanan AI galat atau batas waktu menghasilkan 503', async () => {
      RecipeController.setGeminiService({
        callGemini: async () => {
          const err = new Error('Network timeout');
          err.status = 503;
          throw err;
        }
      });

      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: ['ayam'],
          waktuMaksimal: 30
        });

      expect(res.status).toBe(503);
      expect(res.body.pesan).toBe('Layanan AI sedang sibuk, coba lagi.');
    });

    test('TC-33: Buat Ulang resep menghasilkan judul berbeda', async () => {
      RecipeController.setGeminiService({
        callGemini: async () => ({
          judul: 'Ayam Panggang Bawang Spesial',
          estimasi_waktu: 25,
          daftar_bahan: [
            { nama: 'ayam', jumlah: '250 gr' },
            { nama: 'bawang merah', jumlah: '4 siung' },
            { nama: 'garam', jumlah: '1 sdt' }
          ],
          langkah_memasak: ['Panggang ayam dengan taburan bawang dan garam.']
        })
      });

      const res = await request(app)
        .post('/api/recipes/generate')
        .send({
          bahanUtama: ['ayam', 'bawang merah'],
          waktuMaksimal: 30,
          hindari: ['Tumis Ayam Bawang Gurih']
        });

      expect(res.status).toBe(200);
      expect(res.body.resep.judul).toBe('Ayam Panggang Bawang Spesial');
    });
  });

  describe('EP-04 / UC-08, UC-09, UC-10: Resep Tersimpan', () => {
    const validRecipeData = {
      spesifikasi: {
        bahanUtama: ['ayam', 'telur'],
        waktuMaksimal: 30,
        pantangan: ['tanpa kacang']
      },
      resep: {
        judul: 'Ayam Telur Praktis',
        estimasi_waktu: 20,
        daftar_bahan: [
          { nama: 'ayam', jumlah: '100 gr' },
          { nama: 'telur', jumlah: '2 butir' },
          { nama: 'garam', jumlah: '1/2 sdt' }
        ],
        langkah_memasak: ['Kocok telur bersama ayam suwir dan garam.', 'Goreng hingga matang.']
      }
    };

    test('TC-46: Akses API /api/saved-recipes tanpa sesi ditolak (401)', async () => {
      const res = await request(app).get('/api/saved-recipes');
      expect(res.status).toBe(401);
    });

    test('TC-35: Simpan resep setelah login berhasil (201)', async () => {
      const res = await request(app)
        .post('/api/saved-recipes')
        .set('Cookie', rinaCookie)
        .send(validRecipeData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      rinaRecipeId = res.body.id;
    });

    test('TC-37: Simpan resep yang sama dua kali ditolak (409)', async () => {
      const res = await request(app)
        .post('/api/saved-recipes')
        .set('Cookie', rinaCookie)
        .send(validRecipeData);

      expect(res.status).toBe(409);
      expect(res.body.pesan).toBe('Resep sudah ada di Resep Saya');
    });

    test('Save a recipe for Budi to test data isolation', async () => {
      const res = await request(app)
        .post('/api/saved-recipes')
        .set('Cookie', budiCookie)
        .send({
          spesifikasi: { bahanUtama: ['ikan'], waktuMaksimal: 25 },
          resep: {
            judul: 'Ikan Bakar Budi',
            estimasi_waktu: 20,
            daftar_bahan: [{ nama: 'ikan', jumlah: '1 ekor' }],
            langkah_memasak: ['Bakar ikan sampai matang.']
          }
        });

      expect(res.status).toBe(201);
      budiRecipeId = res.body.id;
    });

    test('TC-38: Daftar resep tersimpan menampilkan resep milik pengguna', async () => {
      const res = await request(app)
        .get('/api/saved-recipes')
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].judul).toBe('Ayam Telur Praktis');
    });

    test('TC-42: Pencarian resep berdasarkan kata kunci (case-insensitive)', async () => {
      const resMatch = await request(app)
        .get('/api/saved-recipes?q=TELUR')
        .set('Cookie', rinaCookie);

      expect(resMatch.status).toBe(200);
      expect(resMatch.body.length).toBe(1);

      const resNoMatch = await request(app)
        .get('/api/saved-recipes?q=daging_sapi_tidak_ada')
        .set('Cookie', rinaCookie);

      expect(resNoMatch.status).toBe(200);
      expect(resNoMatch.body.length).toBe(0);
    });

    test('TC-40: Detail resep milik sendiri berhasil dibuka (200)', async () => {
      const res = await request(app)
        .get(`/api/saved-recipes/${rinaRecipeId}`)
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(200);
      expect(res.body.judul).toBe('Ayam Telur Praktis');
      expect(res.body.daftar_bahan.length).toBe(3);
    });

    test('TC-41: Detail resep milik pengguna lain mengembalikan 404 (Isolasi data BR-14)', async () => {
      // Rina tries to view Budi's recipe
      const res = await request(app)
        .get(`/api/saved-recipes/${budiRecipeId}`)
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(404);
      expect(res.body.pesan).toBe('Resep tidak ditemukan');
    });

    test('TC-45: Hapus resep milik pengguna lain mengembalikan 404 dan tidak menghapus data', async () => {
      // Rina tries to delete Budi's recipe
      const res = await request(app)
        .delete(`/api/saved-recipes/${budiRecipeId}`)
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(404);

      // Verify Budi's recipe is still intact
      const checkBudi = await request(app)
        .get(`/api/saved-recipes/${budiRecipeId}`)
        .set('Cookie', budiCookie);

      expect(checkBudi.status).toBe(200);
      expect(checkBudi.body.judul).toBe('Ikan Bakar Budi');
    });

    test('TC-43: Hapus resep milik sendiri berhasil (204)', async () => {
      const res = await request(app)
        .delete(`/api/saved-recipes/${rinaRecipeId}`)
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(204);

      // Verify it's gone
      const verifyRes = await request(app)
        .get(`/api/saved-recipes/${rinaRecipeId}`)
        .set('Cookie', rinaCookie);

      expect(verifyRes.status).toBe(404);
    });

    test('TC-11: Logout dikonfirmasi menghapus sesi (204)', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', rinaCookie);

      expect(res.status).toBe(204);

      // After logout, accessing protected route gives 401
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', rinaCookie);

      expect(meRes.status).toBe(401);
    });
  });
});
