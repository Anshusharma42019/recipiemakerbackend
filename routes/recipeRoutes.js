const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const auth = require('../middleware/auth');

router.get('/', recipeController.getAll);
router.get('/:id', recipeController.getOne);
router.post('/', auth, recipeController.create);
router.put('/:id', auth, recipeController.update);
router.delete('/:id', auth, recipeController.delete);

module.exports = router;
