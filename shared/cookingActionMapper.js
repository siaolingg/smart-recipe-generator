/**
 * Smart Recipe Generator - CookingActionMapper
 * Maps cooking instruction text to visual action cards with minimalist SVG vector illustrations.
 * Implements PRD v2.0 - Section 8.5 (Tabel 8), CC-05, KF-18
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const rules = require('./spec-rules');
    module.exports = factory(rules.KARTU_AKSI_MAPPING, rules.KARTU_AKSI_FALLBACK);
  } else {
    const mapping = (root.SpecRules && root.SpecRules.KARTU_AKSI_MAPPING) || [];
    const fallback = (root.SpecRules && root.SpecRules.KARTU_AKSI_FALLBACK) || {
      aksi: 'Langkah umum',
      ikon: 'bi-check2-circle',
      emoji: '👨‍🍳',
      warna: 'primary'
    };
    root.CookingActionMapper = factory(mapping, fallback);
  }
}(typeof self !== 'undefined' ? self : this, function (KARTU_AKSI_MAPPING, KARTU_AKSI_FALLBACK) {
  'use strict';

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function containsKeyword(text, keyword) {
    if (!text || !keyword) return false;
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword.toLowerCase())}([^a-z0-9]|$)`, 'i');
    return regex.test(text.toLowerCase());
  }

  // Minimalist, elegant SVG culinary vector illustrations (0 token, 0 network latency, vector crisp)
  const ACTION_SVGS = {
    'Persiapan bahan': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <rect x="25" y="45" width="110" height="60" rx="8" fill="#F1F5F9" stroke="#94A3B8" stroke-width="2.5" stroke-dasharray="3 3"/>
        <rect x="35" y="55" width="90" height="42" rx="4" fill="#E2E8F0"/>
        <!-- Chopping Board Handle -->
        <rect x="15" y="65" width="12" height="20" rx="3" fill="#CBD5E1" stroke="#94A3B8" stroke-width="2"/>
        <!-- Sliced Ingredients -->
        <circle cx="60" cy="76" r="10" fill="#F97316" fill-opacity="0.85"/>
        <circle cx="76" cy="76" r="10" fill="#F97316" fill-opacity="0.6"/>
        <circle cx="92" cy="76" r="10" fill="#F97316" fill-opacity="0.35"/>
        <!-- Chef Knife -->
        <path d="M45 28 L115 50 L110 56 L42 34 Z" fill="#475569"/>
        <path d="M45 28 L115 50" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M30 23 L46 28 L43 36 L27 31 Z" fill="#B45309" stroke="#78350F" stroke-width="1.5" stroke-linejoin="round"/>
        <!-- Slice Motion lines -->
        <path d="M85 45 L95 40" stroke="#0284C7" stroke-width="2" stroke-linecap="round"/>
        <path d="M98 48 L108 43" stroke="#0284C7" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    'Menumis': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Stove Heat Glow -->
        <ellipse cx="80" cy="98" rx="40" ry="8" fill="#FFEDD5"/>
        <!-- Skillet Pan -->
        <path d="M35 70 C35 88 55 96 80 96 C105 96 125 88 125 70 Z" fill="#334155"/>
        <ellipse cx="80" cy="70" rx="45" ry="12" fill="#1E293B"/>
        <!-- Food Sautéing in Pan -->
        <circle cx="65" cy="70" r="5" fill="#EA580C"/>
        <circle cx="80" cy="67" r="4.5" fill="#FACC15"/>
        <circle cx="95" cy="71" r="5" fill="#22C55E"/>
        <circle cx="75" cy="73" r="4" fill="#F97316"/>
        <!-- Handle -->
        <path d="M125 70 L152 64 C155 63 158 65 158 68 C158 71 155 73 151 74 L125 74 Z" fill="#64748B"/>
        <!-- Sizzle Aroma Steam Swirls -->
        <path d="M65 55 C63 46 72 40 68 30" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
        <path d="M80 52 C78 41 87 35 82 24" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M95 56 C93 47 101 42 97 32" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
      </svg>`,

    'Merebus': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Stockpot Base -->
        <rect x="40" y="52" width="80" height="50" rx="8" fill="#0284C7" fill-opacity="0.9"/>
        <ellipse cx="80" cy="52" rx="40" ry="8" fill="#38BDF8"/>
        <!-- Pot Handles -->
        <path d="M40 60 C28 60 28 72 40 72" stroke="#0369A1" stroke-width="4" stroke-linecap="round"/>
        <path d="M120 60 C132 60 132 72 120 72" stroke="#0369A1" stroke-width="4" stroke-linecap="round"/>
        <!-- Soup Broth Surface & Bubbles -->
        <ellipse cx="80" cy="53" rx="35" ry="6" fill="#BAE6FD"/>
        <circle cx="68" cy="52" r="3" fill="#FFFFFF"/>
        <circle cx="82" cy="53" r="2.5" fill="#FFFFFF"/>
        <circle cx="94" cy="52" r="2" fill="#FFFFFF"/>
        <!-- Rising Steam Waves -->
        <path d="M60 42 C56 32 66 26 62 16" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M80 40 C76 28 86 22 81 12" stroke="#0284C7" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 42 C96 32 106 26 102 16" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`,

    'Menggoreng': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Deep Frying Pan -->
        <path d="M35 65 C35 88 54 98 80 98 C106 98 125 88 125 65 Z" fill="#DC2626"/>
        <ellipse cx="80" cy="65" rx="45" ry="12" fill="#991B1B"/>
        <!-- Golden Oil -->
        <ellipse cx="80" cy="66" rx="40" ry="9" fill="#F59E0B"/>
        <!-- Frying Item & Crisp Bubble Particles -->
        <rect x="65" y="60" width="30" height="12" rx="6" fill="#D97706" stroke="#FEF3C7" stroke-width="1.5"/>
        <circle cx="58" cy="64" r="2.5" fill="#FEF08A"/>
        <circle cx="72" cy="57" r="2" fill="#FEF08A"/>
        <circle cx="88" cy="58" r="2.5" fill="#FEF08A"/>
        <circle cx="102" cy="65" r="2" fill="#FEF08A"/>
        <!-- Sizzle Sparks & Heat Lines -->
        <path d="M70 48 L73 42" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
        <path d="M80 44 L80 37" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M90 47 L93 41" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    'Mengukus': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Steamer Tier 1 -->
        <rect x="42" y="70" width="76" height="26" rx="6" fill="#0D9488"/>
        <!-- Steamer Tier 2 -->
        <rect x="42" y="46" width="76" height="24" rx="6" fill="#14B8A6"/>
        <!-- Steamer Lid with Handle -->
        <path d="M42 46 C42 36 60 32 80 32 C100 32 118 36 118 46 Z" fill="#0F766E"/>
        <circle cx="80" cy="28" r="4.5" fill="#134E4A"/>
        <!-- Slits -->
        <line x1="52" y1="58" x2="66" y2="58" stroke="#CCFBF1" stroke-width="2" stroke-linecap="round"/>
        <line x1="73" y1="58" x2="87" y2="58" stroke="#CCFBF1" stroke-width="2" stroke-linecap="round"/>
        <line x1="94" y1="58" x2="108" y2="58" stroke="#CCFBF1" stroke-width="2" stroke-linecap="round"/>
        <!-- Swirling Pure Steam Clouds -->
        <path d="M30 40 C35 30 50 35 55 25" stroke="#99F6E4" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M125 40 C120 30 105 35 100 25" stroke="#99F6E4" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`,

    'Memanggang': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Grill Frame -->
        <rect x="36" y="55" width="88" height="45" rx="6" fill="#1E293B"/>
        <!-- Grill Grate Lines -->
        <line x1="45" y1="62" x2="115" y2="62" stroke="#94A3B8" stroke-width="2.5"/>
        <line x1="45" y1="72" x2="115" y2="72" stroke="#94A3B8" stroke-width="2.5"/>
        <line x1="45" y1="82" x2="115" y2="82" stroke="#94A3B8" stroke-width="2.5"/>
        <!-- Food with Char Grill Marks -->
        <rect x="58" y="58" width="44" height="26" rx="4" fill="#B45309"/>
        <line x1="65" y1="58" x2="73" y2="84" stroke="#451A03" stroke-width="2.5"/>
        <line x1="78" y1="58" x2="86" y2="84" stroke="#451A03" stroke-width="2.5"/>
        <!-- Flame Embers -->
        <path d="M60 48 Q65 38 68 44 Q72 34 76 46" fill="#F97316"/>
        <path d="M84 48 Q88 36 92 42 Q96 32 100 46" fill="#EF4444"/>
      </svg>`,

    'Mencampur': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Ceramic Mixing Bowl -->
        <path d="M38 48 C38 82 56 96 80 96 C104 96 122 82 122 48 Z" fill="#64748B"/>
        <ellipse cx="80" cy="48" rx="42" ry="10" fill="#E2E8F0"/>
        <!-- Whisk Swirl Motion -->
        <path d="M65 48 C65 52 95 52 95 48 C95 44 65 44 65 48 Z" fill="#F8FAFC"/>
        <!-- Wire Whisk -->
        <line x1="105" y1="20" x2="80" y2="62" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="80" cy="58" rx="10" ry="14" stroke="#334155" stroke-width="2" transform="rotate(-30 80 58)" fill="none"/>
        <!-- Dynamic Spiral Accent -->
        <path d="M60 38 Q50 34 54 26" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    'Penyajian': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Elegant Serving Plate -->
        <ellipse cx="80" cy="85" rx="55" ry="15" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
        <ellipse cx="80" cy="83" rx="42" ry="10" fill="#FFFFFF"/>
        <!-- Plated Dish with Garnish -->
        <ellipse cx="80" cy="81" rx="26" ry="6" fill="#F97316"/>
        <circle cx="78" cy="78" r="3" fill="#16A34A"/>
        <circle cx="84" cy="79" r="2.5" fill="#DC2626"/>
        <!-- Elegant Cloche Dome Lifting Off -->
        <path d="M48 68 C48 40 62 30 80 30 C98 30 112 40 112 68 Z" fill="#F8FAFC" stroke="#64748B" stroke-width="2.5"/>
        <circle cx="80" cy="24" r="5" fill="#475569"/>
        <!-- Gourmet Sparkle Stars -->
        <path d="M35 35 L38 42 L45 45 L38 48 L35 55 L32 48 L25 45 L32 42 Z" fill="#EAB308"/>
        <path d="M125 30 L127 35 L132 37 L127 39 L125 44 L123 39 L118 37 L123 35 Z" fill="#EAB308"/>
      </svg>`,

    'Langkah umum': `
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="action-illustration-svg">
        <!-- Chef Hat (Toque) -->
        <path d="M52 68 C42 66 40 52 50 44 C48 34 60 26 72 32 C80 24 92 24 98 34 C108 30 118 40 114 50 C122 58 116 68 108 68 Z" fill="#F8FAFC" stroke="#0284C7" stroke-width="2.5"/>
        <rect x="52" y="68" width="56" height="18" rx="3" fill="#E0F2FE" stroke="#0284C7" stroke-width="2"/>
        <!-- Hat Pleat Lines -->
        <line x1="66" y1="70" x2="66" y2="84" stroke="#0284C7" stroke-width="1.5"/>
        <line x1="80" y1="70" x2="80" y2="84" stroke="#0284C7" stroke-width="1.5"/>
        <line x1="94" y1="70" x2="94" y2="84" stroke="#0284C7" stroke-width="1.5"/>
        <!-- Sparkle Accent -->
        <path d="M125 25 L128 32 L135 35 L128 38 L125 45 L122 38 L115 35 L122 32 Z" fill="#38BDF8"/>
      </svg>`
  };

  const ACTION_DESKRIPSI = {
    'Persiapan bahan': 'Potong, kupas, atau siapkan bahan sesuai petunjuk.',
    'Menumis': 'Gunakan wajan dengan api sedang dan sedikit minyak hingga harum.',
    'Merebus': 'Gunakan panci berisi air atau kuah hingga mendidih.',
    'Menggoreng': 'Goreng bahan dalam minyak panas hingga matang merata.',
    'Mengukus': 'Kukus menggunakan uap panas agar nutrisi dan kelembutan terjaga.',
    'Memanggang': 'Panggang menggunakan oven atau wajan pemanggang panas.',
    'Mencampur': 'Aduk dan campurkan bumbu dengan bahan utama hingga merata.',
    'Penyajian': 'Tata makanan dengan rapi di piring saji selagi hangat.',
    'Langkah umum': 'Ikuti instruksi memasak berikut dengan saksama.'
  };

  /**
   * Maps an instruction string to an action card object with SVG illustration.
   * @param {string} instructionText
   * @returns {{ aksi: string, ikon: string, emoji: string, warna: string, keywordMatched: string|null, svg: string, deskripsi: string }}
   */
  function mapCookingAction(instructionText) {
    if (!instructionText || typeof instructionText !== 'string') {
      const fallback = KARTU_AKSI_FALLBACK;
      return {
        ...fallback,
        keywordMatched: null,
        svg: ACTION_SVGS[fallback.aksi] || ACTION_SVGS['Langkah umum'],
        deskripsi: ACTION_DESKRIPSI[fallback.aksi] || ACTION_DESKRIPSI['Langkah umum']
      };
    }

    const cleanText = instructionText.trim();

    for (const item of KARTU_AKSI_MAPPING) {
      for (const kw of item.kataKunci) {
        if (containsKeyword(cleanText, kw)) {
          return {
            aksi: item.aksi,
            ikon: item.ikon,
            emoji: item.emoji,
            warna: item.warna,
            keywordMatched: kw,
            svg: ACTION_SVGS[item.aksi] || ACTION_SVGS['Langkah umum'],
            deskripsi: ACTION_DESKRIPSI[item.aksi] || ACTION_DESKRIPSI['Langkah umum']
          };
        }
      }
    }

    return {
      ...KARTU_AKSI_FALLBACK,
      keywordMatched: null,
      svg: ACTION_SVGS[KARTU_AKSI_FALLBACK.aksi] || ACTION_SVGS['Langkah umum'],
      deskripsi: ACTION_DESKRIPSI[KARTU_AKSI_FALLBACK.aksi] || ACTION_DESKRIPSI['Langkah umum']
    };
  }

  return {
    mapCookingAction,
    KARTU_AKSI_MAPPING,
    KARTU_AKSI_FALLBACK,
    ACTION_SVGS,
    ACTION_DESKRIPSI
  };
}));
