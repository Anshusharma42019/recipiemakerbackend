const Loss = require('../models/Loss');
const Recipe = require('../models/Recipe');
const CookedItem = require('../models/CookedItem');
const Inventory = require('../models/Inventory');

// Get all loss records
exports.getAll = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const userRole = req.user?.role;
    const userDepartmentId = req.user?.departmentId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    let losses;
    
    if (userRole === 'Admin') {
      // Admin can see all loss records
      losses = await Loss.find({})
        .populate({
          path: 'recipeId',
          select: 'title sellingPrice departmentId',
          populate: {
            path: 'departmentId',
            select: 'name code'
          }
        })
        .populate('ingredients.inventoryId', 'name')
        .sort({ createdAt: -1 });
    } else if (userDepartmentId) {
      // Non-admin users see loss records from their department
      losses = await Loss.find({})
        .populate({
          path: 'recipeId',
          select: 'title sellingPrice departmentId',
          populate: {
            path: 'departmentId',
            select: 'name code'
          }
        })
        .populate('ingredients.inventoryId', 'name')
        .sort({ createdAt: -1 });
      
      // Filter by department after population
      losses = losses.filter(loss => {
        // If recipe is not found or doesn't have department, exclude it for non-admin users
        if (!loss.recipeId || !loss.recipeId.departmentId) {
          return false;
        }
        return loss.recipeId.departmentId._id.toString() === userDepartmentId.toString();
      });
    } else {
      // Fallback to user's own records if no department
      losses = await Loss.find({ userId: userId })
        .populate({
          path: 'recipeId',
          select: 'title sellingPrice departmentId',
          populate: {
            path: 'departmentId',
            select: 'name code'
          }
        })
        .populate('ingredients.inventoryId', 'name')
        .sort({ createdAt: -1 });
    }
    
    res.json(losses);
  } catch (error) {
    console.error('Error in getAll losses:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single loss record
exports.getOne = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const loss = await Loss.findOne({ _id: req.params.id, userId: userId })
      .populate('recipeId', 'title sellingPrice')
      .populate('ingredients.inventoryId', 'name');
    
    if (!loss) {
      return res.status(404).json({ error: 'Loss record not found' });
    }
    
    res.json(loss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create loss record from cooking item
exports.createFromCooking = async (req, res) => {
  try {
    const { cookedItemId, lossType, lossReason, lostIngredients, lostQuantities, notes, remakeWithFreshIngredients, isCompleteLoss } = req.body;
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    // Get the cooked item
    const cookedItem = await CookedItem.findById(cookedItemId);
    if (!cookedItem) {
      return res.status(404).json({ error: 'Cooked item not found' });
    }
    
    // Get the recipe for pricing
    const recipe = await Recipe.findById(cookedItem.recipeId).populate('departmentId');
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Calculate loss value
    let lossValue = 0;
    if (isCompleteLoss) {
      lossValue = (recipe.sellingPrice || 0) * cookedItem.quantity;
    } else if (lostQuantities) {
      // For partial loss, calculate based on lost ingredient quantities
      const lostIngredientCount = Object.keys(lostQuantities).filter(key => lostQuantities[key] > 0).length;
      const totalIngredientCount = cookedItem.ingredients.length;
      const lossPercentage = lostIngredientCount / totalIngredientCount;
      lossValue = (recipe.sellingPrice || 0) * cookedItem.quantity * lossPercentage;
    }
    
    // Prepare ingredients with loss information
    const ingredientsWithLoss = cookedItem.ingredients.map(ing => {
      const ingId = ing.inventoryId._id || ing.inventoryId;
      const lostQuantity = lostQuantities && lostQuantities[ingId] ? lostQuantities[ingId] : 0;
      
      return {
        inventoryId: ingId,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        lostQuantity: lostQuantity
      };
    });
    
    // Create loss record
    const loss = new Loss({
      recipeId: cookedItem.recipeId,
      recipeTitle: cookedItem.title,
      originalQuantity: cookedItem.quantity,
      lossType,
      lossReason,
      lossValue,
      ingredients: ingredientsWithLoss,
      lostIngredients: Object.keys(lostQuantities || {}).filter(key => lostQuantities[key] > 0),
      lostQuantities: lostQuantities || {},
      userId: userId,
      lossDate: new Date(),
      notes
    });
    
    await loss.save();
    
    // Populate the saved loss record with recipe and department info
    const populatedLoss = await Loss.findById(loss._id)
      .populate({
        path: 'recipeId',
        select: 'title sellingPrice departmentId',
        populate: {
          path: 'departmentId',
          select: 'name code'
        }
      })
      .populate('ingredients.inventoryId', 'name');
    
    // If user wants to remake with fresh ingredients
    if (remakeWithFreshIngredients) {
      // Create new cooking item with same recipe and quantity
      const newCookedItem = new CookedItem({
        recipeId: cookedItem.recipeId,
        title: cookedItem.title,
        quantity: cookedItem.quantity,
        ingredients: cookedItem.ingredients.map(ing => ({
          inventoryId: ing.inventoryId._id || ing.inventoryId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit
        })),
        status: 'cooking',
        userId: userId
      });
      
      await newCookedItem.save();
      
      // Deduct fresh ingredients from inventory and create stock logs
      const StockLog = require('../models/StockLog');
      
      for (const ingredient of cookedItem.ingredients) {
        const inventoryId = ingredient.inventoryId._id || ingredient.inventoryId;
        const quantityToDeduct = lostQuantities && lostQuantities[inventoryId] 
          ? lostQuantities[inventoryId] 
          : ingredient.quantity;
        
        // Get current inventory before update
        const currentInventory = await Inventory.findById(inventoryId);
        if (!currentInventory) continue;
        
        const previousStock = currentInventory.quantity;
        const newStock = previousStock - quantityToDeduct;
        
        // Update inventory
        await Inventory.findByIdAndUpdate(
          inventoryId,
          { $inc: { quantity: -quantityToDeduct } },
          { new: true }
        );
        
        // Create stock log entry for the fresh ingredient usage
        await StockLog.create({
          itemId: inventoryId,
          itemName: ingredient.name,
          action: 'Used',
          quantity: quantityToDeduct,
          previousStock: previousStock,
          newStock: newStock,
          departmentId: recipe.departmentId?._id,
          departmentName: recipe.departmentId?.name
        });
      }
    }
    
    // Handle cooked item based on loss type and remake decision
    if (isCompleteLoss && !remakeWithFreshIngredients) {
      // For complete loss without remake, remove the cooking item entirely
      await CookedItem.findByIdAndDelete(cookedItemId);
    } else if (remakeWithFreshIngredients) {
      // When remaking with fresh ingredients, remove the original item
      await CookedItem.findByIdAndDelete(cookedItemId);
    } else {
      // For partial loss without remake, keep the item but link to loss record
      cookedItem.lossRecordId = loss._id;
      await cookedItem.save();
    }
    
    res.status(201).json(populatedLoss);
  } catch (error) {
    console.error('Error in createFromCooking:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create manual loss record
exports.create = async (req, res) => {
  try {
    const { recipeId, recipeTitle, originalQuantity, lossType, lossReason, ingredients, lossValue, notes } = req.body;
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const loss = new Loss({
      recipeId,
      recipeTitle,
      originalQuantity,
      lossType,
      lossReason,
      lossValue: lossValue || 0,
      ingredients: ingredients || [],
      userId: userId,
      notes
    });
    
    await loss.save();
    res.status(201).json(loss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update loss record
exports.update = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const loss = await Loss.findOneAndUpdate(
      { _id: req.params.id, userId: userId },
      req.body,
      { new: true }
    ).populate('recipeId', 'title sellingPrice')
     .populate('ingredients.inventoryId', 'name');
    
    if (!loss) {
      return res.status(404).json({ error: 'Loss record not found' });
    }
    
    res.json(loss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete loss record
exports.delete = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const loss = await Loss.findOneAndDelete({ _id: req.params.id, userId: userId });
    
    if (!loss) {
      return res.status(404).json({ error: 'Loss record not found' });
    }
    
    // If there's a linked cooked item, remove the loss record reference
    const linkedCookedItem = await CookedItem.findOne({ lossRecordId: loss._id });
    if (linkedCookedItem) {
      linkedCookedItem.lossRecordId = undefined;
      await linkedCookedItem.save();
    }
    
    res.json({ message: 'Loss record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get loss statistics
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    let dateFilter = { userId: userId };
    if (startDate && endDate) {
      dateFilter.lossDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const stats = await Loss.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalLossValue: { $sum: '$lossValue' },
          totalLossItems: { $sum: 1 },
          completeLosses: {
            $sum: { $cond: [{ $eq: ['$lossType', 'complete'] }, 1, 0] }
          },
          partialLosses: {
            $sum: { $cond: [{ $eq: ['$lossType', 'partial'] }, 1, 0] }
          },
          reasonBreakdown: {
            $push: '$lossReason'
          }
        }
      }
    ]);
    
    const reasonStats = await Loss.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$lossReason',
          count: { $sum: 1 },
          totalValue: { $sum: '$lossValue' }
        }
      }
    ]);
    
    res.json({
      summary: stats[0] || {
        totalLossValue: 0,
        totalLossItems: 0,
        completeLosses: 0,
        partialLosses: 0
      },
      reasonBreakdown: reasonStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};