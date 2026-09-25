import { useState } from 'react';
import axios from 'axios';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import API_BASE_URL from './config';
import './App.css';

export default function App() {
  const [editingStudent, setEditingStudent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'info', message: string }

  const triggerRefresh = () => setRefreshTrigger((n) => n + 1);

  const handleAddNew = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleSuccess = (msg) => {
    setShowForm(false);
    setEditingStudent(null);
    if (msg) setAlert({ type: 'success', message: msg });
    triggerRefresh();
  };

  const handleNotify = (msg) => {
    if (msg) setAlert({ type: 'success', message: msg });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStudent(null);
  };

  const [lookupId, setLookupId] = useState('');
  const [lookupMessage, setLookupMessage] = useState(null);
  const [lookupKind, setLookupKind] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupMessage(null);
    setLookupKind(null);
    const id = lookupId.trim();
    if (!id) {
      setLookupKind('error');
      setLookupMessage('Enter a student ID to look up.');
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/students/${id}`);
      setLookupKind('ok');
      setLookupMessage(`Found: ${res.data.name} (${res.data.email})`);
    } catch (err) {
      setLookupKind('error');
      if (err.response?.status === 404) {
        setLookupMessage('Student not found');
      } else if (err.response?.status === 400) {
        setLookupMessage(err.response.data?.error || 'Validation failed.');
      } else {
        setLookupMessage('Unable to load data. Please try again.');
      }
    }
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">🎓</span>
            <div>
              <h1 className="brand-name">CampusConnect</h1>
              <p className="brand-sub">Student Registry — Lab 4</p>
            </div>
          </div>
          <button
            id="add-student-btn"
            className="btn btn-primary btn-add"
            onClick={handleAddNew}
          >
            ＋ Add Student
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        {/* Global Action Banner */}
        {alert && (
          <div className="global-alert-banner">
            <div className="global-alert-content">
              <span className="global-alert-icon">✨</span>
              <span className="global-alert-text">{alert.message}</span>
            </div>
            <button className="global-alert-close" onClick={() => setAlert(null)} title="Dismiss">✕</button>
          </div>
        )}

        {/* Form panel — slides in when showForm is true */}
        {showForm && (
          <div className="form-panel">
            <StudentForm
              editingStudent={editingStudent}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}

        <section className="lookup-bar">
          <form onSubmit={handleLookup} className="lookup-form">
            <label htmlFor="lookup-id">Look up by ID</label>
            <input
              id="lookup-id"
              type="text"
              placeholder="GET /students/{id}"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">Find</button>
          </form>
          {lookupMessage && (
            <p className={lookupKind === 'ok' ? 'lookup-ok' : 'lookup-error'} role="status">
              {lookupMessage}
            </p>
          )}
        </section>

        {/* Student list */}
        <section className="list-section">
          <StudentList
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
            onNotify={handleNotify}
          />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <p>Web Services &amp; SOA · Lab 4 · React ↔ Express.js ↔ MongoDB Atlas</p>
      </footer>
    </div>
  );
}
