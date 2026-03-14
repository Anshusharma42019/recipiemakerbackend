const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  itemName: { type: String, required: true },
  action: { type: String, enum: ['Added', 'Used', 'Restocked'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  departmentName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockLog', stockLogSchema);