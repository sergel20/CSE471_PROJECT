require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes')
const bookingRoutes = require('./routes/bookingRoutes');
const sampleStatusRoutes = require('./routes/sampleStatusRoutes');
const reportApprovalRoutes = require('./routes/reportApprovalRoutes');
const donorRoutes = require('./routes/donorRoutes');
const authRoutes = require('./routes/authRoutes');
const donationRequestRoutes = require('./routes/donationRequestRoutes');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();

// Mount Routes
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sample-status', sampleStatusRoutes);
app.use('/api/report-approval', reportApprovalRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donation-requests', donationRequestRoutes);
// Test Route for base URL
app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 1520;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});