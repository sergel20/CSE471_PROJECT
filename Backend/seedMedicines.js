// One-off script to populate sample pharmacy medicine data for testing medicine search.
// Creates a demo pharmacy account (if one doesn't already exist) and seeds a few
// medicines under it. Safe to re-run — upserts by pharmacy + medicineName + batchNumber.
// Run with: node seedMedicines.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./database');
const User = require('./models/User');
const PharmacyMedicine = require('./models/PharmacyMedicine');

const DEMO_PHARMACY = {
  name: 'Demo Pharmacy',
  email: 'demo.pharmacy@medilabconnect.test',
  password: 'password123',
  role: 'pharmacy',
};

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

const sampleMedicines = [
  {
    medicineName: 'Paracetamol',
    brand: 'Napa',
    category: 'Painkiller',
    location: 'Dhanmondi, Dhaka',
    batchNumber: 'B-2026-001',
    expiryDate: daysFromNow(180),
    availableQuantity: 200,
    price: 1.5,
    prescriptionRequired: false,
  },
  {
    medicineName: 'Amoxicillin',
    brand: 'Amoxin',
    category: 'Antibiotic',
    location: 'Dhanmondi, Dhaka',
    batchNumber: 'B-2026-002',
    expiryDate: daysFromNow(15),
    availableQuantity: 40,
    price: 5,
    prescriptionRequired: true,
  },
  {
    medicineName: 'Omeprazole',
    brand: 'Seclo',
    category: 'Antacid',
    location: 'Gulshan, Dhaka',
    batchNumber: 'B-2026-003',
    expiryDate: daysFromNow(365),
    availableQuantity: 5,
    price: 6.5,
    prescriptionRequired: false,
  },
  {
    medicineName: 'Metformin',
    brand: 'Comid',
    category: 'Diabetes',
    location: 'Gulshan, Dhaka',
    batchNumber: 'B-2026-004',
    expiryDate: daysFromNow(-10),
    availableQuantity: 0,
    price: 4,
    prescriptionRequired: true,
  },
  {
    medicineName: 'Vitamin C',
    brand: 'Cevit',
    category: 'Vitamin',
    location: 'Mirpur, Dhaka',
    batchNumber: 'B-2026-005',
    expiryDate: daysFromNow(300),
    availableQuantity: 150,
    price: 3,
    prescriptionRequired: false,
  },
];

(async () => {
  await connectDB();

  let pharmacyUser = await User.findOne({ email: DEMO_PHARMACY.email });
  if (!pharmacyUser) {
    pharmacyUser = await User.create(DEMO_PHARMACY);
    console.log(`Created demo pharmacy account: ${DEMO_PHARMACY.email} / ${DEMO_PHARMACY.password}`);
  }

  for (const medicine of sampleMedicines) {
    await PharmacyMedicine.findOneAndUpdate(
      { pharmacy: pharmacyUser._id, medicineName: medicine.medicineName, batchNumber: medicine.batchNumber },
      { ...medicine, pharmacy: pharmacyUser._id, pharmacyName: pharmacyUser.name },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log(`Seeded ${sampleMedicines.length} sample medicines under "${pharmacyUser.name}".`);
  await mongoose.disconnect();
  process.exit(0);
})();
