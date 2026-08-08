const express = require('express');
const connectDB = require('./database');

const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Middleware
app.use(express.json());

// Connect Database
connectDB();

// Mount Routes
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/bookings', bookingRoutes);

// Test Route for base URL
app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 1520;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});