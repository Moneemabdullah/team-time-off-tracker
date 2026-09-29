import { create } from 'zustand';
import toast from 'react-hot-toast';
import { apiRequest } from '@/lib/api';

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
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const [reqs, emps] = await Promise.all([
        apiRequest(`/requests${qs}`),
        apiRequest('/employees'),
      ]);
      console.log('Fetched requests:', reqs);
      set({ requests: reqs, employees: emps });
    } catch (err) {
      set({ error: err.message || 'Failed to load data' });
    } finally {
      set({ loading: false });
    }
  },

  refreshEmployees: async () => {
    try {
      const emps = await apiRequest('/employees');
      set({ employees: emps });
    } catch {
      // keep the current list if the refresh fails
    }
  },

  updateRequestStatus: async (id, status) => {
    try {
      const updated = await apiRequest(`/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      set((state) => ({
        requests: state.requests.map((r) => (r.id === id ? updated : r)),
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
      await apiRequest('/employees/reassign-annual-leave', {
        method: 'POST',
        body: JSON.stringify({ number }),
      });
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
      await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });
      toast.success('Employee added successfully');
      get().refreshEmployees();
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to add employee');
      return false;
    }
  },
}));
