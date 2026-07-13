import React, { useEffect, useState } from 'react';
import { useOpsStore } from '../store/opsStore';
import { dashboardService, CrowdZone } from '../services/dashboard';
import { parseApiError } from '../utils/apiError';

export const EmergencyManagement: React.FC = () => {
  const store = useOpsStore();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Medical Emergency');
  const [severity, setSeverity] = useState('Critical');
  const [zone, setZone] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<CrowdZone[]>([]);
  const [dashMetrics, setDashMetrics] = useState<{
    active_incidents_count: number;
    sla_compliance_rate: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [heatmap, incidents, dashboard] = await Promise.all([
          dashboardService.getCrowdHeatmap(),
          dashboardService.getIncidents(),
          dashboardService.getIncidentDashboard(),
        ]);
        setZones(heatmap);
        store.setIncidents(incidents);
        setDashMetrics(dashboard);
        if (heatmap.length > 0 && !zone) setZone(heatmap[0].zone_id);
      } catch {
        // empty states shown
      }
    };
    load();
  }, []);

  const zoneName = (zoneId: string) => zones.find((z) => z.zone_id === zoneId)?.zone_name || zoneId;

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      setError('Description is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await dashboardService.createIncident({
        title,
        description: desc,
        type,
        severity,
        zone_id: zone,
      });
      store.addIncident(created);
      setTitle('');
      setDesc('');
    } catch (err: unknown) {
      setError(parseApiError(err, 'Failed to dispatch incident.'));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    if (sev === 'Critical') return 'text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/10';
    if (sev === 'High') return 'text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/10';
    return 'text-[#00A8FF] border-[#00A8FF]/20 bg-[#00A8FF]/10';
  };

  const activeIncidents = store.incidents.filter((i) => i.status !== 'Resolved');
  const medicalCount = activeIncidents.filter((i) => i.type.includes('Medical')).length;
  const securityCount = activeIncidents.filter((i) => i.type.includes('Security') || i.type.includes('Crowd')).length;
  const dispatchedCount = activeIncidents.filter((i) => i.status === 'Dispatched' || i.status === 'Active').length;

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#00A8FF]/20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">Emergency Response Control</h1>
        <p className="text-[#94A3B8] text-xs mt-1">Live incident dispatch via /api/v1/emergencies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Active Medical</span>
          <div className="text-xl font-extrabold text-[#EF4444] font-display">{medicalCount}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Security / Crowd</span>
          <div className="text-xl font-extrabold text-[#F59E0B] font-display">{securityCount}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">SLA Compliance</span>
          <div className="text-xl font-extrabold text-[#22C55E] font-display">
            {dashMetrics ? `${dashMetrics.sla_compliance_rate.toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Dispatched / Active</span>
          <div className="text-xl font-extrabold text-[#00A8FF] font-display">{dispatchedCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl h-[420px] flex flex-col">
          <div>
            <h3 className="text-base font-bold text-white tracking-wider">Incident Timeline</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">{activeIncidents.length} active incidents</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 mt-6">
            {activeIncidents.length > 0 ? (
              activeIncidents.map((inc) => (
                <div key={inc.id} className="flex justify-between items-center p-4 bg-[#111A33] rounded-xl border border-white/5">
                  <div>
                    <div className="text-sm font-semibold text-white">{inc.title}</div>
                    <p className="text-xs text-gray-400 mt-1">{inc.description}</p>
                    <div className="text-[10px] text-gray-500 mt-2 font-mono">
                      {new Date(inc.reported_at).toLocaleString()} — {zoneName(inc.zone_id)}
                    </div>
                  </div>
                  <div className="text-right flex flex-col space-y-2 items-end">
                    <span className={`inline-flex px-2.5 py-0.5 text-[9px] font-bold rounded border uppercase ${getSeverityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <span className="text-[10px] font-bold text-[#00E5FF] uppercase">{inc.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs">
                No active incidents. All zones secure.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl h-[420px] flex flex-col">
          <div>
            <h3 className="text-base font-bold text-[#EF4444] tracking-wider">Dispatch Incident</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">Creates a real emergency record</p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl">{error}</div>
          )}

          <form onSubmit={handleDispatch} className="space-y-4 mt-4 flex-1">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] text-[#94A3B8] font-bold uppercase">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#111A33] border border-white/10 px-3.5 py-2.5 rounded-xl text-xs outline-none text-white focus:border-[#EF4444]"
                required
                minLength={3}
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] text-[#94A3B8] font-bold uppercase">Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="bg-[#111A33] border border-white/10 px-3.5 py-2.5 rounded-xl text-xs outline-none text-white focus:border-[#EF4444] h-16 resize-none"
                required
                minLength={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[9px] text-[#94A3B8] font-bold uppercase">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="bg-[#111A33] border border-white/10 px-3 py-2.5 rounded-xl text-xs outline-none text-white"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <label className="text-[9px] text-[#94A3B8] font-bold uppercase">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-[#111A33] border border-white/10 px-3 py-2.5 rounded-xl text-xs outline-none text-white"
                >
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Security Threat">Security Threat</option>
                  <option value="Fire Alarm">Fire Alarm</option>
                  <option value="Crowd Stampede Risk">Crowd Stampede Risk</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[9px] text-[#94A3B8] font-bold uppercase">Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="bg-[#111A33] border border-white/10 px-3 py-2.5 rounded-xl text-xs outline-none text-white"
                required
              >
                {zones.map((z) => (
                  <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || zones.length === 0}
              className="w-full bg-[#EF4444] hover:bg-[#d83535] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest"
            >
              {loading ? 'Dispatching...' : 'Broadcast Alert'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default EmergencyManagement;
