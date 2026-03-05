const express = require('express');
const router = express.Router();
const cookedItemController = require('../controllers/cookedItemController');
const auth = require('../middleware/auth');

router.get('/', auth, cookedItemController.getAll);
router.post('/', auth, cookedItemController.create);
router.put('/:id', auth, cookedItemController.updateStatus);
router.delete('/:id', auth, cookedItemController.delete);

module.exports = router;
