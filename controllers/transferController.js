const Transfer = require('../models/Transfer');
const Inventory = require('../models/Inventory');
const Department = require('../models/Department');
const StockLog = require('../models/StockLog');

// Transfer item between departments
const transferItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { toDepartmentId, quantity, notes } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!toDepartmentId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Please provide valid department and quantity' });
    }

    // Find the item
    const item = await Inventory.findById(itemId).populate('departmentId');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user has permission to transfer from this department
    if (req.user.role !== 'Admin' && req.user.departmentId.toString() !== item.departmentId._id.toString()) {
      return res.status(403).json({ message: 'You can only transfer items from your department' });
    }

    // Check if sufficient quantity is available
    if (item.quantity < quantity) {
      return res.status(400).json({ 
        message: `Insufficient quantity. Available: ${item.quantity}, Requested: ${quantity}` 
      });
    }

    // Check if transferring to the same department
    if (item.departmentId._id.toString() === toDepartmentId) {
      return res.status(400).json({ message: 'Cannot transfer to the same department' });
    }

    // Find the target department
    const toDepartment = await Department.findById(toDepartmentId);
    if (!toDepartment) {
      return res.status(404).json({ message: 'Target department not found' });
    }

    // Check if item already exists in target department
    let targetItem;
    
    // First, try to find by productCode if it exists
    if (item.productCode && item.productCode.trim() !== '') {
      targetItem = await Inventory.findOne({
        productCode: item.productCode,
        departmentId: toDepartmentId
      });
    }
    
    // If not found by productCode, search by name and department
    if (!targetItem) {
      targetItem = await Inventory.findOne({
        name: item.name,
        departmentId: toDepartmentId
      });
    }
    
    // If still not found, search by name, department, and unit
    if (!targetItem) {
      targetItem = await Inventory.findOne({
        name: item.name,
        departmentId: toDepartmentId,
        unit: item.unit
      });
    }

    // Start transaction
    const session = await Inventory.startSession();
    session.startTransaction();

    try {
      // Reduce quantity from source item
      const originalQuantity = item.quantity;
      item.quantity -= quantity;
      await item.save({ session });

      // Add to target department
      if (targetItem) {
        // Item exists in target department, increase quantity
        targetItem.quantity += quantity;
        await targetItem.save({ session });
      } else {
        // Final check before creating new item to prevent duplicate key error
        const finalCheck = await Inventory.findOne({
          name: item.name,
          departmentId: toDepartmentId
        });
        
        // Also check if there's ANY item with this name and userId combination
        const globalCheck = await Inventory.findOne({
          name: item.name,
          userId: item.userId || userId
        });
        
        if (finalCheck) {
          finalCheck.quantity += quantity;
          await finalCheck.save({ session });
          targetItem = finalCheck;
        } else if (globalCheck) {
          // If there's an item with same name+userId in a different department,
          // we need to either update it or create without userId to avoid constraint violation
          if (globalCheck.departmentId.toString() === toDepartmentId) {
            globalCheck.quantity += quantity;
            await globalCheck.save({ session });
            targetItem = globalCheck;
          } else {
            // Create new item without userId to avoid unique constraint violation
            const newItemData = {
              name: item.name,
              quantity: quantity,
              unit: item.unit,
              category: item.category,
              price: item.price,
              minStock: item.minStock,
              supplier: item.supplier,
              departmentId: toDepartmentId
              // Note: Not setting userId to avoid constraint violation
            };
            
            // Only add productCode if it exists, is not empty, and doesn't conflict IN THE TARGET DEPARTMENT
            if (item.productCode && item.productCode.trim() !== '') {
              // Check for productCode conflict ONLY in the target department
              const targetDeptProductCodeCheck = await Inventory.findOne({
                productCode: item.productCode,
                departmentId: toDepartmentId
              });
              
              if (!targetDeptProductCodeCheck) {
                newItemData.productCode = item.productCode;
              }
            }
            
            targetItem = new Inventory(newItemData);
            try {
              await targetItem.save({ session });
            } catch (saveError) {
              if (saveError.code === 11000 && saveError.message.includes('productCode')) {
                // Abort current transaction and start new one
                await session.abortTransaction();
                session.startTransaction();
                
                try {
                  // Re-do the source item update
                  const sourceItem = await Inventory.findById(itemId);
                  sourceItem.quantity -= quantity;
                  await sourceItem.save({ session });
                  
                  // Remove productCode and create new item
                  delete newItemData.productCode;
                  targetItem = new Inventory(newItemData);
                  await targetItem.save({ session });
                } catch (retryError) {
                  await session.abortTransaction();
                  throw retryError;
                }
              } else {
                throw saveError;
              }
            }
          }
        } else {
          // Create new item in target department
          const newItemData = {
            name: item.name,
            quantity: quantity,
            unit: item.unit,
            category: item.category,
            price: item.price,
            minStock: item.minStock,
            supplier: item.supplier,
            departmentId: toDepartmentId,
            userId: item.userId || userId
          };
          
          // Only add productCode if it exists and is not empty
          if (item.productCode && item.productCode.trim() !== '') {
            newItemData.productCode = item.productCode;
          }
          
          targetItem = new Inventory(newItemData);
          await targetItem.save({ session });
        }
      }

      // Create transfer record
      const transfer = new Transfer({
        itemId: item._id,
        itemName: item.name,
        fromDepartmentId: item.departmentId._id,
        toDepartmentId: toDepartmentId,
        quantity: quantity,
        unit: item.unit,
        transferredBy: userId,
        notes: notes || '',
        originalQuantity: originalQuantity,
        remainingQuantity: item.quantity
      });
      await transfer.save({ session });

      // Create stock logs
      const stockLogFrom = new StockLog({
        itemId: item._id,
        itemName: item.name,
        action: 'Used',
        quantity: quantity,
        previousStock: originalQuantity,
        newStock: item.quantity,
        departmentId: item.departmentId._id,
        departmentName: item.departmentId.name
      });
      await stockLogFrom.save({ session });

      const stockLogTo = new StockLog({
        itemId: targetItem._id,
        itemName: item.name,
        action: 'Added',
        quantity: quantity,
        previousStock: targetItem.quantity - quantity,
        newStock: targetItem.quantity,
        departmentId: toDepartmentId,
        departmentName: toDepartment.name
      });
      await stockLogTo.save({ session });

      await session.commitTransaction();

      // Populate transfer data for response
      const populatedTransfer = await Transfer.findById(transfer._id)
        .populate('fromDepartmentId', 'name code')
        .populate('toDepartmentId', 'name code')
        .populate('transferredBy', 'name email');

      res.status(200).json({
        message: 'Item transferred successfully',
        transfer: populatedTransfer
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Error transferring item', error: error.message });
  }
};

// Get all transfers
const getTransfers = async (req, res) => {
  try {
    const { departmentId, startDate, endDate, status } = req.query;
    let query = {};

    // Filter by department if user is not admin
    if (req.user.role !== 'Admin') {
      query.$or = [
        { fromDepartmentId: req.user.departmentId },
        { toDepartmentId: req.user.departmentId }
      ];
    } else if (departmentId) {
      query.$or = [
        { fromDepartmentId: departmentId },
        { toDepartmentId: departmentId }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      query.transferDate = {};
      if (startDate) query.transferDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transferDate.$lte = end;
      }
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const transfers = await Transfer.find(query)
      .populate('fromDepartmentId', 'name code')
      .populate('toDepartmentId', 'name code')
      .populate('transferredBy', 'name email')
      .populate('itemId', 'name productCode')
      .sort({ transferDate: -1 });

    res.status(200).json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ message: 'Error fetching transfers', error: error.message });
  }
};

// Get transfer by ID
const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await Transfer.findById(id)
      .populate('fromDepartmentId', 'name code')
      .populate('toDepartmentId', 'name code')
      .populate('transferredBy', 'name email')
      .populate('itemId', 'name productCode category');

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    // Check if user has permission to view this transfer
    if (req.user.role !== 'Admin') {
      const userDeptId = req.user.departmentId.toString();
      if (transfer.fromDepartmentId._id.toString() !== userDeptId && 
          transfer.toDepartmentId._id.toString() !== userDeptId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.status(200).json(transfer);
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({ message: 'Error fetching transfer', error: error.message });
  }
};

// Get transfer statistics
const getTransferStats = async (req, res) => {
  try {
    const { departmentId, period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let matchQuery = {
      transferDate: { $gte: startDate }
    };

    // Filter by department if user is not admin
    if (req.user.role !== 'Admin') {
      matchQuery.$or = [
        { fromDepartmentId: req.user.departmentId },
        { toDepartmentId: req.user.departmentId }
      ];
    } else if (departmentId) {
      matchQuery.$or = [
        { fromDepartmentId: departmentId },
        { toDepartmentId: departmentId }
      ];
    }

    const stats = await Transfer.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTransfers: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          avgQuantity: { $avg: '$quantity' }
        }
      }
    ]);

    const departmentStats = await Transfer.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$fromDepartmentId',
          transfersOut: { $sum: 1 },
          quantityOut: { $sum: '$quantity' }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department'
        }
      },
      {
        $project: {
          departmentName: { $arrayElemAt: ['$department.name', 0] },
          transfersOut: 1,
          quantityOut: 1
        }
      }
    ]);

    res.status(200).json({
      summary: stats[0] || { totalTransfers: 0, totalQuantity: 0, avgQuantity: 0 },
      departmentStats
    });
  } catch (error) {
    console.error('Error fetching transfer stats:', error);
    res.status(500).json({ message: 'Error fetching transfer statistics', error: error.message });
  }
};

module.exports = {
  transferItem,
  getTransfers,
  getTransferById,
  getTransferStats
};