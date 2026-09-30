import { create } from 'zustand';
import toast from 'react-hot-toast';
import AxiosInstance from '@/lib/axiosInstance';

export const useAdminStore = create((set, get) => ({
  requests: [],
  employees: [],
  loading: true,
  error: '',
  statusFilter: '',
  nameFilter: '',
  updatingId: null,
  addingEmployee: false,
  reassigning: false,

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setNameFilter: (nameFilter) => set({ nameFilter }),

  loadData: async () => {
    const { statusFilter } = get();
    set({ loading: true, error: '' });
    try {
      // limit=100 is interim until the list gets real pagination controls;
      // the API defaults to 10 per page.
      const [reqs, users] = await Promise.all([
        AxiosInstance.get('/admin/requests', {
          params: { limit: 100, ...(statusFilter ? { status: statusFilter } : {}) },
        }),
        AxiosInstance.get('/admin/users'),
      ]);
      set({
        requests: reqs.data.data || [],
        employees: users.data.data || [],
      });
    } catch (err) {
      set({ error: err.message || 'Failed to load data' });
    } finally {
      set({ loading: false });
    }
  },

  refreshEmployees: async () => {
    try {
      const { data } = await AxiosInstance.get('/admin/users');
      set({ employees: data.data || [] });
    } catch {
      toast.error('Failed to refresh employees');
      set({ employees: [] });
    }
  },

  updateRequestStatus: async (id, status) => {
    if (get().updatingId) return false;
    set({ updatingId: id });
    try {
      const { data } = await AxiosInstance.patch(`/admin/requests/${id}`, { status });
      set((state) => ({
        requests: state.requests.map((r) =>
          r.id === id ? { ...r, ...data.data } : r
        ),
      }));
      toast.success(`Request ${status.toLowerCase()} successfully`);
      await get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
      return false;
    } finally {
      set({ updatingId: null });
    }
  },

  reassignAnnualLeave: async (number) => {
    if (get().reassigning) return false;
    set({ reassigning: true });
    try {
      await AxiosInstance.post('/admin/users/reassign-annual-leave', { number });
      toast.success('Annual leave reassigned successfully');
      await get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to reassign annual leave');
      return false;
    } finally {
      set({ reassigning: false });
    }
  },

  addEmployee: async ({ name, email, password }) => {
    if (get().addingEmployee) return false;
    set({ addingEmployee: true });
    try {
      await AxiosInstance.post('/admin/users', { name, email, password });
      toast.success('Employee added successfully');
      await get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to add employee');
      return false;
    } finally {
      set({ addingEmployee: false });
    }
  },
}));
