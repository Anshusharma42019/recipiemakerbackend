const mongoose = require('mongoose');

const lossSchema = new mongoose.Schema({
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  recipeTitle: {
    type: String,
    required: true
  },
  originalQuantity: {
    type: Number,
    required: true
  },
  lossType: {
    type: String,
    required: true
  },
  lossReason: {
    type: String,
    required: true
  },
  lossValue: {
    type: Number,
    default: 0
  },
  ingredients: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    name: String,
    quantity: Number,
    unit: String,
    lostQuantity: {
      type: Number,
      default: 0
    }
  }],
  lostIngredients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory'
  }],
  lostQuantities: {
    type: Map,
    of: Number
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lossDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Loss', lossSchema);