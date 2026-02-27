const RawMaterial = require('../models/RawMaterial');
const Inventory = require('../models/Inventory');

exports.getAll = async (req, res) => {
  const items = await RawMaterial.find({ userId: req.user.userId }).populate('ingredients.inventoryId');
  res.json(items);
};

exports.getOne = async (req, res) => {
  const item = await RawMaterial.findById(req.params.id).populate('ingredients.inventoryId');
  res.json(item);
};

exports.create = async (req, res) => {
  const item = await RawMaterial.create({ ...req.body, userId: req.user.userId });
  const populated = await RawMaterial.findById(item._id).populate('ingredients.inventoryId');
  res.status(201).json(populated);
};

exports.update = async (req, res) => {
  const item = await RawMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('ingredients.inventoryId');
  res.json(item);
};

exports.delete = async (req, res) => {
  await RawMaterial.findByIdAndDelete(req.params.id);
  res.status(204).send();
};
