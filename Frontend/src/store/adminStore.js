import { create } from 'zustand';
import toast from 'react-hot-toast';
import AxiosInstance from '@/lib/axiosInstance';

// The API lists every account; the dashboard and "All Employees" page are
// about the team, so admins are left out.
const asTeam = (users) => (users || []).filter((u) => u.role !== 'ADMIN');

export const useAdminStore = create((set, get) => ({
  requests: [],
  employees: [],
  loading: true,
  error: '',
  statusFilter: '',
  nameFilter: '',

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setNameFilter: (nameFilter) => set({ nameFilter }),

  loadData: async () => {
    const { statusFilter } = get();
    set({ loading: true, error: '' });
    try {
      const [reqs, users] = await Promise.all([
        AxiosInstance.get('/requests', {
          params: statusFilter ? { status: statusFilter } : {},
        }),
        AxiosInstance.get('/users'),
      ]);
      set({
        requests: reqs.data.data || [],
        employees: asTeam(users.data.data),
      });
    } catch (err) {
      set({ error: err.message || 'Failed to load data' });
    } finally {
      set({ loading: false });
    }
  },

  refreshEmployees: async () => {
    try {
      const { data } = await AxiosInstance.get('/users');
      set({ employees: asTeam(data.data) });
    } catch {
      // keep the current list if the refresh fails
    }
  },

  updateRequestStatus: async (id, status) => {
    try {
      const { data } = await AxiosInstance.patch(`/requests/${id}`, { status });
      set((state) => ({
        requests: state.requests.map((r) =>
          r.id === id ? { ...r, ...data.data } : r
        ),
      }));
      toast.success(`Request ${status.toLowerCase()} successfully`);
      get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
      return false;
    }
  },

  reassignAnnualLeave: async (number) => {
    try {
      await AxiosInstance.post('/users/reassign-annual-leave', { number });
      toast.success('Annual leave reassigned successfully');
      get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to reassign annual leave');
      return false;
    }
  },

  addEmployee: async ({ name, email }) => {
    try {
      await AxiosInstance.post('/employees', { name, email });
      toast.success('Employee added successfully');
      get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to add employee');
      return false;
    }
  },
}));
