const Inventory = require('../models/Inventory');
const { create: createStockLog } = require('./stockLogController');

exports.getAll = async (req, res) => {
  const items = await Inventory.find({});
  res.json(items);
};

exports.getOne = async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  res.json(item);
};

exports.create = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    await createStockLog(item._id, item.name, 'Added', item.quantity, 0, item.quantity);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const oldItem = await Inventory.findById(req.params.id);
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (oldItem.quantity !== item.quantity) {
      const action = item.quantity > oldItem.quantity ? 'Added' : 'Used';
      const quantityChange = Math.abs(item.quantity - oldItem.quantity);
      await createStockLog(item._id, item.name, action, quantityChange, oldItem.quantity, item.quantity);
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id);
  res.status(204).send();
};
