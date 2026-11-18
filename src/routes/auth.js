/**
 * Smart Recipe Generator - Auth Routes
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { loginFailLimiter } = require('../middleware/rateLimit');
const requireLogin = require('../middleware/requireLogin');

router.post('/register', AuthController.register);
router.post('/login', loginFailLimiter, AuthController.login);
router.post('/logout', requireLogin, AuthController.logout);
router.get('/me', AuthController.me);
router.get('/profile/restrictions', requireLogin, AuthController.getRestrictions);
router.put('/profile/restrictions', requireLogin, AuthController.updateRestrictions);

module.exports = router;
