// One-off script to populate the DiagnosticTest collection with sample data.
// Run with: node seed.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./database');
const DiagnosticTest = require('./models/DiagnosticTest');

const sampleTests = [
  { testName: 'CBC', price: 500, sampleType: 'Blood', unit: 'g/dL', referenceRange: { min: 12, max: 16 }, estimatedDeliveryHours: 6 },
  { testName: 'Blood Glucose', price: 150, sampleType: 'Blood', unit: 'mg/dL', referenceRange: { min: 70, max: 140 }, estimatedDeliveryHours: 4 },
  { testName: 'ALT', price: 400, sampleType: 'Blood', unit: 'U/L', referenceRange: { min: 7, max: 56 }, estimatedDeliveryHours: 8 },
  { testName: 'Creatinine', price: 350, sampleType: 'Blood', unit: 'mg/dL', referenceRange: { min: 0.6, max: 1.3 }, estimatedDeliveryHours: 6 },
  { testName: 'Lipid Profile', price: 900, sampleType: 'Blood', unit: 'mg/dL', referenceRange: { min: 0, max: 200 }, estimatedDeliveryHours: 12 },
  { testName: 'Thyroid Test', price: 800, sampleType: 'Blood', unit: 'mIU/L', referenceRange: { min: 0.4, max: 4.0 }, estimatedDeliveryHours: 24 },
  { testName: 'Urine Test', price: 250, sampleType: 'Urine', unit: 'N/A', referenceRange: { min: 0, max: 0 }, estimatedDeliveryHours: 4 },
];

(async () => {
  await connectDB();

  for (const test of sampleTests) {
    await DiagnosticTest.findOneAndUpdate(
      { testName: test.testName },
      test,
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log(`Seeded ${sampleTests.length} diagnostic tests.`);
  await mongoose.disconnect();
  process.exit(0);
})();
