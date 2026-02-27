require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Drop the rawmaterials collection to remove old indexes
    await mongoose.connection.db.dropCollection('rawmaterials');
    console.log('Dropped rawmaterials collection');
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

migrate();
