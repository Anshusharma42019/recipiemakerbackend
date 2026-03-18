const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { email, password, name, role, departmentId } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = { 
      email, 
      password: hashedPassword, 
      name, 
      role: role || 'store'
    };
    
    // Only add departmentId for non-admin users
    if (role !== 'admin' && departmentId) {
      userData.departmentId = departmentId;
    }
    
    const user = await User.create(userData);
    
    const tokenPayload = { userId: user._id, role: user.role };
    if (user.departmentId) {
      tokenPayload.departmentId = user.departmentId;
    }
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
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
    
    // Ensure database connection is established
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        family: 4
      });
    }
    
    const user = await User.findOne({ email }).populate('departmentId', 'name code');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isActive === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    const tokenPayload = { userId: user._id, role: user.role };
    if (user.departmentId) {
      tokenPayload.departmentId = user.departmentId._id;
    }
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
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
    
    // More specific error messages
    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      res.status(500).json({ error: 'Database connection timeout', details: 'Please try again in a moment' });
    } else if (error.name === 'MongoServerSelectionError') {
      res.status(500).json({ error: 'Database server unavailable', details: 'Please check your connection' });
    } else {
      res.status(500).json({ error: 'Login failed', details: error.message });
    }
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

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      departmentId: departmentId || null
    };

    const user = new User(userData);
    await user.save();
    
    const userResponse = await User.findById(user._id)
      .populate('departmentId', 'name code')
      .select('-password');
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .populate('departmentId', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    const updateData = { name, email, role, departmentId: departmentId || null };

    // If password is provided, hash it
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('departmentId', 'name code').select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
