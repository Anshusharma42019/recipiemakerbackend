const express = require('express');
const router = express.Router();
const stockLogController = require('../controllers/stockLogController');
const auth = require('../middleware/auth');

router.get('/', auth, stockLogController.getAll);
router.post('/update-departments', auth, stockLogController.updateExistingLogs);

module.exports = router;