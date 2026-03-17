const CookedItem = require('../models/CookedItem');
const FinishedGood = require('../models/FinishedGood');
const SemiFinishedGood = require('../models/SemiFinishedGood');
const AdjustedRecipe = require('../models/AdjustedRecipe');
const Recipe = require('../models/Recipe');
const Inventory = require('../models/Inventory');
const { create: createStockLog } = require('./stockLogController');

exports.getAll = async (req, res) => {
  try {
    const items = await CookedItem.find({})
      .populate({
        path: 'recipeId',
        select: 'title sellingPrice departmentId',
        populate: {
          path: 'departmentId',
          select: 'name code'
        }
      })
      .populate('ingredients.inventoryId');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { recipeId, quantity, ingredients, isAdjusted } = req.body;
    const recipe = await Recipe.findById(recipeId)
      .populate('ingredients.inventoryId')
      .populate('departmentId', 'name code');
    
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Use provided ingredients if adjusted, otherwise use recipe ingredients
    const ingredientsToUse = isAdjusted && ingredients ? ingredients : recipe.ingredients;
    
    // Check ingredients availability
    for (const ing of ingredientsToUse) {
      const inventoryItem = isAdjusted ? 
        await Inventory.findById(ing.inventoryId._id || ing.inventoryId) :
        ing.inventoryId;
      
      if (!inventoryItem) {
        return res.status(400).json({ error: `Ingredient not found in inventory` });
      }
      
      const requiredQty = ing.quantity * (quantity || 1);
      if (inventoryItem.quantity < requiredQty) {
        return res.status(400).json({ error: `Not enough ${inventoryItem.name}. Need ${requiredQty}, have ${inventoryItem.quantity}` });
      }
    }

    // Deduct ingredients from inventory
    for (const ing of ingredientsToUse) {
      const inventoryId = ing.inventoryId._id || ing.inventoryId;
      const requiredQty = ing.quantity * (quantity || 1);
      const oldInventory = await Inventory.findById(inventoryId);
      
      await Inventory.findByIdAndUpdate(inventoryId, {
        $inc: { quantity: -requiredQty }
      });
      
      await createStockLog(
        inventoryId, 
        oldInventory.name, 
        'Used', 
        requiredQty, 
        oldInventory.quantity, 
        oldInventory.quantity - requiredQty,
        recipe.departmentId?._id,
        recipe.departmentId?.name
      );
    }

    // Create cooked item
    const cookedItem = await CookedItem.create({
      recipeId: recipe._id,
      title: recipe.title,
      quantity: quantity || 1,
      ingredients: ingredientsToUse.map(ing => {
        const inventoryItem = isAdjusted ? 
          { _id: ing.inventoryId._id || ing.inventoryId, name: ing.inventoryId.name || ing.name } :
          ing.inventoryId;
        return {
          inventoryId: inventoryItem._id,
          name: inventoryItem.name,
          quantity: ing.quantity * (quantity || 1),
          unit: ing.unit
        };
      }),
      status: 'cooking',
      isAdjusted: isAdjusted || false
    });

    // If this is an adjusted recipe, store the adjustment details
    if (isAdjusted && ingredients) {
      await AdjustedRecipe.create({
        originalRecipeId: recipe._id,
        title: recipe.title,
        originalIngredients: recipe.ingredients.map(ing => ({
          inventoryId: ing.inventoryId._id,
          name: ing.inventoryId.name,
          quantity: ing.quantity,
          unit: ing.unit
        })),
        adjustedIngredients: ingredients.map(ing => ({
          inventoryId: ing.inventoryId._id || ing.inventoryId,
          name: ing.inventoryId.name || ing.name,
          originalQuantity: recipe.ingredients.find(orig => 
            (orig.inventoryId._id || orig.inventoryId).toString() === (ing.inventoryId._id || ing.inventoryId).toString()
          )?.quantity || 0,
          adjustedQuantity: ing.quantity,
          unit: ing.unit
        })),
        cookedItemId: cookedItem._id,
        userId: req.user?.id
      });
    }

    const populated = await CookedItem.findById(cookedItem._id)
      .populate('ingredients.inventoryId')
      .populate({
        path: 'recipeId',
        select: 'title sellingPrice departmentId',
        populate: {
          path: 'departmentId',
          select: 'name code'
        }
      });
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating cooked item:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, restockedIngredients, ingredientQuantities } = req.body;
    const item = await CookedItem.findById(req.params.id);
    
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Get recipe department info for stock logs
    const recipe = await Recipe.findById(item.recipeId).populate('departmentId', 'name code');

    if (status === 'finished') {
      const finishedGood = await FinishedGood.create({
        recipeId: item.recipeId,
        title: item.title,
        quantity: item.quantity,
        ingredients: item.ingredients
      });
      
      item.status = 'finished';
      await item.save();
      return res.json(finishedGood);
    }

    if (status === 'semi-finished' && restockedIngredients) {
      for (const ing of item.ingredients) {
        if (restockedIngredients.includes(ing.inventoryId.toString())) {
          // Use custom quantity if provided, otherwise use original quantity
          const restockQuantity = ingredientQuantities && ingredientQuantities[ing.inventoryId.toString()] 
            ? ingredientQuantities[ing.inventoryId.toString()] 
            : ing.quantity;
          
          const oldInventory = await Inventory.findById(ing.inventoryId);
          await Inventory.findByIdAndUpdate(ing.inventoryId, {
            $inc: { quantity: restockQuantity }
          });
          await createStockLog(
            ing.inventoryId, 
            ing.name, 
            'Restocked', 
            restockQuantity, 
            oldInventory.quantity, 
            oldInventory.quantity + restockQuantity,
            recipe?.departmentId?._id,
            recipe?.departmentId?.name
          );
        }
      }
      
      const semiFinishedGood = await SemiFinishedGood.create({
        recipeId: item.recipeId,
        title: item.title,
        quantity: item.quantity,
        ingredients: item.ingredients,
        restockedIngredients: restockedIngredients,
        ingredientQuantities: ingredientQuantities
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
