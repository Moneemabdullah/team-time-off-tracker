import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdminStore } from '@/store/adminStore';

function AllEmployeesPage() {
  const employees = useAdminStore((s) => s.employees);
  const loading = useAdminStore((s) => s.loading);
  const error = useAdminStore((s) => s.error);
  const loadData = useAdminStore((s) => s.loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
       <div>
  <h1 className="text-2xl font-semibold text-foreground">Team Overview</h1>
  <p className="text-sm text-muted-foreground">
    Stay up to date with your team’s time-off requests and availability.
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Leave Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium text-foreground">
                        {emp.name}
                      </TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {emp.annualLeaveBalance} days left
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AllEmployeesPage;
