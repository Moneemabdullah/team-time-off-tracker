import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarPlusIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { URLs } from '@/lib/URLs';



const linkClasses = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  }`;

function DashboardLayout({ children }) {
  const user = useAuthStore((s) => s.user);
  const NAV_ITEMS = {
  employee: [{ to: URLs.EMPLOYEE, label: 'New Request', icon: CalendarPlusIcon },
    {
    to: `${URLs.EMPLOYEE_REQUESTS.replace(':id', user.id)}`,
    label: 'My Requests',
    icon: InboxIcon,
  },
  ],
  admin: [
    { to: URLs.ADMIN, label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
    { to: URLs.ALL_EMPLOYEES, label: 'All Employees', icon: UsersIcon },
    { to: URLs.ALL_REQUESTS, label: 'All Requests', icon: InboxIcon },
    { to: URLs.ADD_EMPLOYEE, label: 'Add Employee', icon: UserPlusIcon },
  ],
};
  const [open, setOpen] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const role = user?.role || 'employee';
  const items = NAV_ITEMS[role];

  function handleLogout() {
    logout();
    navigate(URLs.LOGIN, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-primary/30">
              <img
                src="/time-tracker-logo.webp"
                alt="Time Off Tracker logo"
                className="size-full rounded-lg object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">
              Time Off Tracker
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <XIcon />
          </Button>
        </div>

        <Separator className="my-4" />

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClasses}
              onClick={() => setOpen(false)}
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <Separator />
          <div className="px-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name || 'Guest'}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
            <Badge variant="secondary" className="mt-2 capitalize">
              {role}
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOutIcon />
            Logout
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">
            {role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'}
          </h1>
          <Badge variant="outline" className="ml-auto capitalize lg:hidden">
            {role}
          </Badge>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
