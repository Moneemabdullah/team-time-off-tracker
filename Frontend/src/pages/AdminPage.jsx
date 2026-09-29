import { useState, useEffect } from 'react';
import './AdminPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AdminPage() {
  const [requests, setRequests] = useState([]);
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

        const url = `${API_BASE}/requests${params.toString() ? '?' + params : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch requests');
        const data = await res.json();
        if (!cancelled) setRequests(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [statusFilter]);

  async function handleStatusUpdate(id, status) {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: status.toLowerCase() } : r))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  function getStatusClass(status) {
    return `status-badge status-${status}`;
  }

  const filtered = requests.filter((req) => {
    const name = req.employee?.name || req.employeeId || '';
    return name.toLowerCase().includes(nameFilter.toLowerCase());
  });

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="statusFilter">Filter by Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="nameFilter">Filter by Name</label>
          <input
            id="nameFilter"
            type="text"
            placeholder="Search by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="message">Loading...</p>}
      {error && <p className="message error">{error}</p>}

      {!loading && !error && (
        <div className="requests-table-wrapper">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">No requests found</td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req._id}>
                    <td>{req.employee?.name || req.employeeId}</td>
                    <td>{req.startDate?.split('T')[0]}</td>
                    <td>{req.endDate?.split('T')[0]}</td>
                    <td>{req.reason}</td>
                    <td>
                      <span className={getStatusClass(req.status)}>
                        {req.status}
                      </span>
                    </td>
                    <td>{req.days}</td>
                    <td>
                      {req.status === 'pending' && (
                        <div className="action-buttons">
                          <button
                            className="btn-approve"
                            onClick={() => handleStatusUpdate(req._id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleStatusUpdate(req._id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
