const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  fromDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  toDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true
  },
  transferredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transferDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  notes: {
    type: String,
    default: ''
  },
  originalQuantity: {
    type: Number,
    required: true
  },
  remainingQuantity: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
transferSchema.index({ fromDepartmentId: 1, toDepartmentId: 1 });
transferSchema.index({ transferDate: -1 });
transferSchema.index({ itemId: 1 });

module.exports = mongoose.model('Transfer', transferSchema);