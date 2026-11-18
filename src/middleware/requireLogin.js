/**
 * Smart Recipe Generator - requireLogin Middleware
 * Ensures user is authenticated before accessing protected routes
 * Implements NFR-12, PRD 3.0 Tabel 7 & HA-09
 */

function requireLogin(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }
  return res.status(401).json({
    pesan: 'Masuk untuk memakai riwayat, catatan, dan profil pantangan.'
  });
}

module.exports = requireLogin;
