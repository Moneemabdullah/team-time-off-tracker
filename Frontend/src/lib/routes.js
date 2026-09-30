import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import EmployeePage from '@/pages/EmployeePage';
import MyRequestsPage from '@/pages/MyRequestsPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AllEmployeesPage from '@/pages/admin/AllEmployeesPage';
import AllRequestsPage from '@/pages/admin/AllRequestsPage';
import AddEmployeePage from '@/pages/admin/AddEmployeePage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import { URLs } from '@/lib/URLs';

export const AllRoutes = [
  {
    path: '/',
    element: HomePage,
    isProtected: true,
  },
  {
    path: URLs.LOGIN,
    element: LoginPage,
  },
  {
    path: URLs.EMPLOYEE,
    element: EmployeePage,
    role: 'employee',
    isProtected: true,
  },
  {
    path: URLs.EMPLOYEE_REQUESTS,
    element: MyRequestsPage,
    role: 'employee',
    isProtected: true,
  },
  {
    path: URLs.CHANGE_PASSWORD,
    element: ChangePasswordPage,
    role: 'employee',
    isProtected: true,
  },
  {
    path: URLs.ADMIN,
    element: AdminDashboard,
    role: 'admin',
    isProtected: true,
  },
  {
    path: URLs.ALL_EMPLOYEES,
    element: AllEmployeesPage,
    role: 'admin',
    isProtected: true,
  },
  {
    path: URLs.ALL_REQUESTS,
    element: AllRequestsPage,
    role: 'admin',
    isProtected: true,
  },
  {
    path: URLs.ADD_EMPLOYEE,
    element: AddEmployeePage,
    role: 'admin',
    isProtected: true,
  },
];