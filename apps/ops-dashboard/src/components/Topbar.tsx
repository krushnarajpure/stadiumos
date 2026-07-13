import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOpsStore } from '../store/opsStore';
import { dashboardService } from '../services/dashboard';
import { Clock, Bell, ShieldAlert, Cpu } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const wsConnected = useOpsStore((state) => state.wsConnected);
  const wsLatency = useOpsStore((state) => state.wsLatency);
  const wsMsgRate = useOpsStore((state) => state.wsMsgRate);
  const wsLastEvent = useOpsStore((state) => state.wsLastEvent);
  const crowdMetrics = useOpsStore((state) => state.crowdMetrics);
  const incidents = useOpsStore((state) => state.incidents);
  const [stadiumName, setStadiumName] = useState('Lusail Stadium');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    dashboardService.getCrowdZones().then((zones: { stadium_id?: string }[]) => {
      if (zones.length > 0) setStadiumName('Lusail Stadium');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalHeadcount = crowdMetrics.reduce((sum, z) => sum + z.headcount, 0);
  const criticalZones = crowdMetrics.filter((z) => z.status === 'Critical').length;
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved').length;
  const userRoles = user?.roles.map((r) => r.name) || [];

  const simulationStatus = useOpsStore((state) => state.simulationStatus);
  const demoModeActive = useOpsStore((state) => state.demoModeActive);

  return (
    <header className="h-20 bg-[#180F25] border-b border-white/5 text-[#F8FAFC] flex items-center justify-between px-8 z-10 shadow-md">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#DE638A]/20 to-[#F7B9C4]/20 border border-[#DE638A]/30 flex items-center justify-center font-bold text-lg shadow-lg shrink-0">
          🏆
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-extrabold text-white tracking-wider uppercase font-display leading-none">Argentina vs France</h3>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-[#FF5A5A] rounded border border-red-500/30 uppercase tracking-widest animate-pulse leading-none">Live Match</span>
          </div>
          <span className="text-[10px] text-[#94A3B8] font-semibold tracking-wider uppercase mt-1.5 leading-none">
            {stadiumName} · Lusail, Qatar · Round of 16
          </span>
        </div>
      </div>

      <div className="hidden lg:flex flex-wrap justify-center items-center gap-2 max-w-2xl text-[9px] font-bold font-mono mx-4">
        <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span className="text-gray-400">BACKEND:</span>
          <span className="text-white">CONNECTED</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span className="text-gray-400">PREDICTIONS:</span>
          <span className="text-white">CONNECTED</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span className="text-gray-400">COPILOT:</span>
          <span className="text-white">READY</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
          <span className={`w-1.5 h-1.5 rounded-full ${simulationStatus === 'running' ? 'bg-[#22C55E] animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-gray-400">SIMULATION:</span>
          <span className="text-white uppercase">{simulationStatus}</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-[#22C55E]' : 'bg-red-500'}`} />
          <span className="text-gray-400">WS:</span>
          <span className="text-white uppercase">{wsConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        {wsConnected && (
          <>
            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
              <span className={`w-1.5 h-1.5 rounded-full ${wsLatency < 50 ? 'bg-[#22C55E]' : wsLatency < 150 ? 'bg-amber-500' : 'bg-red-400'}`} />
              <span className="text-gray-400">HEALTH:</span>
              <span className="text-white uppercase">{wsLatency < 50 ? 'EXCELLENT' : wsLatency < 150 ? 'GOOD' : 'POOR'}</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
              <span className="text-gray-400">LATENCY:</span>
              <span className="font-mono text-white">{wsLatency}ms</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
              <span className="text-gray-400">RATE:</span>
              <span className="font-mono text-white">{wsMsgRate} msg/s</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg">
              <span className="text-gray-400">LAST:</span>
              <span className="text-[#F7B9C4] max-w-[80px] truncate" title={wsLastEvent}>{wsLastEvent}</span>
            </div>
          </>
        )}
      </div>

      {!demoModeActive && (
        <div className="flex items-center space-x-6">
          <button className="relative w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-white transition-all duration-300">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[9px] font-bold flex items-center justify-center shadow-lg text-white">4</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
            <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider font-mono">
              {wsConnected ? 'Telemetry Live' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="text-right">
              <div className="text-xs font-bold text-white">{user?.email || 'operator@stadiumos.dev'}</div>
              <div className="text-[9px] text-[#F7B9C4] font-semibold uppercase tracking-wider font-mono">
                {userRoles.length > 0 ? userRoles.join(' • ') : 'Ops Manager'}
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3.5 py-2 border border-[#EF4444]/30 hover:bg-[#EF4444]/15 text-[#EF4444] text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
export default Topbar;

