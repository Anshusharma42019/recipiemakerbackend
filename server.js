require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration for Vercel
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "https://recipiemakerbackend-oy2o.vercel.app",
  "https://recipiemakerfrontend-pied.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection with better error handling and timeout settings
if (!process.env.MONGO_URL) {
  console.error('MONGO_URL environment variable is not set');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set');
  process.exit(1);
}

// Don't disable buffer commands for Vercel - let mongoose handle it
// mongoose.set('bufferCommands', false);
mongoose.set('maxTimeMS', 20000);

// Global connection promise to reuse
let cachedConnection = null;

const connectToDatabase = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (!cachedConnection) {
    cachedConnection = mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      family: 4
    });
  }

  try {
    await cachedConnection;
    console.log('MongoDB connected successfully');
    return cachedConnection;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    cachedConnection = null;
    throw err;
  }
};

// Initialize connection
connectToDatabase().catch(err => {
  console.error('Initial MongoDB connection failed:', err);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Recipe Maker API', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Database connection test endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    if (dbState === 1) {
      // Test actual database query
      const User = require('./models/User');
      await User.findOne().limit(1).maxTimeMS(5000);
      res.json({ 
        status: 'healthy', 
        database: 'connected',
        message: 'Database query successful'
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy', 
        database: states[dbState] || 'unknown',
        message: 'Database not connected'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'error',
      message: error.message
    });
  }
});

// API routes
app.use('/api/auth', require('./routes/userRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/cooked-items', require('./routes/cookedItemRoutes'));
app.use('/api/finished-goods', require('./routes/finishedGoodRoutes'));
app.use('/api/semi-finished-goods', require('./routes/semiFinishedGoodRoutes'));
app.use('/api/adjusted-recipes', require('./routes/adjustedRecipeRoutes'));
app.use('/api/losses', require('./routes/lossRoutes'));
app.use('/api/stock-logs', require('./routes/stockLogRoutes'));
app.use('/api/bulk', require('./routes/bulkDataRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api', require('./routes/transfers'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
