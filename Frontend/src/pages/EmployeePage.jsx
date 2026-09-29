import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { apiRequest } from '../lib/api';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

function today() {
  return new Date().toISOString().split('T')[0];
}

const requestSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .pipe(z.email('Enter a valid email address')),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z
      .string()
      .trim()
      .min(3, 'Reason must be at least 3 characters'),
  })
  .superRefine((data, ctx) => {
    const t = today();
    if (data.startDate && data.startDate < t) {
      ctx.addIssue({
        code: 'custom',
        message: 'Start date cannot be in the past',
        path: ['startDate'],
      });
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date cannot be before start date',
        path: ['endDate'],
      });
    }
  });

function Field({ label, htmlFor, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EmployeePage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const minDate = today();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const result = requestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSubmitting(true);
    try {
      const employees = await apiRequest('/employees');
      const employee = employees.find(
        (emp) => emp.email.toLowerCase() === result.data.email.toLowerCase()
      );
      if (!employee) {
        toast.error('No employee found with this email. Please contact your admin.');
        return;
      }

      await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: employee.id,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          reason: result.data.reason,
        }),
      });

      toast.success('Time-off request submitted successfully!');
      setForm({ name: '', email: '', startDate: '', endDate: '', reason: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold text-gray-900">Submit Time-Off Request</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Field label="Employee Name" htmlFor="name" error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your name"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Employee Email" htmlFor="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Start Date" htmlFor="startDate" error={errors.startDate}>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              min={minDate}
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="End Date" htmlFor="endDate" error={errors.endDate}>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              min={form.startDate || minDate}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <Field label="Reason" htmlFor="reason" error={errors.reason}>
          <textarea
            id="reason"
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Reason for time off"
            rows={3}
            className={INPUT_CLASS}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

export default EmployeePage;
