const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./database');

const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const sampleStatusRoutes = require('./routes/sampleStatusRoutes');
const reportApprovalRoutes = require('./routes/reportApprovalRoutes');
const reportRoutes = require('./routes/reportRoutes');
const donorRoutes = require('./routes/donorRoutes');
const donationRequestRoutes = require('./routes/donationRequestRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sample-status', sampleStatusRoutes);
app.use('/api/report-approval', reportApprovalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/donation-requests', donationRequestRoutes);

app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 1520;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
