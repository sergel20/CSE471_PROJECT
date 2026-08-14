const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Every account is assigned exactly one role at signup. This drives both API
// authorization (see middleware/role.js) and which dashboard the frontend renders.
const ROLES = ['patient', 'lab_staff', 'doctor', 'donor', 'hospital_staff', 'pharmacy', 'admin'];

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    required: true,
    enum: ROLES,
    default: 'patient',
  },
}, {
  timestamps: true,
});

UserSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
module.exports.ROLES = ROLES;
