const mongoose = require('mongoose');

const DiagnosticTestSchema = new mongoose.Schema({
  testName: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true // e.g., 'CBC', 'Blood Glucose', 'Lipid Profile'
  },
  price: { 
    type: Number, 
    required: true 
  },
  sampleType: { 
    type: String, 
    required: true // e.g., 'Blood', 'Urine'
  },
  unit: { 
    type: String, 
    required: true // e.g., 'mg/dL', 'g/dL', 'mmol/L'
  },
  referenceRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  estimatedDeliveryHours: { 
    type: Number, 
    required: true // Tracks the estimated report delivery time in hours
  }
}, { 
  timestamps: true // Automatically tracks createdAt and updatedAt lifecycle actions
});

module.exports = mongoose.model('DiagnosticTest', DiagnosticTestSchema);