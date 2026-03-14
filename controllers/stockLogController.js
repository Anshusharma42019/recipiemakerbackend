const StockLog = require('../models/StockLog');
const Inventory = require('../models/Inventory');

exports.getAll = async (req, res) => {
  try {
    const logs = await StockLog.find()
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching stock logs:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (itemId, itemName, action, quantity, previousStock, newStock, departmentId = null, departmentName = null) => {
  try {
    await StockLog.create({
      itemId,
      itemName,
      action,
      quantity,
      previousStock,
      newStock,
      departmentId,
      departmentName
    });
  } catch (error) {
    console.error('Error creating stock log:', error);
  }
};

// Migration function to update existing stock logs with department information
exports.updateExistingLogs = async (req, res) => {
  try {
    const stockLogs = await StockLog.find({ 
      $or: [
        { departmentId: { $exists: false } },
        { departmentId: null },
        { departmentName: { $exists: false } },
        { departmentName: null }
      ]
    });
    
    let updated = 0;
    
    for (const log of stockLogs) {
      try {
        const inventory = await Inventory.findById(log.itemId).populate('departmentId', 'name code');
        if (inventory && inventory.departmentId) {
          await StockLog.findByIdAndUpdate(log._id, {
            departmentId: inventory.departmentId._id,
            departmentName: inventory.departmentId.name
          });
          updated++;
        }
      } catch (error) {
        console.error(`Error updating stock log ${log._id}:`, error);
      }
    }
    
    res.json({ 
      message: `Updated ${updated} stock logs with department information`,
      totalProcessed: stockLogs.length,
      updated
    });
  } catch (error) {
    console.error('Error updating stock logs:', error);
    res.status(500).json({ error: error.message });
  }
};