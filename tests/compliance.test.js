/**
 * Specification Compliance Tests (SK-01 s.d. SK-10)
 * Implements Tabel 29 of Artefak Proses Agile
 */

const SpecValidator = require('../shared/specValidator');
const OutputValidator = require('../src/services/outputValidator');

describe('Specification Compliance Scenarios (SK-01 s.d. SK-10)', () => {
  test('SK-01: ayam, telur, bawang merah; 30 menit; tanpa kacang (Lolos)', () => {
    const spec = {
      bahanUtama: ['ayam', 'telur', 'bawang merah'],
      waktuMaksimal: 30,
      pantangan: ['tanpa kacang']
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Ayam Telur Bumbu Merah',
      estimasi_waktu: 25,
      daftar_bahan: [
        { nama: 'daging ayam', jumlah: '200 gr' },
        { nama: 'telur ayam', jumlah: '2 butir' },
        { nama: 'bawang merah', jumlah: '4 siung' },
        { nama: 'garam', jumlah: '1/2 sdt' },
        { nama: 'minyak goreng', jumlah: '1 sdm' }
      ],
      langkah_memasak: ['Tumis bawang merah dengan minyak.', 'Masukkan ayam dan telur, tambahkan garam.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-02: tahu, tempe, kecap; 20 menit; vegetarian (Lolos)', () => {
    const spec = {
      bahanUtama: ['tahu', 'tempe', 'kecap'],
      waktuMaksimal: 20,
      pantangan: ['vegetarian']
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Orek Tempe Tahu Manis',
      estimasi_waktu: 15,
      daftar_bahan: [
        { nama: 'tahu putih', jumlah: '1 kotak' },
        { nama: 'tempe', jumlah: '1 papan' },
        { nama: 'kecap manis', jumlah: '2 sdm' },
        { nama: 'minyak goreng', jumlah: '2 sdm' },
        { nama: 'garam', jumlah: '1/4 sdt' }
      ],
      langkah_memasak: ['Goreng tahu dan tempe.', 'Bumbui dengan kecap dan garam.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-03: nasi, telur, wortel; 15 menit; tanpa pantangan (Lolos)', () => {
    const spec = {
      bahanUtama: ['nasi', 'telur', 'wortel'],
      waktuMaksimal: 15,
      pantangan: []
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Nasi Goreng Telur Wortel',
      estimasi_waktu: 12,
      daftar_bahan: [
        { nama: 'nasi putih', jumlah: '1 piring' },
        { nama: 'telur', jumlah: '1 butir' },
        { nama: 'wortel cincang', jumlah: '1/2 buah' },
        { nama: 'garam', jumlah: '1/2 sdt' },
        { nama: 'merica', jumlah: 'sejumput' },
        { nama: 'minyak goreng', jumlah: '1 sdm' }
      ],
      langkah_memasak: ['Orak-arik telur.', 'Masukkan wortel dan nasi, aduk rata dengan garam dan merica.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-04: ikan, tomat, cabai; 45 menit; tanpa susu (Lolos)', () => {
    const spec = {
      bahanUtama: ['ikan', 'tomat', 'cabai'],
      waktuMaksimal: 45,
      pantangan: ['tanpa susu']
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Ikan Kuah Tomat Pedas',
      estimasi_waktu: 35,
      daftar_bahan: [
        { nama: 'ikan segar', jumlah: '2 ekor' },
        { nama: 'tomat merah', jumlah: '2 buah' },
        { nama: 'cabai rawit', jumlah: '5 buah' },
        { nama: 'air', jumlah: '400 ml' },
        { nama: 'garam', jumlah: '1 sdt' }
      ],
      langkah_memasak: ['Rebus air bersama potongan tomat dan cabai.', 'Masukkan ikan dan garam, masak hingga matang.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-05: kentang, keju, susu; 40 menit; tanpa telur (Lolos)', () => {
    const spec = {
      bahanUtama: ['kentang', 'keju', 'susu'],
      waktuMaksimal: 40,
      pantangan: ['tanpa telur']
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Mashed Potato Keju Gurih',
      estimasi_waktu: 30,
      daftar_bahan: [
        { nama: 'kentang', jumlah: '3 buah' },
        { nama: 'keju', jumlah: '50 gr' },
        { nama: 'susu cair', jumlah: '100 ml' },
        { nama: 'garam', jumlah: '1/2 sdt' },
        { nama: 'merica', jumlah: '1/4 sdt' }
      ],
      langkah_memasak: ['Kukus kentang lalu lumatkan.', 'Campurkan susu, keju, garam, dan merica.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-06: udang, brokoli, bawang putih; 25 menit; tanpa gluten (Lolos)', () => {
    const spec = {
      bahanUtama: ['udang', 'brokoli', 'bawang putih'],
      waktuMaksimal: 25,
      pantangan: ['tanpa gluten']
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Tumis Udang Brokoli Bawang Putih',
      estimasi_waktu: 20,
      daftar_bahan: [
        { nama: 'udang kupas', jumlah: '150 gr' },
        { nama: 'brokoli', jumlah: '1 bonggol' },
        { nama: 'bawang putih', jumlah: '3 siung' },
        { nama: 'minyak goreng', jumlah: '1 sdm' },
        { nama: 'garam', jumlah: '1/2 sdt' }
      ],
      langkah_memasak: ['Tumis bawang putih.', 'Masukkan udang dan brokoli, bumbui dengan garam.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-07: daging sapi, kentang, wortel; 90 menit; rendah karbo (Ditolak 422 - konflik kentang vs rendah karbo)', () => {
    const spec = {
      bahanUtama: ['daging sapi', 'kentang', 'wortel'],
      waktuMaksimal: 90,
      pantangan: ['rendah karbo']
    };
    const { valid, konflik } = SpecValidator.validateAll(spec);
    expect(valid).toBe(false);
    expect(konflik.some(k => k.includes('kentang bertentangan dengan pantangan rendah karbo'))).toBe(true);
  });

  test('SK-08: mi, sawi, telur; 10 menit; tanpa pantangan (Lolos waktu ketat)', () => {
    const spec = {
      bahanUtama: ['mi', 'sawi', 'telur'],
      waktuMaksimal: 10,
      pantangan: []
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Mi Rebus Kilat Sawi Telur',
      estimasi_waktu: 8,
      daftar_bahan: [
        { nama: 'mi', jumlah: '1 bungkus' },
        { nama: 'sawi hijau', jumlah: '2 lembar' },
        { nama: 'telur', jumlah: '1 butir' },
        { nama: 'air', jumlah: '300 ml' },
        { nama: 'garam', jumlah: '1/2 sdt' }
      ],
      langkah_memasak: ['Didihkan air.', 'Rebus mi, sawi, dan telur selama 5 menit.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });

  test('SK-09: bayam, jagung; 5 menit; tanpa pantangan (Lolos atau tertolak jika waktu estimasi melebihi)', () => {
    const spec = {
      bahanUtama: ['bayam', 'jagung'],
      waktuMaksimal: 5,
      pantangan: []
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const tooLongRecipe = {
      judul: 'Sayur Bening Bayam Jagung',
      estimasi_waktu: 10,
      daftar_bahan: [
        { nama: 'bayam', jumlah: '1 ikat' },
        { nama: 'jagung manis', jumlah: '1 buah' },
        { nama: 'air', jumlah: '500 ml' },
        { nama: 'garam', jumlah: '1 sdt' }
      ],
      langkah_memasak: ['Rebus air bersama jagung.', 'Tambahkan bayam dan garam.']
    };
    const violations = OutputValidator.checkCompliance(tooLongRecipe, spec);
    expect(violations).toContain('Estimasi 10 menit melebihi 5 menit');
  });

  test('SK-10: ayam, santan, serai, kunyit; 180 menit; tanpa seafood (Lolos)', () => {
    const spec = {
      bahanUtama: ['ayam', 'santan', 'serai', 'kunyit'],
      waktuMaksimal: 180,
      pantangan: ['tanpa seafood']
    };
    const { valid } = SpecValidator.validateAll(spec);
    expect(valid).toBe(true);

    const recipe = {
      judul: 'Kari Ayam Santan Kunyit Gurih',
      estimasi_waktu: 60,
      daftar_bahan: [
        { nama: 'daging ayam', jumlah: '500 gr' },
        { nama: 'santan kental', jumlah: '200 ml' },
        { nama: 'serai', jumlah: '2 batang' },
        { nama: 'kunyit bubuk', jumlah: '1 sdt' },
        { nama: 'garam', jumlah: '1 sdt' },
        { nama: 'minyak goreng', jumlah: '2 sdm' }
      ],
      langkah_memasak: ['Tumis serai dan kunyit.', 'Masukkan ayam dan santan, ungkep perlahan sampai empuk.']
    };
    expect(OutputValidator.validateSchema(recipe)).toBe(true);
    expect(OutputValidator.checkCompliance(recipe, spec)).toHaveLength(0);
  });
});
