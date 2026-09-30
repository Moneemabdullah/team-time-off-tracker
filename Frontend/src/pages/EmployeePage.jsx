import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AxiosInstance from '@/lib/axiosInstance';

function today() {
  return new Date().toISOString().split('T')[0];
}

// The request is attributed to the signed-in user by the backend, so the form
// only collects dates and a reason: name, email, days and status in the body
// are rejected with a 400.
const requestSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters'),
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
    if (
      data.startDate &&
      data.endDate &&
      data.endDate >= data.startDate &&
      countWeekdays(data.startDate, data.endDate) === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Request must span at least one working day (Mon-Fri)',
        path: ['startDate'],
      });
    }
  });

function countWeekdays(start, end) {
  let count = 0;
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (current <= last) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function EmployeePage() {
  const [form, setForm] = useState({
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
      await AxiosInstance.post('/requests', {
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        reason: result.data.reason,
      });

      toast.success('Time-off request submitted successfully!');
      setForm({ startDate: '', endDate: '', reason: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Submit Time-Off Request</CardTitle>
            <CardDescription>
              Weekdays only — Saturday and Sunday don&apos;t count toward your balance.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                    min={minDate}
                    aria-invalid={!!errors.startDate}
                  />
                  <FieldError message={errors.startDate} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleChange}
                    min={form.startDate || minDate}
                    aria-invalid={!!errors.endDate}
                  />
                  <FieldError message={errors.endDate} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Reason for time off"
                  rows={3}
                  aria-invalid={!!errors.reason}
                />
                <FieldError message={errors.reason} />
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-3">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2Icon className="animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default EmployeePage;
