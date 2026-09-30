import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/Loader';
import { URLs } from '@/lib/URLs';
import { useAuthStore } from '@/store/authStore';

function homePathFor(user) {
  return user?.role === 'admin' ? URLs.ADMIN : URLs.EMPLOYEE;
}

/** Sends every visitor to the home route for their role (login if signed out). */
export function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={homePathFor(user)} replace />;
}

/**
 * Guest pages only (the login screen): a signed-in user is bounced to their
 * home route. After a refresh the token outlives the in-memory user, so the
 * session is resolved first and the login form only appears once we know there
 * is no session.
 */
export function GuestRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (status === 'loading' && !user) {
      fetchMe();
    }
  }, [status, user, fetchMe]);

  if (status === 'loading' && !user) {
    return <PageLoader />;
  }
  if (user) {
    return <Navigate to={homePathFor(user)} replace />;
  }
  return children;
}
