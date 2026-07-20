const express = require('express');
const connectDB = require('./database');
const testRoutes = require('./routes/testRoutes');
const resultRoutes = require('./routes/resultRoutes')
const app = express();

// Middleware
app.use(express.json());

// Connect Database
connectDB();

// Mount Routes
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
// Test Route for base URL
app.get('/', (req, res) => res.send('API Running'));

const PORT = 1520 || process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});