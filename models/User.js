const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, default: 'Staff', enum: ['Staff', 'Chef', 'Waiter', 'Admin'] },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
