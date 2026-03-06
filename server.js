require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "https://recipiemakerbackend.vercel.app",
  "https://recipiemakerfrontend.vercel.app"
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => res.json({ message: 'Recipe Maker API' }));

app.use('/api/auth', require('./routes/userRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/cooked-items', require('./routes/cookedItemRoutes'));
app.use('/api/finished-goods', require('./routes/finishedGoodRoutes'));
app.use('/api/semi-finished-goods', require('./routes/semiFinishedGoodRoutes'));
app.use('/api/stock-logs', require('./routes/stockLogRoutes'));

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
