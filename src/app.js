/**
 * Smart Recipe Generator - Express Application
 * Implements security headers, sessions, routes, static files, and error handling
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const savedRecipeRoutes = require('./routes/savedRecipes');

const app = express();

// Di hosting (mis. Zeabur) permintaan lewat 1 proxy: pakai IP asli pengunjung
// untuk kuota tamu, dan izinkan cookie secure saat NODE_ENV=production.
app.set('trust proxy', 1);

// Security Headers (NFR-12, NFR-13)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Management (NFR-13: HttpOnly, SameSite=Lax, 60 min expiration)
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  name: 'smart_recipe_sid',
  secret: process.env.SESSION_SECRET || 'smart_recipe_session_secret_key_123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 60 * 60 * 1000 // 60 menit tidak aktif
  }
}));

// Serve static assets
const publicPath = path.join(__dirname, '../public');
const sharedPath = path.join(__dirname, '../shared');

app.use(express.static(publicPath));
app.use('/shared', express.static(sharedPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes);
app.use('/api/recipes/history', savedRecipeRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/saved-recipes', savedRecipeRoutes);

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ pesan: 'Endpoint API tidak ditemukan' });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  const status = err.status || 500;
  const message = status === 500
    ? 'Terjadi kesalahan internal pada server'
    : (err.message || 'Terjadi kesalahan');
  res.status(status).json({ pesan: message });
});

module.exports = app;
