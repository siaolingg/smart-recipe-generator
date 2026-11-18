/**
 * Smart Recipe Generator - Recipe Routes
 * Implements F-04, F-05, F-09 (Tiered Generation & Regeneration Limits)
 */

const express = require('express');
const router = express.Router();
const RecipeController = require('../controllers/recipeController');
const { recipeGenerateLimiter, recipeRegenLimiter } = require('../middleware/rateLimit');

router.post('/generate', recipeGenerateLimiter, recipeRegenLimiter, RecipeController.generate);

module.exports = router;
