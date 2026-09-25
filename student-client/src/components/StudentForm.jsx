import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

const EMPTY_FORM = { name: '', email: '', course: '', semester: '' };

function studentId(student) {
  return student?.id || student?._id;
}

// Client-side validation — mirrors backend rules exactly
function validateForm({ name, email, course, semester }) {
  if (!name.trim()) return 'Name is required.';
  if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return 'A valid email is required.';
  if (!course.trim()) return 'Course is required.';
  const sem = Number(semester);
  if (!semester || isNaN(sem) || sem < 1 || !Number.isInteger(sem)) {
    return 'Semester must be a positive whole number.';
  }
  return null;
}

export default function StudentForm({ editingStudent, onSuccess, onCancel }) {
  const isEditing = Boolean(editingStudent);

  const [form, setForm] = useState(EMPTY_FORM);
  const [clientError, setClientError] = useState(null);   // client-side validation
  const [apiError, setApiError] = useState(null);          // 400/404 from server
  const [submitting, setSubmitting] = useState(false);

  // Load the latest record via GET /students/:id so 404 is handled from that endpoint
  useEffect(() => {
    let cancelled = false;
    setClientError(null);
    setApiError(null);

    if (!editingStudent) {
      setForm(EMPTY_FORM);
      return undefined;
    }

    const id = studentId(editingStudent);
    setForm({
      name:     editingStudent.name     || '',
      email:    editingStudent.email    || '',
      course:   editingStudent.course   || '',
      semester: editingStudent.semester?.toString() || ''
    });

    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/students/${id}`);
        if (cancelled) return;
        setForm({
          name:     res.data.name     || '',
          email:    res.data.email    || '',
          course:   res.data.course   || '',
          semester: res.data.semester?.toString() || ''
        });
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setApiError('Student not found');
        } else {
          setApiError('Unable to load data. Please try again.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [editingStudent]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setClientError(null);
    setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError(null);
    setApiError(null);

    // 1. Client-side validation
    const validationError = validateForm(form);
    if (validationError) {
      setClientError(validationError);
      return;
    }

    const payload = {
      name:     form.name.trim(),
      email:    form.email.trim(),
      course:   form.course.trim(),
      semester: Number(form.semester)
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        // PUT /students/:id
        await axios.put(`${API_BASE_URL}/students/${studentId(editingStudent)}`, payload);
        setForm(EMPTY_FORM);
        onSuccess('Student updated successfully (200 OK)!');
      } else {
        // POST /students
        await axios.post(`${API_BASE_URL}/students`, payload);
        setForm(EMPTY_FORM);
        onSuccess('Student enrolled successfully (201 Created)!');
      }
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 400) {
          // Show the specific validation error from the API
          setApiError(data.error || 'Validation failed. Please check your input.');
        } else if (status === 404) {
          setApiError('Student not found.');
        } else {
          setApiError('Unable to save student. Please try again.');
        }
      } else {
        setApiError('Network error. Unable to reach the server.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header">
        <h2>{isEditing ? '✏️ Edit Student' : '➕ Add New Student'}</h2>
        {onCancel && (
          <button className="btn btn-ghost btn-sm close-btn" onClick={onCancel} aria-label="Close form">
            ✕
          </button>
        )}
      </div>

      {/* Client-side validation error */}
      {clientError && (
        <div className="alert alert-error" role="alert">
          <span>⚠️</span> {clientError}
        </div>
      )}

      {/* API error (400, 404, 5xx) */}
      {apiError && (
        <div className="alert alert-error" role="alert">
          <span>⚠️</span> {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="student-form" noValidate>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="e.g. Jane Smith"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="e.g. jane@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="course">Course</label>
            <input
              id="course"
              name="course"
              type="text"
              placeholder="e.g. Computer Science"
              value={form.course}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group form-group-sm">
            <label htmlFor="semester">Semester</label>
            <input
              id="semester"
              name="semester"
              type="number"
              min="1"
              placeholder="e.g. 3"
              value={form.semester}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? (isEditing ? 'Saving…' : 'Adding…')
              : (isEditing ? '💾 Save Changes' : '➕ Add Student')}
          </button>
        </div>
      </form>
    </div>
  );
}
