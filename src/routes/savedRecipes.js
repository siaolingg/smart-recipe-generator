/**
 * Smart Recipe Generator - Saved Recipes Routes
 * All routes require authenticated session (BR-14)
 */

const express = require('express');
const router = express.Router();
const SavedRecipeController = require('../controllers/savedRecipeController');
const requireLogin = require('../middleware/requireLogin');

// Protect all saved-recipes endpoints
router.use(requireLogin);

router.post('/', SavedRecipeController.create);
router.get('/', SavedRecipeController.list);
router.get('/:id', SavedRecipeController.detail);
router.put('/:id/note', SavedRecipeController.updateNote);
router.delete('/:id', SavedRecipeController.remove);

module.exports = router;
