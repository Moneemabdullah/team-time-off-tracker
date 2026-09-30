import { useAuthStore } from '@/store/authStore';
import AdminDashboard from './admin/AdminDashboard';
import EmployeePage from './EmployeePage';

const HomePage = () => {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return null;
  }

  return user.role === 'admin' ? <AdminDashboard /> : <EmployeePage />;
};

export default HomePage;