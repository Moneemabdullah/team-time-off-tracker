import { useState } from 'react';
import './EmployeePage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function EmployeePage() {
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const today = new Date().toISOString().split('T')[0];

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSuccessMsg('');
  }

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.startDate) newErrors.startDate = 'Start date is required';
    if (!form.endDate) newErrors.endDate = 'End date is required';
    if (form.startDate && form.startDate < today) {
      newErrors.startDate = 'Start date cannot be in the past';
    }
    if (form.endDate && form.endDate < today) {
      newErrors.endDate = 'End date cannot be in the past';
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      newErrors.endDate = 'End date cannot be before start date';
    }
    if (!form.reason.trim()) newErrors.reason = 'Reason is required';
    else if (form.reason.trim().length < 3) newErrors.reason = 'Reason must be at least 3 characters';
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit request');
      }

      setSuccessMsg('Time-off request submitted successfully!');
      setForm({ name: '', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="employee-page">
      <h1>Submit Time-Off Request</h1>
      <form className="request-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Employee Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your name"
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              min={today}
            />
            {errors.startDate && <span className="error">{errors.startDate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              min={form.startDate || today}
            />
            {errors.endDate && <span className="error">{errors.endDate}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reason">Reason</label>
          <textarea
            id="reason"
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Reason for time off"
            rows={3}
          />
          {errors.reason && <span className="error">{errors.reason}</span>}
        </div>

        {errors.submit && <span className="error">{errors.submit}</span>}
        {successMsg && <span className="success">{successMsg}</span>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

export default EmployeePage;
