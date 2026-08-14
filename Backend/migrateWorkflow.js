// Idempotent migration for bookings created before the per-sample workflow.
// It never confirms a booking or generates Sample IDs; those remain admin actions.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./database');
const Booking = require('./models/Booking');
const DiagnosticTest = require('./models/DiagnosticTest');
const User = require('./models/User');

(async () => {
  await connectDB();

  const legacyBookings = await Booking.collection.find({
    bookingStatus: { $exists: false },
  }).toArray();

  let linkedPatients = 0;
  let unresolvedTests = 0;

  for (const booking of legacyBookings) {
    const email = String(booking.patientInfo?.email || '').trim().toLowerCase();
    const patient = email ? await User.findOne({ email }).select('_id').lean() : null;
    const testIds = (booking.tests || []).map((item) => item.test).filter(Boolean);
    const diagnosticTests = await DiagnosticTest.find({ _id: { $in: testIds } }).lean();
    const byId = new Map(diagnosticTests.map((test) => [String(test._id), test]));

    const tests = (booking.tests || []).map((item) => {
      const diagnostic = byId.get(String(item.test));
      if (!diagnostic) {
        unresolvedTests += 1;
        return item;
      }
      return {
        ...item,
        sampleType: item.sampleType || diagnostic.sampleType,
        unit: item.unit || diagnostic.unit,
        referenceRange: item.referenceRange || diagnostic.referenceRange,
        statusHistory: item.statusHistory || [],
      };
    });

    const set = {
      bookingStatus: 'Pending Confirmation',
      tests,
    };
    if (patient) {
      set.patient = patient._id;
      linkedPatients += 1;
    }

    await Booking.collection.updateOne(
      { _id: booking._id },
      {
        $set: set,
        $unset: { sampleStatus: '', statusHistory: '' },
      }
    );
  }

  console.log(`Migrated ${legacyBookings.length} legacy bookings.`);
  console.log(`Linked ${linkedPatients} bookings to existing patient accounts.`);
  console.log(`${unresolvedTests} legacy test selections reference deleted diagnostic tests.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Workflow migration failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
