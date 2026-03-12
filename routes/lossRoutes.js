const express = require('express');
const router = express.Router();
const lossController = require('../controllers/lossController');
const auth = require('../middleware/auth');

// Get all loss records
router.get('/', auth, lossController.getAll);

// Get loss statistics
router.get('/stats', auth, lossController.getStats);

// Get single loss record
router.get('/:id', auth, lossController.getOne);

// Create loss record from cooking item
router.post('/from-cooking', auth, lossController.createFromCooking);

// Create manual loss record
router.post('/', auth, lossController.create);

// Update loss record
router.put('/:id', auth, lossController.update);

// Delete loss record
router.delete('/:id', auth, lossController.delete);

module.exports = router;