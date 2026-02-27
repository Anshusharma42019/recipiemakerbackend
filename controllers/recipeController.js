const Recipe = require('../models/Recipe');
const Inventory = require('../models/Inventory');

exports.getAll = async (req, res) => {
  const recipes = await Recipe.find().populate('ingredients.inventoryId');
  res.json(recipes);
};

exports.getOne = async (req, res) => {
  const recipe = await Recipe.findById(req.params.id).populate('ingredients.inventoryId');
  res.json(recipe);
};

exports.create = async (req, res) => {
  const recipe = await Recipe.create({ ...req.body, userId: req.user.userId });
  const populated = await Recipe.findById(recipe._id).populate('ingredients.inventoryId');
  res.status(201).json(populated);
};

exports.update = async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(recipe);
};

exports.delete = async (req, res) => {
  await Recipe.findByIdAndDelete(req.params.id);
  res.status(204).send();
};

exports.cook = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('ingredients.inventoryId');
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Check if all ingredients are available
    for (const ing of recipe.ingredients) {
      if (ing.inventoryId.quantity < ing.quantity) {
        return res.status(400).json({ error: `Not enough ${ing.inventoryId.name}. Need ${ing.quantity}, have ${ing.inventoryId.quantity}` });
      }
    }

    // Deduct ingredients from inventory
    for (const ing of recipe.ingredients) {
      await Inventory.findByIdAndUpdate(ing.inventoryId._id, {
        $inc: { quantity: -ing.quantity }
      });
    }

    res.json({ message: 'Recipe cooked successfully', recipe });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
