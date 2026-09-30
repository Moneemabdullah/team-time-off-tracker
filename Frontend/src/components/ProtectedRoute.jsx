import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { URLs } from '@/lib/URLs';
import { PageLoader } from '@/components/Loader';

const HOME_BY_ROLE = {
  admin: URLs.ADMIN,
  employee: URLs.EMPLOYEE,
};

function homeFor(role) {
  return HOME_BY_ROLE[role] || URLs.EMPLOYEE;
}

const ProtectedRoute = ({ role, children }) => {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // A page refresh keeps the token in session storage but not the in-memory
  // user, so the first visit to a protected route re-reads the profile from
  // the API.
  useEffect(() => {
    if (status === 'loading' && !user) {
      fetchMe();
    }
  }, [status, user, fetchMe]);

  if (status === 'loading' && !user) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={URLs.LOGIN} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
