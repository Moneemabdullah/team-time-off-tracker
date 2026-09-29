import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '../lib/api';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
};

function AdminPage() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);

        const qs = params.toString() ? `?${params.toString()}` : '';
        const [reqs, emps] = await Promise.all([
          apiRequest(`/requests${qs}`),
          apiRequest('/employees'),
        ]);
        if (!cancelled) {
          setRequests(reqs);
          setEmployees(emps);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  async function handleStatusUpdate(id, status) {
    try {
      const updated = await apiRequest(`/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success(`Request ${status.toLowerCase()} successfully`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  }

  const filtered = requests.filter((req) => {
    const name = req.employee?.name || '';
    return name.toLowerCase().includes(nameFilter.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold text-gray-900">Admin Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Employees</h2>
          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {!loading && employees.length === 0 && (
            <p className="text-sm text-gray-500">No employees found</p>
          )}
          {employees.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <li key={emp.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {emp.annualLeaveBalance} days left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Filters</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="statusFilter" className="mb-1 block text-sm font-medium text-gray-700">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label htmlFor="nameFilter" className="mb-1 block text-sm font-medium text-gray-700">
                Filter by Name
              </label>
              <input
                id="nameFilter"
                type="text"
                placeholder="Search by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="mb-4 text-sm text-gray-500">Loading requests...</p>}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Employee</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Start Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">End Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Days</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                filtered.map((req) => {
                  const status = (req.status || '').toUpperCase();
                  const isPending = status === 'PENDING';
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{req.employee?.name}</p>
                        <p className="text-xs text-gray-500">{req.employee?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {req.startDate?.split('T')[0]}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {req.endDate?.split('T')[0]}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{req.reason}</td>
                      <td className="px-4 py-3 text-gray-700">{req.days}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_BADGE[status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isPending ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
