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

  // All Requests page: server-side pagination, 10 per page, mirroring the
  // employee's My Requests page. Separate from `requests`, which the
  // dashboard loads in one batch for its counts and recent lists.
  allRequests: [],
  allRequestsMeta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  allRequestsPage: 1,
  allRequestsStatus: '',
  allRequestsLoading: true,
  allRequestsError: '',

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setNameFilter: (nameFilter) => set({ nameFilter }),

  setAllRequestsPage: (page) =>
    set({ allRequestsPage: page, allRequestsLoading: true, allRequestsError: '' }),

  setAllRequestsStatus: (status) =>
    set({
      allRequestsStatus: status,
      allRequestsPage: 1,
      allRequestsLoading: true,
      allRequestsError: '',
    }),

  loadAllRequests: async () => {
    const { allRequestsPage, allRequestsStatus } = get();
    set({ allRequestsLoading: true, allRequestsError: '' });
    try {
      const { data } = await AxiosInstance.get('/admin/requests', {
        params: {
          page: allRequestsPage,
          limit: 10,
          ...(allRequestsStatus ? { status: allRequestsStatus } : {}),
        },
      });
      // A page/filter change issued while this response was in flight wins.
      if (
        get().allRequestsPage !== allRequestsPage ||
        get().allRequestsStatus !== allRequestsStatus
      ) {
        return;
      }
      const meta = data.meta || {
        total: 0,
        page: allRequestsPage,
        limit: 10,
        totalPages: 1,
      };
      // The requested page no longer exists (e.g. a filter emptied it) —
      // step back to the real last page; this triggers a refetch.
      if (meta.totalPages >= 1 && meta.page > meta.totalPages) {
        set({ allRequestsPage: meta.totalPages });
        return;
      }
      set({
        allRequests: data.data || [],
        allRequestsMeta: meta,
        allRequestsLoading: false,
      });
    } catch (err) {
      if (
        get().allRequestsPage !== allRequestsPage ||
        get().allRequestsStatus !== allRequestsStatus
      ) {
        return;
      }
      set({
        allRequestsError: err.message || 'Failed to load requests',
        allRequestsLoading: false,
      });
    }
  },

  loadData: async () => {
    const { statusFilter } = get();
    set({ loading: true, error: '' });
    try {
      // Dashboard feed: counts + the 5 most recent rows. The All Requests
      // page uses loadAllRequests instead (10 per page, real pagination).
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
