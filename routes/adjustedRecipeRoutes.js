const express = require('express');
const router = express.Router();
const adjustedRecipeController = require('../controllers/adjustedRecipeController');
const auth = require('../middleware/auth');

// Get all adjusted recipes
router.get('/', auth, adjustedRecipeController.getAll);

// Get adjusted recipe by ID
router.get('/:id', auth, adjustedRecipeController.getById);

// Get adjusted recipes by original recipe ID
router.get('/recipe/:recipeId', auth, adjustedRecipeController.getByRecipeId);

// Get adjustment statistics
router.get('/stats/summary', auth, adjustedRecipeController.getStats);

// Delete adjusted recipe
router.delete('/:id', auth, adjustedRecipeController.delete);

module.exports = router;