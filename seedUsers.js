require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Clear existing users (optional - remove this in production)
    // await User.deleteMany({});

    const users = [
      {
        name: 'Admin User',
        email: 'admin@recipiemaker.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      },
      {
        name: 'Store Manager',
        email: 'store@recipiemaker.com',
        password: await bcrypt.hash('store123', 10),
        role: 'store'
      },
      {
        name: 'Kitchen Chef',
        email: 'kitchen@recipiemaker.com',
        password: await bcrypt.hash('kitchen123', 10),
        role: 'kitchen'
      },
      {
        name: 'Department Manager',
        email: 'manager@recipiemaker.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'manager'
      }
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${userData.name} (${userData.email}) with role: ${userData.role}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('Seed completed successfully!');
    console.log('\nTest Login Credentials:');
    console.log('Admin: admin@recipiemaker.com / admin123');
    console.log('Store: store@recipiemaker.com / store123');
    console.log('Kitchen: kitchen@recipiemaker.com / kitchen123');
    console.log('Manager: manager@recipiemaker.com / manager123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedUsers();