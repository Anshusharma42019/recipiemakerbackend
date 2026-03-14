const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  productCode: { type: String, unique: true, sparse: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true },
  price: { type: Number, default: 0 },
  category: { type: String },
  minStock: { type: Number, default: 10 },
  supplier: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

inventorySchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
