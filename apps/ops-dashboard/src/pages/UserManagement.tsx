import React, { useEffect, useState } from 'react';
import { dashboardService, UserRecord } from '../services/dashboard';
import { parseApiError } from '../utils/apiError';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dashboardService.searchUsers({ limit: 50 });
        setUsers(data);
      } catch (err: unknown) {
        setError(parseApiError(err, 'Unable to load users.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.roles.some((r) => r.name.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = users.filter((u) => u.is_active).length;

  const displayName = (u: UserRecord) => {
    const first = u.profile?.first_name;
    const last = u.profile?.last_name;
    if (first || last) return `${first || ''} ${last || ''}`.trim();
    return u.email.split('@')[0];
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">Loading users...</div>;
  }

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#00A8FF]/20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">User & Console Control</h1>
        <p className="text-[#94A3B8] text-xs mt-1">Live operator registry from /api/v1/users/search</p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Total Users</span>
          <div className="text-xl font-extrabold text-[#00A8FF] font-display">{users.length}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Active Accounts</span>
          <div className="text-xl font-extrabold text-[#22C55E] font-display">{activeCount}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Inactive Accounts</span>
          <div className="text-xl font-extrabold text-[#F59E0B] font-display">{users.length - activeCount}</div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-wider">Operator Registry</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">{filtered.length} users shown</p>
          </div>
          <input
            type="text"
            placeholder="Search by email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111A33] border border-white/10 px-4 py-2 rounded-xl text-xs outline-none text-white w-full md:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[#94A3B8] border-b border-white/5">
                <th className="py-3 px-4 font-bold uppercase">Name</th>
                <th className="py-3 px-4 font-bold uppercase">Email</th>
                <th className="py-3 px-4 font-bold uppercase">Role</th>
                <th className="py-3 px-4 font-bold uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-[#111A33]/20">
                    <td className="py-4 px-4 font-semibold text-white">{displayName(u)}</td>
                    <td className="py-4 px-4 text-[#94A3B8] font-mono">{u.email}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex px-2.5 py-0.5 text-[9px] font-bold bg-[#00A8FF]/10 text-[#00A8FF] border border-[#00A8FF]/20 rounded uppercase">
                        {u.roles.map((r) => r.name).join(', ') || 'None'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                        u.is_active
                          ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                          : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default UserManagement;
