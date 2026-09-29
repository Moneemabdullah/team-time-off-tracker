import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import EmployeePage from './pages/EmployeePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AllEmployeesPage from './pages/admin/AllEmployeesPage';
import AllRequestsPage from './pages/admin/AllRequestsPage';
import AddEmployeePage from './pages/admin/AddEmployeePage';
import { useAuthStore } from './store/authStore';

function RequireAuth({ role, children }) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  }
  return children;
}

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/employee"
          element={
            <RequireAuth role="employee">
              <EmployeePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <RequireAuth role="admin">
              <AllEmployeesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <RequireAuth role="admin">
              <AllRequestsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/add-employee"
          element={
            <RequireAuth role="admin">
              <AddEmployeePage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/employee" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
