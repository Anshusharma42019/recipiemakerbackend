const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  recipeName: { type: String, required: true },
  ingredients: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantity: { type: Number, required: true }
  }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

rawMaterialSchema.index({ recipeName: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
