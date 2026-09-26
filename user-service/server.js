require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.USER_SERVICE_PORT || process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Root Health Endpoint ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'CampusConnect User Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      getAllUsers:    'GET    /users',
      getUserById:   'GET    /users/:id',
      createUser:    'POST   /users',
      updateUser:    'PUT    /users/:id',
      deleteUser:    'DELETE /users/:id'
    }
  });
});

// ─── Mongoose User Schema & Model ─────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name:  { type: String, required: [true, 'name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'a valid email is required']
    },
    phone: { type: String, trim: true, default: '' },
    role:  { type: String, trim: true, default: 'student', enum: ['student', 'faculty', 'admin'] }
  },
  { versionKey: false, timestamps: true }
);

userSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateUser(body) {
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return { valid: false, error: 'name is required and must be a valid string' };
  }
  if (!body.email || typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email)) {
    return { valid: false, error: 'a valid email is required' };
  }
  return { valid: true };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /users — List all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// GET /users/:id — Get one user
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: `User with ID ${req.params.id} not found` });
    }
    res.status(200).json(user);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `User with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// POST /users — Create a new user
app.post('/users', async (req, res) => {
  const validation = validateUser(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const newUser = new User({
      name:  req.body.name.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone ? req.body.phone.trim() : '',
      role:  req.body.role || 'student'
    });
    const saved = await newUser.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /users/:id — Full update
app.put('/users/:id', async (req, res) => {
  const validation = validateUser(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        name:  req.body.name.trim(),
        email: req.body.email.trim(),
        phone: req.body.phone ? req.body.phone.trim() : '',
        role:  req.body.role || 'student'
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: `User with ID ${req.params.id} not found` });
    }
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `User with ID ${req.params.id} not found` });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /users/:id — Delete a user
app.delete('/users/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: `User with ID ${req.params.id} not found` });
    }
    res.status(200).json({ message: `User with ID ${req.params.id} deleted successfully` });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `User with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── Connect to MongoDB, then start server ────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/campusconnect-users';

app.listen(port, () => {
  console.log(`🚀  User Service running at http://localhost:${port}`);
});

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`✅  User Service connected to MongoDB`);
  })
  .catch((err) => {
    console.warn(`⚠️  MongoDB connection note: ${err.message}`);
  });

