const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Ensure unique department name per user
departmentSchema.index({ name: 1, userId: 1 }, { unique: true });
departmentSchema.index({ code: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);