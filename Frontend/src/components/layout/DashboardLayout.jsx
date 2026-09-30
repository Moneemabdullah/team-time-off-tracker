import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarPlusIcon,
  InboxIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ChatPanel from '@/components/ChatPanel';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { URLs } from '@/lib/URLs';



const linkClasses = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
    isActive
      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
  }`;

function DashboardLayout({ children }) {
  const user = useAuthStore((s) => s.user);
  const unread = useChatStore((s) =>
    s.threads.reduce((total, t) => total + t.unread, 0)
  );
  const NAV_ITEMS = {
  employee: [
    // `end` so /employee only highlights on the exact path — otherwise it
    // prefix-matches /employee/change-password and /employee/:id/requests too.
    { to: URLs.EMPLOYEE, label: 'New Request', icon: CalendarPlusIcon, end: true },
    {
    to: `${URLs.EMPLOYEE_REQUESTS.replace(':id', user.id)}`,
    label: 'My Requests',
    icon: InboxIcon,
  },
    { to: URLs.CHANGE_PASSWORD, label: 'Change Password', icon: KeyRoundIcon },
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
  const initials = (user?.name || 'Guest')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

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
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </p>
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
          <div className="space-y-2.5 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name || 'Guest'}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit capitalize">
              {role}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOutIcon />
            Logout
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 shadow-sm backdrop-blur">
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
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={unread > 0 ? `Chat (${unread} unread)` : 'Chat'}
              onClick={() => useChatStore.getState().toggle()}
            >
              <MessageSquareIcon />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-4 text-destructive-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
            <Badge variant="outline" className="capitalize lg:hidden">
              {role}
            </Badge>
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground lg:hidden">
              {initials}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
        <ChatPanel />
      </div>
    </div>
  );
}

export default DashboardLayout;
