import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { statusBadgeClass } from '@/lib/status';
import { useAdminStore } from '@/store/adminStore';

function AllRequestsPage() {
  const requests = useAdminStore((s) => s.requests);
  const loading = useAdminStore((s) => s.loading);
  const error = useAdminStore((s) => s.error);
  const setStatusFilter = useAdminStore((s) => s.setStatusFilter);
  const setNameFilter = useAdminStore((s) => s.setNameFilter);
  const loadData = useAdminStore((s) => s.loadData);
  const updateRequestStatus = useAdminStore((s) => s.updateRequestStatus);

  useEffect(() => {
    setStatusFilter('');
    setNameFilter('');
    loadData();
  }, [loadData, setStatusFilter, setNameFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
     <div>
  <h1 className="text-2xl font-semibold text-foreground">Time-Off Requests</h1>
  <p className="text-sm text-muted-foreground">
    Review and manage time-off requests submitted by your team.
  </p>
</div>



        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                    const status = (req.status || '').toUpperCase();
                    const isPending = status === 'PENDING';
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">{req.employee?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {req.employee?.email}
                          </p>
                        </TableCell>
                        <TableCell>{req.startDate?.split('T')[0]}</TableCell>
                        <TableCell>{req.endDate?.split('T')[0]}</TableCell>
                        <TableCell>{req.reason}</TableCell>
                        <TableCell>{req.days}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(status)}`}
                          >
                            {status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => updateRequestStatus(req.id, 'APPROVED')}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateRequestStatus(req.id, 'REJECTED')}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AllRequestsPage;
