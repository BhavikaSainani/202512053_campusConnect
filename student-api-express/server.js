require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Root Endpoint ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'CampusConnect Student REST API is running inside Docker container',
    version: '1.0.0',
    docs: '/api-docs',
    endpoints: {
      getAllStudents: 'GET /students',
      getStudentById: 'GET /students/:id',
      createStudent: 'POST /students',
      updateStudent: 'PUT /students/:id',
      partialUpdateStudent: 'PATCH /students/:id',
      deleteStudent: 'DELETE /students/:id'
    }
  });
});

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ─── Mongoose Student Schema & Model ─────────────────────────────────────────
const studentSchema = new mongoose.Schema(
  {
    name:     { type: String, required: [true, 'name is required and must be a valid string'], trim: true },
    email:    { type: String, required: [true, 'a valid email is required'], unique: true, trim: true,
                match: [/^\S+@\S+\.\S+$/, 'a valid email is required'] },
    course:   { type: String, required: [true, 'course is required and must be a valid string'], trim: true },
    semester: { type: Number, required: [true, 'semester is required and must be a positive number'], min: [1, 'semester is required and must be a positive number'] }
  },
  { versionKey: false }   // omit __v from responses
);

// Keep Lab 3's `id` field in JSON while MongoDB still stores `_id`
studentSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    return ret;
  }
});

const Student = mongoose.model('Student', studentSchema);

// ─── Helper: validate student payload (mirrors Lab 3 logic) ──────────────────
function validateStudent(body) {
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return { valid: false, error: 'name is required and must be a valid string' };
  }
  if (!body.email || typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email)) {
    return { valid: false, error: 'a valid email is required' };
  }
  if (!body.course || typeof body.course !== 'string' || body.course.trim() === '') {
    return { valid: false, error: 'course is required and must be a valid string' };
  }
  if (body.semester === undefined || typeof body.semester !== 'number' || body.semester < 1) {
    return { valid: false, error: 'semester is required and must be a positive number' };
  }
  return { valid: true };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /students — List all students
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
});

// GET /students/:id — Get one student
app.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    res.status(200).json(student);
  } catch (err) {
    // CastError means the id format is invalid — treat as 404
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to retrieve student' });
  }
});

// POST /students — Create a new student
app.post('/students', async (req, res) => {
  const validation = validateStudent(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const newStudent = new Student({
      name:     req.body.name.trim(),
      email:    req.body.email.trim(),
      course:   req.body.course.trim(),
      semester: req.body.semester
    });
    const saved = await newStudent.save();
    res.status(201).json(saved);
  } catch (err) {
    // Duplicate email (unique index violation)
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A student with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// PUT /students/:id — Full update
app.put('/students/:id', async (req, res) => {
  const validation = validateStudent(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name.trim(), email: req.body.email.trim(), course: req.body.course.trim(), semester: req.body.semester },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A student with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// PATCH /students/:id — Partial update
app.patch('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }

    // Apply only provided fields
    if (req.body.name !== undefined)     student.name     = req.body.name;
    if (req.body.email !== undefined)    student.email    = req.body.email;
    if (req.body.course !== undefined)   student.course   = req.body.course;
    if (req.body.semester !== undefined) student.semester = req.body.semester;

    // Re-validate the merged result
    const validation = validateStudent({ name: student.name, email: student.email, course: student.course, semester: student.semester });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const saved = await student.save();
    res.status(200).json(saved);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A student with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /students/:id — Delete a student
app.delete('/students/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    res.status(200).json({ message: `Student with ID ${req.params.id} deleted successfully` });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: `Student with ID ${req.params.id} not found` });
    }
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ─── Connect to MongoDB, then start server ────────────────────────────────────
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/campusconnect';

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`✅  Connected to MongoDB (${mongoUri.startsWith('mongodb+srv') ? 'MongoDB Atlas' : mongoUri})`);
    app.listen(port, () => {
      console.log(`🚀  Student API running at http://localhost:${port}`);
      console.log(`📄  Swagger Docs available at http://localhost:${port}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
