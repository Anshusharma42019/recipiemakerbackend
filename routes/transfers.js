const express = require('express');
const router = express.Router();
const { transferItem, getTransfers, getTransferById, getTransferStats } = require('../controllers/transferController');
const auth = require('../middleware/auth');

// Transfer item between departments
router.post('/inventory/:itemId/transfer', auth, transferItem);

// Get all transfers
router.get('/transfers', auth, getTransfers);

// Get transfer statistics
router.get('/transfers/stats', auth, getTransferStats);

// Get transfer by ID
router.get('/transfers/:id', auth, getTransferById);

module.exports = router;