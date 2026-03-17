const AdjustedRecipe = require('../models/AdjustedRecipe');

exports.getAll = async (req, res) => {
  try {
    const adjustedRecipes = await AdjustedRecipe.find({})
      .populate('originalRecipeId', 'title sellingPrice departmentId')
      .populate('originalIngredients.inventoryId', 'name')
      .populate('adjustedIngredients.inventoryId', 'name')
      .populate('cookedItemId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(adjustedRecipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const adjustedRecipe = await AdjustedRecipe.findById(req.params.id)
      .populate('originalRecipeId', 'title sellingPrice departmentId')
      .populate('originalIngredients.inventoryId', 'name')
      .populate('adjustedIngredients.inventoryId', 'name')
      .populate('cookedItemId')
      .populate('userId', 'name email');
    
    if (!adjustedRecipe) {
      return res.status(404).json({ error: 'Adjusted recipe not found' });
    }
    
    res.json(adjustedRecipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getByRecipeId = async (req, res) => {
  try {
    const adjustedRecipes = await AdjustedRecipe.find({ originalRecipeId: req.params.recipeId })
      .populate('originalRecipeId', 'title sellingPrice departmentId')
      .populate('originalIngredients.inventoryId', 'name')
      .populate('adjustedIngredients.inventoryId', 'name')
      .populate('cookedItemId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(adjustedRecipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const adjustedRecipe = await AdjustedRecipe.findByIdAndDelete(req.params.id);
    
    if (!adjustedRecipe) {
      return res.status(404).json({ error: 'Adjusted recipe not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get adjustment statistics
exports.getStats = async (req, res) => {
  try {
    const totalAdjusted = await AdjustedRecipe.countDocuments();
    const recentAdjusted = await AdjustedRecipe.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });
    
    const mostAdjustedRecipes = await AdjustedRecipe.aggregate([
      {
        $group: {
          _id: '$originalRecipeId',
          count: { $sum: 1 },
          title: { $first: '$title' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      totalAdjusted,
      recentAdjusted,
      mostAdjustedRecipes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};