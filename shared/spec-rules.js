/**
 * Smart Recipe Generator - Spesifikasi sebagai Kode
 * Shared rules & configuration for both Client and Server
 * Implements PRD v2.0, NFR-11
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpecRules = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BAHAN_DASAR = ['garam', 'gula', 'merica', 'minyak goreng', 'air'];

  const PETA_PANTANGAN = {
    'tanpa kacang': ['kacang', 'kacang tanah', 'selai kacang', 'mede', 'almon'],
    'tanpa susu': ['susu', 'keju', 'mentega', 'krim', 'yoghurt'],
    'tanpa telur': ['telur', 'mayones'],
    'tanpa seafood': ['udang', 'cumi', 'kerang', 'kepiting', 'ikan', 'teri'],
    'tanpa gluten': ['tepung terigu', 'roti', 'mi', 'pasta'],
    'rendah karbo': ['nasi', 'mi', 'roti', 'kentang', 'gula', 'tepung'],
    'vegetarian': ['ayam', 'daging', 'sapi', 'kambing', 'babi', 'ikan', 'udang', 'cumi', 'kerang']
  };

  const ATURAN_BATAS = {
    MIN_BAHAN: 1,
    MAX_BAHAN: 15,
    MIN_PANJANG_BAHAN: 2,
    MAX_PANJANG_BAHAN: 40,
    MIN_WAKTU: 5,
    MAX_WAKTU: 180,
    DEFAULT_WAKTU: 30,
    MAX_PANTANGAN: 10,
    MAX_PANJANG_PANTANGAN: 30,
    MAX_PERCOBAAN: 3
  };

  const CONTOH_SPESIFIKASI = {
    bahanUtama: ['ayam', 'telur', 'bawang merah'],
    waktuMaksimal: 30,
    pantangan: ['tanpa kacang']
  };

  // PRD v2.0 - Section 8.4: Smart Step Timer Regex
  const TIMER_REGEX = /(\d+)\s*(?:menit|mnt)/i;

  // PRD v2.0 - Section 8.5 (Tabel 8) & Spesifikasi AI (Tabel 10): Visual Cooking Action Cards
  const KARTU_AKSI_MAPPING = [
    {
      kataKunci: ['potong', 'iris', 'cincang', 'kupas'],
      aksi: 'Persiapan bahan',
      ikon: 'bi-scissors',
      emoji: '🔪',
      warna: 'info'
    },
    {
      kataKunci: ['tumis', 'sangrai'],
      aksi: 'Menumis',
      ikon: 'bi-fire',
      emoji: '🍳',
      warna: 'warning'
    },
    {
      kataKunci: ['rebus', 'didihkan'],
      aksi: 'Merebus',
      ikon: 'bi-droplet-half',
      emoji: '🍲',
      warna: 'primary'
    },
    {
      kataKunci: ['goreng'],
      aksi: 'Menggoreng',
      ikon: 'bi-slash-circle',
      emoji: '🥘',
      warna: 'danger'
    },
    {
      kataKunci: ['kukus'],
      aksi: 'Mengukus',
      ikon: 'bi-cloud',
      emoji: '💨',
      warna: 'info'
    },
    {
      kataKunci: ['panggang', 'bakar', 'oven'],
      aksi: 'Memanggang',
      ikon: 'bi-thermometer-high',
      emoji: '🔥',
      warna: 'warning'
    },
    {
      kataKunci: ['aduk', 'campur', 'kocok', 'tuang'],
      aksi: 'Mencampur',
      ikon: 'bi-arrow-repeat',
      emoji: '🥣',
      warna: 'secondary'
    },
    {
      kataKunci: ['sajikan', 'tata', 'hidangkan', 'taburi'],
      aksi: 'Penyajian',
      ikon: 'bi-star',
      emoji: '🍽️',
      warna: 'success'
    }
  ];

  const KARTU_AKSI_FALLBACK = {
    aksi: 'Langkah umum',
    ikon: 'bi-check2-circle',
    emoji: '👨‍🍳',
    warna: 'primary'
  };

  return {
    BAHAN_DASAR,
    PETA_PANTANGAN,
    ATURAN_BATAS,
    CONTOH_SPESIFIKASI,
    TIMER_REGEX,
    KARTU_AKSI_MAPPING,
    KARTU_AKSI_FALLBACK
  };
}));
