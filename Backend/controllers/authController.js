const jwt = require('jsonwebtoken');
const User = require('../models/User');

const { ROLES } = User;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST: Register a new user account
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}` });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password,
      role: role || 'patient',
    });
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(400).json({ message: 'Error creating account', error: error.message });
  }
};

// POST: Log in with email + password
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// GET: Fetch the currently authenticated user (from the Bearer token)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// GET: Admin — list all user accounts, for role verification/management
const listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// PUT: Admin — change a user's role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}` });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error updating user role', error: error.message });
  }
};

module.exports = { signup, login, getMe, listUsers, updateUserRole };
