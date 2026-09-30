import { useEffect, useState } from 'react';
import { Loader2Icon, SearchIcon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { StatCard } from '@/components/StatCard';
import { displayName } from '@/lib/chatCodec';
import { useAdminStore } from '@/store/adminStore';

const PAGE_SIZE = 10;

function AllEmployeesPage() {
  const employees = useAdminStore((s) => s.employees);
  const loading = useAdminStore((s) => s.loading);
  const error = useAdminStore((s) => s.error);
  const loadData = useAdminStore((s) => s.loadData);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // GET /admin/users has no server-side pagination, so filtering and paging
  // over the full list both happen here on the client.
  const filtered = employees.filter((emp) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      displayName(emp.name || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setPage(1);
  }

  function goToPage(nextPage) {
    if (nextPage === page) return;
    setPage(nextPage);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              All Employees
            </h1>
            <p className="text-sm text-muted-foreground">
              Every team member and their current leave balance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatCard label="Total Employees" value={filtered.length} />
            <div className="relative w-64">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={handleQueryChange}
                placeholder="Search by name or email..."
                className="pl-9"
                aria-label="Search employees"
              />
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
            Loading employees...
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Leave Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-56">
                        <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UsersIcon className="size-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {query ? 'No matching employees' : 'No employees found'}
                            </p>
                            <p className="mt-1 text-xs">
                              {query
                                ? `Nothing matches “${query.trim()}”.`
                                : 'Add employees to see them here.'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium text-foreground">
                          {displayName(emp.name)}
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

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filtered.length} employee
                {filtered.length === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(Math.max(1, currentPage - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AllEmployeesPage;
