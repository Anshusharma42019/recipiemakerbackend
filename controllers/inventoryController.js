const Inventory = require('../models/Inventory');

exports.getAll = async (req, res) => {
  const items = await Inventory.find({ userId: req.user.userId });
  res.json(items);
};

exports.getOne = async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  res.json(item);
};

exports.create = async (req, res) => {
  const item = await Inventory.create({ ...req.body, userId: req.user.userId });
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
};

exports.delete = async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id);
  res.status(204).send();
};
