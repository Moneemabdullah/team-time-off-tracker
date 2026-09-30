import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AllRoutes } from './lib/routes';
import ProtectedRoute from './components/ProtectedRoute';
import { connectSocket, disconnectSocket } from './lib/socket';
import { displayName } from './lib/chatCodec';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import { useAdminStore } from './store/adminStore';
import { URLs } from './lib/URLs';

// One socket for the whole app: `leave:urgent` reaches connected admins,
// `leave:decision` reaches the owning employee (urgent requests only — the
// backend emits it that way). Both payloads are full request objects.
function SocketBridge() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    const socket = connectSocket();

    function onUrgent(payload) {
      const who = displayName(payload?.user?.name) || 'An employee';
      toast(`🚨 Urgent leave request from ${who}`);
      useChatStore.getState().refresh();
      if (window.location.pathname === URLs.ALL_REQUESTS) {
        useAdminStore.getState().loadAllRequests();
      }
    }

    function onDecision(payload) {
      const statusText = String(payload?.status || '').toLowerCase();
      toast.success(`Your request was ${statusText}`);
      useChatStore.getState().refresh();
      // Balance changed on approval — refresh it without a status flicker.
      useAuthStore.getState().refreshUser();
      if (window.location.pathname.startsWith('/employee')) {
        window.dispatchEvent(new CustomEvent('requests:refresh'));
      }
    }

    socket.on('leave:urgent', onUrgent);
    socket.on('leave:decision', onDecision);
    return () => {
      socket.off('leave:urgent', onUrgent);
      socket.off('leave:decision', onDecision);
      disconnectSocket();
    };
  }, [status]);

  return null;
}

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <SocketBridge />
      <Routes>
        {AllRoutes.map(
          ({ path, element: Element, isProtected, role }, index) => (
            <Route
              key={index}
              path={path}
              element={
                isProtected ? (
                  <ProtectedRoute role={role}>
                    <Element />
                  </ProtectedRoute>
                ) : (
                  <Element />
                )
              }
            />
          )
        )}
      </Routes>
    </>
  );
}

export default App;
