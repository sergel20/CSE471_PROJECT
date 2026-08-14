require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./database');

const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('API Running');
});

const PORT = process.env.PORT || 1520;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});