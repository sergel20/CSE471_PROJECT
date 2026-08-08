const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI;

    if (!dbURI) {
      throw new Error('MONGO_URI is not set');
    }

    await mongoose.connect(dbURI);
    console.log('🚀 MongoDB connected successfully for MediLab Connect!');
  } catch (error) {
    console.error(' Database connection failed:', error.message);
    process.exit(1); // Crash app immediately if DB isn't available
  }
};

module.exports = connectDB;