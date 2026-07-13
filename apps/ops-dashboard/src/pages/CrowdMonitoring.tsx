import React, { useEffect, useState } from 'react';
import { useOpsStore } from '../store/opsStore';
import { dashboardService, CrowdZone } from '../services/dashboard';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export const CrowdMonitoring: React.FC = () => {
  const store = useOpsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const heatmap = await dashboardService.getCrowdHeatmap();
        store.setCrowdMetrics(heatmap);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const zones: CrowdZone[] = store.crowdMetrics;

  const filteredZones = zones.filter((z) => {
    const matchesSearch = z.zone_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'All' || z.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const peakZone = zones.reduce<CrowdZone | null>(
    (max, z) => (!max || z.occupancy_pct > max.occupancy_pct ? z : max),
    null
  );
  const totalHeadcount = zones.reduce((sum, z) => sum + z.headcount, 0);
  const criticalCount = zones.filter((z) => z.status === 'Critical').length;

  const getStatusColor = (status: string) => {
    if (status === 'Critical') return 'bg-[#EF4444]';
    if (status === 'Busy' || status === 'Moderate') return 'bg-[#F59E0B]';
    return 'bg-[#22C55E]';
  };

  const getStatusText = (status: string) => {
    if (status === 'Critical') return 'text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/10';
    if (status === 'Busy' || status === 'Moderate') return 'text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/10';
    return 'text-[#22C55E] border-[#22C55E]/20 bg-[#22C55E]/10';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">
        Loading crowd data...
      </div>
    );
  }

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#00A8FF]/20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">Crowd Intelligence & Density</h1>
        <p className="text-[#94A3B8] text-xs mt-1">Live zone data from /api/v1/crowd/heatmap</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Total Headcount</span>
          <div className="text-xl font-extrabold text-[#00E5FF] font-display">{totalHeadcount.toLocaleString()}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Zones Monitored</span>
          <div className="text-xl font-extrabold text-[#22C55E] font-display">{zones.length}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Critical Zones</span>
          <div className="text-xl font-extrabold text-[#EF4444] font-display">{criticalCount}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Peak Occupancy Zone</span>
          <div className="text-xl font-extrabold text-[#EF4444] font-display truncate">
            {peakZone ? `${peakZone.zone_name} (${peakZone.occupancy_pct.toFixed(0)}%)` : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl h-[420px] flex flex-col">
          <div>
            <h3 className="text-base font-bold text-white tracking-wider">Live Zone Heatmap</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">Real-time occupancy states</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 flex-1 overflow-y-auto">
            {zones.length > 0 ? (
              zones.map((z) => (
                <div key={z.zone_id} className="p-4 bg-[#111A33] border border-white/5 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-semibold text-white truncate">{z.zone_name}</span>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-bold text-gray-300">{z.occupancy_pct.toFixed(0)}%</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(z.status)} pulse-indicator`} />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-[#94A3B8] text-xs text-center py-8">No zones configured.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl h-[420px] flex flex-col">
          <div>
            <h3 className="text-base font-bold text-white tracking-wider">Capacity Saturation</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">Occupancy % per zone</p>
          </div>
          <div className="w-full h-[280px] mt-6">
            {zones.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones.map((z) => ({ name: z.zone_name, occupancy: z.occupancy_pct }))}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111A33', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                  <Bar dataKey="occupancy" fill="#00A8FF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#94A3B8] text-xs">No data to chart.</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 space-y-3 md:space-y-0">
          <div>
            <h3 className="text-base font-bold text-white tracking-wider">Live Zone Aggregates</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">Search and filter active zones</p>
          </div>
          <div className="flex space-x-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111A33] border border-white/10 px-4 py-2 rounded-xl text-xs outline-none text-white placeholder-gray-500 focus:border-[#00A8FF] w-full md:w-48"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#111A33] border border-white/10 px-3 py-2 rounded-xl text-xs outline-none text-white focus:border-[#00A8FF]"
            >
              <option value="All">All Statuses</option>
              <option value="Normal">Normal</option>
              <option value="Busy">Busy</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[#94A3B8] border-b border-white/5">
                <th className="py-3 px-4 font-bold uppercase tracking-wider">Zone</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">Headcount</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {filteredZones.length > 0 ? (
                filteredZones.map((z) => (
                  <tr key={z.zone_id} className="border-b border-white/5 hover:bg-[#111A33]/20 transition-colors">
                    <td className="py-4 px-4 font-semibold text-white">{z.zone_name}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${getStatusText(z.status)}`}>
                        {z.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white font-mono">{z.headcount.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-[#111A33] rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${getStatusColor(z.status)}`} style={{ width: `${Math.min(z.occupancy_pct, 100)}%` }} />
                        </div>
                        <span className="font-mono text-gray-300 font-bold">{z.occupancy_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No zones match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default CrowdMonitoring;
