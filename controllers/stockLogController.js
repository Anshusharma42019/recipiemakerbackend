const StockLog = require('../models/StockLog');

exports.getAll = async (req, res) => {
  try {
    const logs = await StockLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (itemId, itemName, action, quantity, previousStock, newStock) => {
  try {
    await StockLog.create({
      itemId,
      itemName,
      action,
      quantity,
      previousStock,
      newStock
    });
  } catch (error) {
    console.error('Error creating stock log:', error);
  }
};