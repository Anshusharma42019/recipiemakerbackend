const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Department routes
router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getOne);
router.post('/', departmentController.create);
router.put('/:id', departmentController.update);
router.delete('/:id', departmentController.delete);
router.patch('/:id/toggle-status', departmentController.toggleStatus);

module.exports = router;