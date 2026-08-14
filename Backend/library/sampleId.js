const Booking = require('../models/Booking');
const Counter = require('../models/Counter');

async function generateSampleId() {
  const year = new Date().getFullYear();
  const counterId = `sample-${year}`;

  // Atomic increments prevent two confirmations from receiving the same sequence.
  // The existence check covers databases that predate the counter collection.
  while (true) {
    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const sampleId = `LAB-${year}-${String(counter.sequence).padStart(4, '0')}`;
    const alreadyUsed = await Booking.exists({ 'tests.sampleId': sampleId });
    if (!alreadyUsed) return sampleId;
  }
}

module.exports = generateSampleId;
