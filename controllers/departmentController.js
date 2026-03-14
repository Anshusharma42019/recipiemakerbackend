const Department = require('../models/Department');

// Get all departments
exports.getAll = async (req, res) => {
  try {
    // For filters and general use, return all active departments
    // Don't filter by userId for department listings
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    console.log('Departments found:', departments.length);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single department
exports.getOne = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const department = await Department.findOne({ _id: req.params.id, userId: userId });
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create department
exports.create = async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const department = new Department({
      name,
      code: code.toUpperCase(),
      description,
      isActive: isActive !== undefined ? isActive : true,
      userId: userId
    });
    
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ error: `Department ${field} '${value}' already exists` });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update department
exports.update = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    
    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, userId: userId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ error: `Department ${field} '${value}' already exists` });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete department
exports.delete = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const department = await Department.findOneAndDelete({ _id: req.params.id, userId: userId });
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle department status
exports.toggleStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }
    
    const department = await Department.findOne({ _id: req.params.id, userId: userId });
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    department.isActive = !department.isActive;
    await department.save();
    
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};