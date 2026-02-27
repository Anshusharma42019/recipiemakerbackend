const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

router.get('/', auth, inventoryController.getAll);
router.get('/:id', auth, inventoryController.getOne);
router.post('/', auth, inventoryController.create);
router.put('/:id', auth, inventoryController.update);
router.delete('/:id', auth, inventoryController.delete);

module.exports = router;
