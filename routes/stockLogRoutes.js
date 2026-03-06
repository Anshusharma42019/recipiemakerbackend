const express = require('express');
const router = express.Router();
const stockLogController = require('../controllers/stockLogController');
const auth = require('../middleware/auth');

router.get('/', auth, stockLogController.getAll);

module.exports = router;