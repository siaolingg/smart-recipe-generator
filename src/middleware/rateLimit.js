/**
 * Smart Recipe Generator - Rate Limiting & Quota Middleware
 * Implements PRD Version 3.0:
 * - F-09, KF-08: Tiered generation quota (Guest 5/min/IP, Auth 10/min/account)
 * - KF-14, HA-03, HA-04: Tiered regeneration quota (Guest 1/recipe, Auth 3/recipe)
 * - BR-13: Login failure limit (5 fails/15 min/IP)
 */

const rateLimit = require('express-rate-limit');

// In-Memory stores for custom tracking & resetting
const requestCounts = new Map(); // key -> [{ timestamp }]
const regenCounts = new Map();   // key -> count

/**
 * Reset rate limit and regeneration stores (for tests)
 */
function resetRateLimits() {
  requestCounts.clear();
  regenCounts.clear();
}

/**
 * Middleware: Tiered Recipe Generation Quota (F-09, KF-08, HA-01, HA-02)
 * Guest: 5 req/min per IP
 * Logged-in: 10 req/min per account
 */
function recipeGenerateLimiter(req, res, next) {
  const isAuth = !!(req.session && req.session.user && req.session.user.id);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 menit

  const key = isAuth
    ? `user_${req.session.user.id}`
    : `guest_${req.ip || req.connection.remoteAddress || '127.0.0.1'}`;

  const maxAllowed = isAuth ? 10 : 5;

  let timestamps = requestCounts.get(key) || [];
  // Prune timestamps older than windowMs
  timestamps = timestamps.filter(ts => now - ts < windowMs);

  if (timestamps.length >= maxAllowed) {
    const message = isAuth
      ? 'Terlalu banyak permintaan, coba lagi dalam 1 menit.'
      : 'Batas permintaan tamu tercapai. Coba lagi dalam 1 menit, atau masuk untuk kuota 10 per menit.';
    return res.status(429).json({ pesan: message });
  }

  timestamps.push(now);
  requestCounts.set(key, timestamps);
  next();
}

/**
 * Middleware: Tiered Regeneration ("Buat Ulang") Quota (F-09, KF-14, HA-03, HA-04)
 * Guest: Max 1 regeneration per recipe
 * Logged-in: Max 3 regenerations per recipe
 */
function recipeRegenLimiter(req, res, next) {
  const hindari = req.body && Array.isArray(req.body.hindari) ? req.body.hindari : [];

  // If not a regeneration request (initial generation), proceed
  if (hindari.length === 0) {
    return next();
  }

  const isAuth = !!(req.session && req.session.user && req.session.user.id);
  const rootRecipe = String(hindari[0] || '').trim().toLowerCase();
  const userKey = isAuth
    ? `user_${req.session.user.id}`
    : `guest_${req.ip || req.connection.remoteAddress || '127.0.0.1'}`;

  const regenKey = `${userKey}:${rootRecipe}`;
  const currentCount = regenCounts.get(regenKey) || 0;

  if (!isAuth) {
    // Guest: Maximum 1 regeneration allowed
    if (currentCount >= 1 || hindari.length > 1) {
      return res.status(429).json({
        pesan: 'Masuk untuk membuat hingga 3 variasi.'
      });
    }
  } else {
    // Logged-in: Maximum 3 regenerations allowed
    if (currentCount >= 3 || hindari.length > 3) {
      return res.status(429).json({
        pesan: 'Batas 3 variasi untuk resep ini tercapai.'
      });
    }
  }

  // Hook res.json to increment count on successful recipe generation (HTTP 200)
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode === 200 && body && body.resep) {
      regenCounts.set(regenKey, currentCount + 1);
    }
    return originalJson(body);
  };

  next();
}

/**
 * Middleware: Login Fail Limiter (BR-13)
 * 5 failed logins per 15 min per IP
 */
const loginFailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      pesan: 'Terlalu banyak percobaan login gagal dari alamat IP ini. Silakan coba lagi dalam 15 menit.'
    });
  }
});

module.exports = {
  recipeGenerateLimiter,
  recipeRegenLimiter,
  loginFailLimiter,
  resetRateLimits
};
