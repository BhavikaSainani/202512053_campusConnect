import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

function studentId(student) {
  return student?.id || student?._id;
}

export default function StudentList({ onEdit, refreshTrigger, onNotify }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id being confirmed

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/students`);
      setStudents(res.data);
    } catch (err) {
      if (err.response) {
        setError(`Server error ${err.response.status}: Unable to load data. Please try again.`);
      } else {
        setError('Unable to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents, refreshTrigger]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/students/${id}`);
      setDeleteConfirm(null);
      if (onNotify) onNotify('Student deleted successfully (204 No Content)!');
      fetchStudents();
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Student not found.');
      } else {
        setError('Unable to delete student. Please try again.');
      }
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading students…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={fetchStudents}>
          ↻ Retry
        </button>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🎓</span>
        <p>No students yet. Add your first student!</p>
      </div>
    );
  }

  return (
    <div className="student-list">
      <div className="list-header">
        <span className="student-count">{students.length} student{students.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={fetchStudents} title="Refresh list">
          ↻ Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table className="students-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Course</th>
              <th>Semester</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={studentId(student)} className="student-row">
                <td className="row-num">{idx + 1}</td>
                <td className="student-name">{student.name}</td>
                <td className="student-email">{student.email}</td>
                <td>{student.course}</td>
                <td className="semester-badge">
                  <span className="badge">Sem {student.semester}</span>
                </td>
                <td className="actions-cell">
                  {deleteConfirm === studentId(student) ? (
                    <div className="delete-confirm">
                      <span>Delete?</span>
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => handleDelete(studentId(student))}
                      >
                        Yes
                      </button>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button
                        className="btn btn-edit btn-xs"
                        onClick={() => onEdit(student)}
                        title="Edit student"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => setDeleteConfirm(studentId(student))}
                        title="Delete student"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
