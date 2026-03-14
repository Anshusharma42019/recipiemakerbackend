const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { email, password, name, role, departmentId } = req.body;
    console.log('Register request:', { email, name, role, departmentId });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = { 
      email, 
      password: hashedPassword, 
      name, 
      role: role || 'Staff'
    };
    
    // Only add departmentId for non-admin users (Staff, Chef, and Waiter)
    if (role !== 'Admin' && departmentId) {
      userData.departmentId = departmentId;
    }
    
    console.log('Creating user with data:', userData);
    const user = await User.create(userData);
    console.log('User created successfully:', user._id);
    
    const tokenPayload = { userId: user._id, role: user.role };
    if (user.departmentId) {
      tokenPayload.departmentId = user.departmentId;
    }
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        departmentId: user.departmentId,
        isActive: user.isActive 
      } 
    });
  } catch (error) {
    console.error('Register error details:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    const user = await User.findOne({ email }).populate('departmentId', 'name code');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isActive === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    console.log('Login successful for user:', user._id, 'Role:', user.role, 'Department:', user.departmentId?._id);
    
    const tokenPayload = { userId: user._id, role: user.role };
    if (user.departmentId) {
      tokenPayload.departmentId = user.departmentId._id;
    }
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        departmentId: user.departmentId
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password changed successfully' });
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').populate('departmentId', 'name code');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, departmentId } = req.body;
    
    const updateData = { name, email, role, isActive };
    
    // Only add departmentId for non-admin users
    if (role !== 'Admin') {
      updateData.departmentId = departmentId || null;
    } else {
      // Remove departmentId for admin users
      updateData.departmentId = null;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    ).populate('departmentId', 'name code');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: 'User status updated', isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
