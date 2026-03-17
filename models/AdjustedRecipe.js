const mongoose = require('mongoose');

const adjustedRecipeSchema = new mongoose.Schema({
  originalRecipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  title: { type: String, required: true },
  originalIngredients: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    name: String,
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }],
  adjustedIngredients: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    name: String,
    originalQuantity: { type: Number, required: true },
    adjustedQuantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }],
  cookedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CookedItem' },
  adjustmentReason: { type: String, default: 'Custom order requirements' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AdjustedRecipe', adjustedRecipeSchema);