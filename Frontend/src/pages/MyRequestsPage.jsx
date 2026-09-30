import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  Loader2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { formatDate } from '@/lib/format';
import { statusBadgeClass, urgencyBadgeClass } from '@/lib/status';
import AxiosInstance from '@/lib/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { URLs } from '@/lib/URLs';

const PAGE_SIZE = 10;

function MyRequestsPage() {
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(''); // '' = all statuses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Page and filter changes go through handlers so loading/error reset in the
  // event handler; the effect body itself only starts the request.
  function goToPage(nextPage) {
    setPage(nextPage);
    setLoading(true);
    setError('');
  }

  function handleStatusChange(value) {
    const next = value === 'ALL' ? '' : value;
    if (next === status) return;
    setStatus(next);
    setPage(1);
    setLoading(true);
    setError('');
  }

  // The API always scopes GET /requests to the signed-in user; the :id in the
  // URL is only there so the sidebar link can be built per employee.
  useEffect(() => {
    let active = true;

    AxiosInstance.get('/requests', {
      params: { page, limit: PAGE_SIZE, ...(status ? { status } : {}) },
    })
      .then(({ data }) => {
        if (!active) return;
        setRequests(data.data || []);
        if (data.meta) setMeta(data.meta);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load your requests');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, status]);

  const rangeStart = meta.total === 0 ? 0 : (page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(page * meta.limit, meta.total);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              My Requests
            </h1>
            <p className="text-sm text-muted-foreground">
              Track the status of your time-off requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatCard
              label="Leave balance"
              value={`${user?.annualLeaveBalance ?? '—'} days`}
            />
            <StatCard label="Requests" value={meta.total} />
            <div className="w-44">
              <Select value={status || 'ALL'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground shadow-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading your requests...
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-56">
                        <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <InboxIcon className="size-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {status
                                ? `No ${status.toLowerCase()} requests`
                                : 'No requests yet'}
                            </p>
                            <p className="mt-1 text-xs">
                              {status
                                ? 'Try a different filter to see more.'
                                : 'Submit your first time-off request to see it here.'}
                            </p>
                          </div>
                          {!status && (
                            <Button size="sm" variant="outline" asChild>
                              <Link to={URLs.EMPLOYEE}>New Request</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => {
                      const reqStatus = (req.status || '').toUpperCase();
                      const urgency = (req.argency || 'normal').toUpperCase();
                      return (
                        <TableRow key={req.id} className="hover:bg-muted/40">
                          <TableCell className="whitespace-nowrap">
                            {formatDate(req.startDate)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(req.endDate)}
                          </TableCell>
                          <TableCell
                            className="max-w-56 truncate"
                            title={req.reason}
                          >
                            {req.reason}
                          </TableCell>
                          <TableCell className="text-center">{req.days}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${urgencyBadgeClass(urgency)}`}
                            >
                              {urgency}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(reqStatus)}`}
                            >
                              {reqStatus}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {meta.total} request
                {meta.total === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                >
                  <ChevronLeftIcon />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {meta.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default MyRequestsPage;
