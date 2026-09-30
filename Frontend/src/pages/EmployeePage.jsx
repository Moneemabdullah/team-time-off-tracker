import { useEffect, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { CalendarIcon, CalendarPlusIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateCalendar } from '@/components/DateCalendar';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/format';
import AxiosInstance from '@/lib/axiosInstance';
import { useChatStore } from '@/store/chatStore';

function today() {
  return new Date().toISOString().split('T')[0];
}

// The request is attributed to the signed-in user by the backend, so the form
// collects dates, a reason and the urgency flag: name, email, days and status
// in the body are rejected with a 400.
// `argency` is the API's field name: 'normal' (unchecked) or 'urgent' (checked).
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

// Marks every day from start..end as requested ('YYYY-MM-DD' keys).
function addDateRange(set, start, end) {
  const current = new Date(`${String(start).split('T')[0]}T00:00:00`);
  const last = new Date(`${String(end).split('T')[0]}T00:00:00`);
  while (current <= last) {
    set.add(
      `${current.getFullYear()}-${pad2(current.getMonth() + 1)}-${pad2(current.getDate())}`
    );
    current.setDate(current.getDate() + 1);
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Module-level so the mount effect never calls setState directly: the effect
// only wires .then(setBlocked), matching the pattern used elsewhere.
async function collectRequestedDates() {
  const dates = new Set();
  let page = 1;
  let totalPages; // always assigned by the first loop pass before the check
  // GET /requests is scoped to the caller and pages at 100 max per page.
  do {
    const { data } = await AxiosInstance.get('/requests', {
      params: { page, limit: 100 },
    });
    for (const req of data.data || []) {
      // Rejected requests don't block the calendar; pending and approved
      // ones do (the API returns uppercase statuses).
      if (req.status === 'PENDING' || req.status === 'APPROVED') {
        addDateRange(dates, req.startDate, req.endDate);
      }
    }
    totalPages = data.meta?.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= 10);
  return dates;
}

function EmployeePage() {
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    urgent: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Days already covered by a pending/approved request, for calendar coloring.
  const [blocked, setBlocked] = useState(new Set());
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const minDate = today();

  function loadBlockedDays() {
    collectRequestedDates()
      .then((dates) => setBlocked(dates))
      .catch(() => {
        // keep the previously loaded set
      });
  }

  useEffect(() => {
    loadBlockedDays();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handleStartSelect(value) {
    setForm((prev) => ({
      ...prev,
      startDate: value,
      // keep the pair valid: drop an end date that now falls before the start
      endDate: prev.endDate && prev.endDate < value ? '' : prev.endDate,
    }));
    setErrors((prev) => ({ ...prev, startDate: '', endDate: '' }));
    setStartOpen(false);
  }

  function handleEndSelect(value) {
    setForm((prev) => ({ ...prev, endDate: value }));
    setErrors((prev) => ({ ...prev, endDate: '' }));
    setEndOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

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
      const { data } = await AxiosInstance.post('/requests', {
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        reason: result.data.reason,
        argency: form.urgent ? 'urgent' : 'normal',
      });

      toast.success('Time-off request submitted successfully!');
      setForm({ startDate: '', endDate: '', reason: '', urgent: false });
      setErrors({});
      loadBlockedDays(); // the new range turns red immediately

      // Urgent requests seed the admin chat with context and open the panel,
      // so follow-up questions happen in the same thread.
      if (form.urgent) {
        const created = data?.data || {};
        void useChatStore.getState().seedUrgent({
          startDate: created.startDate || result.data.startDate,
          endDate: created.endDate || result.data.endDate,
          reason: created.reason || result.data.reason,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl">
        <Card className="border border-border shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CalendarPlusIcon className="size-4 text-primary" />
              Submit Time-Off Request
            </CardTitle>
            <CardDescription>
              Sunday is the weekend and can&apos;t be selected. Only Mon–Fri
              days count toward your balance.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        aria-label="Start date"
                      >
                        <span
                          className={
                            form.startDate
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }
                        >
                          {form.startDate
                            ? formatDate(form.startDate)
                            : 'Pick a date'}
                        </span>
                        <CalendarIcon className="size-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-3">
                      <DateCalendar
                        selected={form.startDate}
                        minDate={minDate}
                        blocked={blocked}
                        onSelect={handleStartSelect}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldError message={errors.startDate} />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        aria-label="End date"
                      >
                        <span
                          className={
                            form.endDate
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }
                        >
                          {form.endDate
                            ? formatDate(form.endDate)
                            : 'Pick a date'}
                        </span>
                        <CalendarIcon className="size-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-3">
                      <DateCalendar
                        selected={form.endDate}
                        minDate={form.startDate || minDate}
                        blocked={blocked}
                        onSelect={handleEndSelect}
                      />
                    </PopoverContent>
                  </Popover>
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

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="urgent"
                  checked={form.urgent}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, urgent: checked === true }))
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor="urgent"
                  className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground"
                >
                  Check this if you need the time off urgently — the request
                  will be flagged as urgent for your admin.
                </Label>
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-4">
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
