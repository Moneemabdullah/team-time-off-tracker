import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,

  // PLACEHOLDER — replace with a real API call (e.g. POST /auth/login) once
  // the backend exposes authentication. The backend response must provide
  // { name, email, role: 'admin' | 'employee' } — that role drives the
  // post-login redirect in LoginPage and the route guards in App.jsx.
  login: async (email) => {
    const user = {
      name: email.split('@')[0],
      email,
      role: email.toLowerCase().startsWith('admin') ? 'admin' : 'employee',
    };
    set({ user });
    return user;
  },

  logout: () => {
    set({ user: null });
  },
}));
