import { create } from 'zustand';
import AxiosInstance, { clearToken, getToken, setToken } from '@/lib/axiosInstance';
import { displayName } from '@/lib/chatCodec';

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    // Chat lives inside `name` as JSON once a thread exists; the UI always
    // shows the unwrapped display name.
    name: displayName(user.name),
    email: user.email,
    // The API returns 'ADMIN' | 'EMPLOYEE'; the UI uses lowercase roles.
    role: user.role === 'ADMIN' ? 'admin' : 'employee',
    annualLeaveBalance: user.annualLeaveBalance,
  };
}

// One shared in-flight promise, so React's StrictMode double-mount cannot fire
// GET /users/me twice.
let meRequest = null;

export const useAuthStore = create((set) => ({
  user: null,
  // 'loading' -> a token exists but the user is not resolved yet
  status: getToken() ? 'loading' : 'unauthenticated',

  login: async (email, password) => {
    const { data } = await AxiosInstance.post('/auth/login', { email, password });
    const { token, user: rawUser } = data.data;

    setToken(token);

    const user = normalizeUser(rawUser);
    set({ user, status: 'authenticated' });
    return user;
  },

  // Re-reads the profile after a refresh, when the token survived in session
  // storage but the in-memory user did not.
  fetchMe: () => {
    if (meRequest) return meRequest;

    if (!getToken()) {
      set({ user: null, status: 'unauthenticated' });
      return Promise.resolve(null);
    }

    set({ status: 'loading' });

    meRequest = AxiosInstance.get('/users/me')
      .then(({ data }) => {
        const user = normalizeUser(data.data);
        set({ user, status: 'authenticated' });
        return user;
      })
      .catch(() => {
        clearToken();
        set({ user: null, status: 'unauthenticated' });
        return null;
      })
      .finally(() => {
        meRequest = null;
      });

    return meRequest;
  },

  logout: () => {
    clearToken();
    set({ user: null, status: 'unauthenticated' });
  },

  // Silent profile refresh (keeps `status` untouched so the socket does not
  // reconnect) — used after a socket push says the balance changed.
  refreshUser: async () => {
    if (!getToken()) return;
    try {
      const { data } = await AxiosInstance.get('/users/me');
      set({ user: normalizeUser(data.data) });
    } catch {
      // A 401 is handled by the axios interceptor; anything else is retried
      // by the next fetchMe/login.
    }
  },
}));
