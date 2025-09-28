const express = require('express');
const { login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');

const router = express.Router();

router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router; 