const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Uses local fallback if process.env.MONGO_URI isn't configured yet
    const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medilab_connect';
    
    await mongoose.connect(dbURI);
    console.log('🚀 MongoDB connected successfully for MediLab Connect!');
  } catch (error) {
    console.error(' Database connection failed:', error.message);
    process.exit(1); // Crash app immediately if DB isn't available
  }
};

module.exports = connectDB;