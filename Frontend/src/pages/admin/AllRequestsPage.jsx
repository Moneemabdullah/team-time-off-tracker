import { useEffect } from 'react';
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
import { useAdminStore } from '@/store/adminStore';

function AllRequestsPage() {
  const requests = useAdminStore((s) => s.allRequests);
  const meta = useAdminStore((s) => s.allRequestsMeta);
  const page = useAdminStore((s) => s.allRequestsPage);
  const status = useAdminStore((s) => s.allRequestsStatus);
  const loading = useAdminStore((s) => s.allRequestsLoading);
  const error = useAdminStore((s) => s.allRequestsError);
  const setPage = useAdminStore((s) => s.setAllRequestsPage);
  const setStatus = useAdminStore((s) => s.setAllRequestsStatus);
  const loadRequests = useAdminStore((s) => s.loadAllRequests);
  const updateRequestStatus = useAdminStore((s) => s.updateRequestStatus);
  const updatingId = useAdminStore((s) => s.updatingId);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, page, status]);

  function goToPage(nextPage) {
    if (nextPage === page) return;
    setPage(nextPage);
  }

  function handleStatusChange(value) {
    const next = value === 'ALL' ? '' : value;
    if (next === status) return;
    setStatus(next); // resets to page 1 in the store
  }

  // The store action holds the in-flight guard; the page reloads so the
  // current status filter and page stay accurate after the decision.
  async function handleDecide(id, statusValue) {
    const ok = await updateRequestStatus(id, statusValue);
    if (ok) loadRequests();
  }

  const rangeStart = meta.total === 0 ? 0 : (page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(page * meta.limit, meta.total);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              All Requests
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and manage time-off requests submitted by your team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatCard label="Total Requests" value={meta.total} />
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
            Loading requests...
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Employee</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-56">
                        <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <InboxIcon className="size-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {status
                                ? `No ${status.toLowerCase()} requests`
                                : 'No requests found'}
                            </p>
                            <p className="mt-1 text-xs">
                              {status
                                ? 'Try a different filter to see more.'
                                : 'Requests from your team will show up here.'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => {
                      const reqStatus = (req.status || '').toUpperCase();
                      const urgency = (req.argency || 'normal').toUpperCase();
                      const isPending = reqStatus === 'PENDING';
                      return (
                        <TableRow key={req.id} className="hover:bg-muted/40">
                          <TableCell>
                            <p className="font-medium text-foreground">
                              {req.user?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {req.user?.email}
                            </p>
                          </TableCell>
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
                          <TableCell>
                            {isPending ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 text-white hover:bg-green-700"
                                  disabled={!!updatingId}
                                  onClick={() => handleDecide(req.id, 'APPROVED')}
                                >
                                  {updatingId === req.id && (
                                    <Loader2Icon className="animate-spin" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={!!updatingId}
                                  onClick={() => handleDecide(req.id, 'REJECTED')}
                                >
                                  {updatingId === req.id && (
                                    <Loader2Icon className="animate-spin" />
                                  )}
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
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

export default AllRequestsPage;
