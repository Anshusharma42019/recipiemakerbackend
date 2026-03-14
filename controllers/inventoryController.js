const Inventory = require('../models/Inventory');
const { create: createStockLog } = require('./stockLogController');

exports.getAll = async (req, res) => {
  const items = await Inventory.find({}).populate('departmentId', 'name code');
  res.json(items);
};

exports.getOne = async (req, res) => {
  const item = await Inventory.findById(req.params.id).populate('departmentId', 'name code');
  res.json(item);
};

exports.create = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    const populated = await Inventory.findById(item._id).populate('departmentId', 'name code');
    await createStockLog(
      item._id, 
      item.name, 
      'Added', 
      item.quantity, 
      0, 
      item.quantity,
      populated.departmentId?._id,
      populated.departmentId?.name
    );
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const oldItem = await Inventory.findById(req.params.id).populate('departmentId', 'name code');
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('departmentId', 'name code');
    if (oldItem.quantity !== item.quantity) {
      const action = item.quantity > oldItem.quantity ? 'Added' : 'Used';
      const quantityChange = Math.abs(item.quantity - oldItem.quantity);
      await createStockLog(
        item._id, 
        item.name, 
        action, 
        quantityChange, 
        oldItem.quantity, 
        item.quantity,
        item.departmentId?._id,
        item.departmentId?.name
      );
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
