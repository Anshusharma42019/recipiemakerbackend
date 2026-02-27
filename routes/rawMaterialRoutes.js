const express = require('express');
const router = express.Router();
const rawMaterialController = require('../controllers/rawMaterialController');
const auth = require('../middleware/auth');

router.get('/', auth, rawMaterialController.getAll);
router.get('/:id', auth, rawMaterialController.getOne);
router.post('/', auth, rawMaterialController.create);
router.put('/:id', auth, rawMaterialController.update);
router.delete('/:id', auth, rawMaterialController.delete);

module.exports = router;
