const CookedItem = require('../models/CookedItem');
const FinishedGood = require('../models/FinishedGood');
const SemiFinishedGood = require('../models/SemiFinishedGood');
const Recipe = require('../models/Recipe');
const Inventory = require('../models/Inventory');

exports.getAll = async (req, res) => {
  try {
    const items = await CookedItem.find({ userId: req.user.userId }).populate('ingredients.inventoryId');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { recipeId, quantity } = req.body;
    const recipe = await Recipe.findById(recipeId).populate('ingredients.inventoryId');
    
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Check ingredients availability
    for (const ing of recipe.ingredients) {
      if (!ing.inventoryId) {
        return res.status(400).json({ error: `Ingredient not found in inventory` });
      }
      const requiredQty = ing.quantity * (quantity || 1);
      if (ing.inventoryId.quantity < requiredQty) {
        return res.status(400).json({ error: `Not enough ${ing.inventoryId.name}. Need ${requiredQty}, have ${ing.inventoryId.quantity}` });
      }
    }

    // Deduct ingredients from inventory
    for (const ing of recipe.ingredients) {
      const requiredQty = ing.quantity * (quantity || 1);
      await Inventory.findByIdAndUpdate(ing.inventoryId._id, {
        $inc: { quantity: -requiredQty }
      });
    }

    // Create cooked item
    const cookedItem = await CookedItem.create({
      recipeId: recipe._id,
      title: recipe.title,
      quantity: quantity || 1,
      ingredients: recipe.ingredients.map(ing => ({
        inventoryId: ing.inventoryId._id,
        name: ing.inventoryId.name,
        quantity: ing.quantity * (quantity || 1),
        unit: ing.unit
      })),
      status: 'cooking',
      userId: req.user.userId
    });

    const populated = await CookedItem.findById(cookedItem._id).populate('ingredients.inventoryId');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, restockedIngredients } = req.body;
    const item = await CookedItem.findById(req.params.id);
    
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (status === 'finished') {
      const finishedGood = await FinishedGood.create({
        recipeId: item.recipeId,
        title: item.title,
        quantity: item.quantity,
        ingredients: item.ingredients,
        userId: item.userId
      });
      
      item.status = 'finished';
      await item.save();
      return res.json(finishedGood);
    }

    if (status === 'semi-finished' && restockedIngredients) {
      for (const ing of item.ingredients) {
        if (restockedIngredients.includes(ing.inventoryId.toString())) {
          await Inventory.findByIdAndUpdate(ing.inventoryId, {
            $inc: { quantity: ing.quantity }
          });
        }
      }
      
      const semiFinishedGood = await SemiFinishedGood.create({
        recipeId: item.recipeId,
        title: item.title,
        quantity: item.quantity,
        ingredients: item.ingredients,
        restockedIngredients: restockedIngredients,
        userId: item.userId
      });
      
      item.status = 'semi-finished';
      item.restockedIngredients = restockedIngredients;
      await item.save();
      return res.json(semiFinishedGood);
    }

    res.status(400).json({ error: 'Invalid status' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await CookedItem.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
