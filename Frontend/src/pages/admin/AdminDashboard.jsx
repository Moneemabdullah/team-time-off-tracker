import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ArrowRightIcon,
  ClipboardListIcon,
  Loader2Icon,
  UsersIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { URLs } from '@/lib/URLs';
import { displayName } from '@/lib/chatCodec';
import { statusBadgeClass } from '@/lib/status';
import { useAdminStore } from '@/store/adminStore';

const reassignSchema = z.coerce
  .number()
  .int('Must be a whole number')
  .min(0, 'Cannot be negative');

function IconTile({ children }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      {children}
    </div>
  );
}

function AdminDashboard() {
  const requests = useAdminStore((s) => s.requests);
  const employees = useAdminStore((s) => s.employees);
  const loading = useAdminStore((s) => s.loading);
  const error = useAdminStore((s) => s.error);
  const statusFilter = useAdminStore((s) => s.statusFilter);
  const nameFilter = useAdminStore((s) => s.nameFilter);
  const setStatusFilter = useAdminStore((s) => s.setStatusFilter);
  const setNameFilter = useAdminStore((s) => s.setNameFilter);
  const loadData = useAdminStore((s) => s.loadData);
  const reassignAnnualLeave = useAdminStore((s) => s.reassignAnnualLeave);

  const [leaveNumber, setLeaveNumber] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    loadData();
  }, [loadData, statusFilter]);

  async function handleReassign(e) {
    e.preventDefault();
    if (reassigning) return;

    if (leaveNumber.trim() === '') {
      toast.error('Enter a number of days');
      return;
    }

    const result = reassignSchema.safeParse(leaveNumber);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Enter a valid number');
      return;
    }

    setReassigning(true);
    const ok = await reassignAnnualLeave(result.data);
    setReassigning(false);
    if (ok) setLeaveNumber('');
  }

  const filtered = requests.filter((req) => {
    const name = displayName(req.user?.name);
    return name.toLowerCase().includes(nameFilter.toLowerCase());
  });
  const recentRequests = filtered.slice(0, 5);
  const recentEmployees = employees.slice(0, 5);

  const statusCounts = {
    PENDING: requests.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length,
    APPROVED: requests.filter((r) => (r.status || '').toUpperCase() === 'APPROVED').length,
    REJECTED: requests.filter((r) => (r.status || '').toUpperCase() === 'REJECTED').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
  <h1 className="text-2xl font-semibold text-foreground">Team Overview</h1>
  <p className="text-sm text-muted-foreground">
    Stay up to date with your team’s time-off requests and availability.
  </p>
</div>

          <form
            onSubmit={handleReassign}
            className="flex items-end gap-2 rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="space-y-1">
              <Label htmlFor="leaveNumber" className="text-xs text-muted-foreground">
                Reassign Annual Leave
              </Label>
              <Input
                id="leaveNumber"
                type="number"
                min="0"
                step="1"
                value={leaveNumber}
                onChange={(e) => setLeaveNumber(e.target.value)}
                placeholder="e.g. 5"
                className="h-8 w-24"
              />
            </div>
            <Button type="submit" size="sm" disabled={reassigning} className="h-8">
              {reassigning && <Loader2Icon className="animate-spin" />}
              Reassign
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="relative overflow-hidden border-border">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {employees.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">team members</p>
              </div>
              <IconTile>
                <UsersIcon className="size-6" />
              </IconTile>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {requests.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">time-off requests</p>
              </div>
              <IconTile>
                <ClipboardListIcon className="size-6" />
              </IconTile>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-end mt-3 ">
          <div className="space-y-2">
            <Label>Filter by Status</Label>
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={(value) => setStatusFilter(value === 'ALL' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nameFilter">Search by Name</Label>
            <Input
              id="nameFilter"
              type="text"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
        </div>

         <div className="flex flex-col mt-8">
              <h1 className="text-xl font-semibold">Recent Requests</h1>
              <span>The 5 most recent time-off requests.</span>
            </div>
        <Card className="overflow-hidden -mt-4">
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b bg-muted/30">
            <IconTile>
              <ClipboardListIcon className="size-5" />
            </IconTile>
            <div className="hidden items-center gap-1.5 sm:flex">
              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                {statusCounts.PENDING} pending
              </Badge>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                {statusCounts.APPROVED} approved
              </Badge>
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                {statusCounts.REJECTED} rejected
              </Badge>
            </div>
            <Button className='w-max ml-auto' variant="outline" size="sm" asChild>
              <Link to={URLs.ALL_REQUESTS}>
                View all
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <p className="px-6 py-6 text-sm text-muted-foreground">Loading...</p>
            )}
            {error && (
              <p className="px-6 py-4 text-sm text-destructive">{error}</p>
            )}
            {!loading && !error && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Employee</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No leave requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {displayName(req.user?.name)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req.user?.email}
                          </p>
                        </TableCell>
                        <TableCell>{req.startDate?.split('T')[0]}</TableCell>
                        <TableCell>{req.endDate?.split('T')[0]}</TableCell>
                        <TableCell>{req.days}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(req.status)}`}
                          >
                            {(req.status || '').toUpperCase()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    <div className="flex flex-col mt-8">
              <h1 className="text-xl font-semibold">Employees</h1>
              <span>The 5 most recently added employees</span>
            </div>
        <Card className="overflow-hidden -mt-4">
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b bg-muted/30">
            <IconTile>
              <UsersIcon className="size-5" />
            </IconTile>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              {employees.length} total
            </Badge>
            <Button className='ml-auto w-max' variant="outline" size="sm" asChild>
              <Link to={URLs.ALL_EMPLOYEES}>
                View all
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading && employees.length === 0 && (
              <p className="px-6 py-6 text-sm text-muted-foreground">Loading...</p>
            )}
            {!loading && employees.length === 0 && (
              <p className="px-6 py-6 text-sm text-muted-foreground">No employees found</p>
            )}
            {employees.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Leave Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEmployees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/30">
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
