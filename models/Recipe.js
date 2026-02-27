const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  ingredients: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }],
  instructions: String,
  cookTime: Number,
  servings: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

recipeSchema.index({ title: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Recipe', recipeSchema);
