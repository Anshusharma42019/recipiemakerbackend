const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  ingredients: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }],
  rawMaterials: [{
    rawMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }],
  instructions: String,
  cookTime: Number,
  servings: Number,
  sellingPrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['cooking', 'cooked', 'cancelled'], default: 'cooking' },
  restockedIngredients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }],
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
