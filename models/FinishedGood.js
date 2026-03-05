const mongoose = require('mongoose');

const finishedGoodSchema = new mongoose.Schema({
  recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  title: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  ingredients: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    name: String,
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FinishedGood', finishedGoodSchema);
