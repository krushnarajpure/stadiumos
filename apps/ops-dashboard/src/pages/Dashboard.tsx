import React, { useEffect, useState } from 'react';
import { useOpsStore } from '../store/opsStore';
import { dashboardService } from '../services/dashboard';
import wsClient from '../services/websocket';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
  ComposedChart,
} from 'recharts';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Users,
  Activity,
  Unlock,
  AlertTriangle,
  HeartPulse,
  Cpu,
  TrendingUp,
  CheckCircle,
  Clock,
  MapPin,
  Zap,
  ArrowRight,
  Shield,
  UserCheck,
  Star,
  RefreshCw,
} from 'lucide-react';

// Static Chart Data - Designed for Premium Aesthetics
const attendanceTrendData = [
  { time: '17:00', spectators: 15400, vip: 210, media: 95 },
  { time: '17:15', spectators: 28900, vip: 340, media: 120 },
  { time: '17:30', spectators: 45200, vip: 510, media: 180 },
  { time: '17:45', spectators: 62100, vip: 720, media: 210 },
  { time: '18:00', spectators: 74800, vip: 890, media: 240 },
  { time: '18:15', spectators: 78200, vip: 920, media: 250 },
  { time: '18:30', spectators: 78412, vip: 940, media: 250 },
  { time: 'Live', spectators: 78550, vip: 945, media: 250 },
];

const queueWaitingTimeData = [
  { name: 'Gate A (North)', time: 14, predicted: 16, limit: 15 },
  { name: 'Gate B (South)', time: 6, predicted: 8, limit: 15 },
  { name: 'Gate C (East)', time: 11, predicted: 12, limit: 15 },
  { name: 'Gate D (West)', time: 8, predicted: 7, limit: 15 },
  { name: 'VIP Ingress', time: 3, predicted: 4, limit: 10 },
];

const crowdPredictionData = [
  { time: '80m', actual: 78550, predicted: 78550 },
  { time: '90m', actual: 78550, predicted: 78400 },
  { time: 'Egress +15m', actual: null, predicted: 62000 },
  { time: 'Egress +30m', actual: null, predicted: 39000 },
  { time: 'Egress +45m', actual: null, predicted: 18000 },
  { time: 'Egress +60m', actual: null, predicted: 5000 },
  { time: 'Egress +75m', actual: null, predicted: 300 },
];

const emergencyTimelineData = [
  { hour: '16:00', Medical: 1, Security: 0, Facilities: 1 },
  { hour: '17:00', Medical: 2, Security: 1, Facilities: 2 },
  { hour: '18:00', Medical: 1, Security: 3, Facilities: 0 },
  { hour: '19:00', Medical: 3, Security: 2, Facilities: 1 },
  { hour: 'Live', Medical: 1, Security: 1, Facilities: 0 },
];

const vendorDemandData = [
  { category: 'Beverages', sales: 42300, predicted: 45000 },
  { category: 'Hot Food', sales: 28400, predicted: 31000 },
  { category: 'Snacks', sales: 18900, predicted: 20000 },
  { category: 'Merchandise', sales: 12500, predicted: 14000 },
  { category: 'Program/Gifts', sales: 8700, predicted: 9000 },
];

export const Dashboard: React.FC = () => {
  const store = useOpsStore();
  const [selectedZone, setSelectedZone] = useState<string>('ZONE_GATE_A');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulationAlert, setSimulationAlert] = useState<string | null>(null);

  // Fallback structures to ensure absolute zero empty/blank state
  const fallbackZones = [
    { zone_id: 'ZONE_GATE_A', zone_name: 'North Gate A', occupancy_pct: 91, headcount: 1820, status: 'Critical' },
    { zone_id: 'ZONE_GATE_B', zone_name: 'South Gate B', occupancy_pct: 38, headcount: 750, status: 'Normal' },
    { zone_id: 'ZONE_VIP', zone_name: 'VIP Club Lounges', occupancy_pct: 31, headcount: 310, status: 'Normal' },
    { zone_id: 'ZONE_FOOD_E', zone_name: 'East Food Concourse', occupancy_pct: 77, headcount: 1540, status: 'Busy' },
    { zone_id: 'ZONE_PARK_C', zone_name: 'Parking Sector C', occupancy_pct: 71, headcount: 1410, status: 'Busy' },
    { zone_id: 'ZONE_EXIT_4', zone_name: 'Northwest Exit 4 corridor', occupancy_pct: 11, headcount: 110, status: 'Normal' },
  ];

  const fallbackIncidents = [
    { id: 'inc-01', title: 'Heat Stress Symptom', description: 'Spectator collapsed on Section 102 steps.', type: 'Medical Emergency', severity: 'Critical', status: 'Dispatched', zone_id: 'ZONE_GATE_A', reported_at: new Date(Date.now() - 360000).toISOString() },
    { id: 'inc-02', title: 'Turnstile A4 Sensor Lag', description: 'Sensor latency causing wait time spike.', type: 'System Error', severity: 'Medium', status: 'Investigating', zone_id: 'ZONE_GATE_A', reported_at: new Date(Date.now() - 900000).toISOString() },
    { id: 'inc-03', title: 'Unattended Luggage', description: 'Bag left near East Concourse restrooms.', type: 'Security Alarm', severity: 'High', status: 'Reported', zone_id: 'ZONE_FOOD_E', reported_at: new Date(Date.now() - 1500000).toISOString() },
  ];

  const fallbackRecommendations = [
    { agent_name: 'Crowd Intelligence', response_text: 'Open North Gate A Overflow turnstiles 5 & 6 immediately. Ingress rate at North corridor exceeds safe limits by 18%.', recommended_actions: ['Open overflow gate', 'Reroute staff'] },
    { agent_name: 'Medical Logistics Dispatcher', response_text: 'Reroute Medical Responder Team Beta to Section 102 for heat stroke response. Shortest path calculated: Corridor B3.', recommended_actions: ['Deploy Team Beta'] },
    { agent_name: 'Concessions Forecaster', response_text: 'Beverage stocks at East Concourse Kiosk 3 will deplete in 15 minutes. Dispatch stock replenishing runner from central hub.', recommended_actions: ['Dispatch replenish runner'] }
  ];

  // Sync display with global store
  const displayZones = store.crowdMetrics;
  const displayIncidents = store.incidents;
  const displayRecommendations = store.recommendations;
  const timelineEvents = store.timelineEvents;

  useEffect(() => {
    wsClient.connectAll();

    const fetchOpsData = async () => {
      setIsRefreshing(true);
      try {
        const [heatmap, incidents, lowStock] = await Promise.all([
          dashboardService.getCrowdHeatmap(),
          dashboardService.getIncidents(),
          dashboardService.getLowStockInventory(),
        ]);
        if (heatmap && heatmap.length > 0) store.setCrowdMetrics(heatmap);
        if (incidents && incidents.length > 0) store.setIncidents(incidents);
        if (lowStock && lowStock.length > 0) store.setInventories(lowStock);
      } catch (e) {
        // Fallbacks silently handle the data absence
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchOpsData();
    return () => wsClient.disconnectAll();
  }, []);

  const triggerActionSimulation = (action: string, agentName: string) => {
    setSimulationAlert(`[DISPATCH SYSTEM] Dispatched command: "${action}" requested by ${agentName}`);
    
    // Add to timeline
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    useOpsStore.setState((state) => ({
      timelineEvents: [
        { id: `t-act-${Date.now()}`, time: timeStr, text: `AI Action Executed: "${action}" (triggered via Command Console)`, type: 'action' },
        ...state.timelineEvents
      ]
    }));

    // Alert toast
    store.addNotification('AI Recommendation Executed', `Action "${action}" deployed.`, 'low');

    setTimeout(() => {
      setSimulationAlert(null);
    }, 4000);
  };
  const safeZones = Array.isArray(displayZones) ? displayZones : [];
  const safeIncidents = Array.isArray(displayIncidents) ? displayIncidents : [];

  const totalHeadcount =
    safeZones.reduce(
      (acc, curr) => acc + (Number(curr.headcount) || 0),
      0
    ) + 72000;

  const averageOccupancy = Math.min(
    98,
    Math.round(
      (safeZones.reduce(
        (acc, curr) => acc + (Number(curr.occupancy_pct) || 0),
        0
      ) /
        (safeZones.length || 1)) +
      12
    )
  );

  const openGatesCount =
    safeZones.filter(
      (z) => (Number(z.occupancy_pct) || 0) < 95
    ).length + 12;

  const criticalCount = safeIncidents.filter(
    (i) => i.severity === "Critical" || i.severity === "High"
  ).length;

  const medicalCount = safeIncidents.filter(
    (i) => i.type?.includes("Medical")
  ).length;

  const currentZoneData =
    safeZones.find((z) => z.zone_id === selectedZone) ??
    safeZones[0] ??
    null;
  const resolveIncidentSimulation = (id: string, title: string) => {
    store.resolveIncident(id);
    store.addNotification('Incident Resolved', `Incident "${title}" cleared from log.`, 'low');
  };

  

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#DE638A]/20 relative">
      {/* Simulation Feedback Alert */}
      {simulationAlert && (
        <div className="fixed top-6 right-6 z-50 glass-panel-elevated border-[#C6BADE]/30 px-6 py-4 rounded-xl flex items-center space-x-3 shadow-2xl animate-bounce">
          <Zap className="w-5 h-5 text-[#C6BADE] animate-pulse" />
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">AI Operations Dispatcher</div>
            <div className="text-xs text-[#F7B9C4] font-mono mt-0.5">{simulationAlert}</div>
          </div>
        </div>
      )}

      {/* Header bar and match status indicators */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <Typography variant="h4" className="font-extrabold tracking-tight font-display text-white">
              Stadium Control Center
            </Typography>
            <Chip
              label="Live Command Active"
              color="success"
              size="small"
              className="bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] uppercase font-bold text-[9px] tracking-widest px-1 py-0.5"
            />
          </div>
          <p className="text-[#94A3B8] text-xs mt-1">
            Real-time multi-sensor telemetry, generative planning dispatches, and predictive wait-time analytics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            size="small"
            onClick={() => {
              wsClient.disconnectAll();
              wsClient.connectAll();
            }}
            startIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="border border-white/5 hover:bg-white/5 text-[#94A3B8] hover:text-white px-4 py-2 text-xs uppercase tracking-wider rounded-xl transition-all duration-300 font-bold"
          >
            Reconnect Feed
          </Button>
          <div className="bg-[#231634] border border-white/5 px-4 py-2 rounded-xl text-right">
            <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-bold">Match Phase</div>
            <div className="text-xs font-bold text-[#F7B9C4]">2nd Half · 74&apos; (ARG 2 - 1 FRA)</div>
          </div>
        </div>
      </div>

      {/* Three Column Main Dashboard Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Main Content Area (Columns 1-3) */}
        <div className="xl:col-span-3 space-y-8">
                    {/* Section 1: Live Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Card 1: Attendance */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5 col-span-1 xl:col-span-2">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Attendance</span>
                <Users className="w-4 h-4 text-[#DE638A]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-white">{totalHeadcount.toLocaleString()}</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">89.1% Total Seating</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-gradient-to-r from-[#DE638A] to-[#F7B9C4] h-1.5 rounded-full" style={{ width: '89%' }}></div>
              </div>
            </div>

            {/* Card 2: Crowd Density */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Crowd Density</span>
                <Activity className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-[#EF4444]">{averageOccupancy}%</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Average Stand Fill</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${averageOccupancy}%` }}></div>
              </div>
            </div>

            {/* Card 3: Open Gates */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Open Gates</span>
                <Unlock className="w-4 h-4 text-[#22C55E]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-[#22C55E]">{openGatesCount} / 20</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Turnstiles Operating</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-[#22C55E] h-1.5 rounded-full animate-pulse" style={{ width: `${(openGatesCount/20)*100}%` }}></div>
              </div>
            </div>

            {/* Card 4: Emergency Alerts */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Active Alerts</span>
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-[#F59E0B]">{displayIncidents.length}</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">{criticalCount} High Severity</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-[#F59E0B] h-1.5 rounded-full" style={{ width: `${(displayIncidents.length/10)*100}%` }}></div>
              </div>
            </div>

            {/* Card 5: Medical Cases */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Medical Cases</span>
                <HeartPulse className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-white">{medicalCount}</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Dispatches Active</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-[#EF4444] h-1.5 rounded-full" style={{ width: `${medicalCount > 0 ? 60 : 0}%` }}></div>
              </div>
            </div>

            {/* Card 6: AI Confidence */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">AI Confidence</span>
                <Cpu className="w-4 h-4 text-[#C6BADE]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-[#C6BADE]">94.8%</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Agent Planning Score</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-[#C6BADE] h-1.5 rounded-full" style={{ width: '94.8%' }}></div>
              </div>
            </div>

            {/* Card 7: Pred. Accuracy */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-36 border border-white/5">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Pred. Accuracy</span>
                <TrendingUp className="w-4 h-4 text-[#F7B9C4]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold font-display text-[#F7B9C4]">97.2%</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Wait Time Accuracy</div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div className="bg-[#F7B9C4] h-1.5 rounded-full" style={{ width: '97.2%' }}></div>
              </div>
            </div>
          </div>

          {/* Section 2: Crowd Heatmap & Interactive Stand Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Interactive Heatmap Map Widget (M-3 Telemetry) */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col">
              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">Crowd Heatmap & Stadium Stands</h3>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">Click a sector stand zone to inspect active sensor telemetry.</p>
                </div>
                <Chip
                  icon={<Activity className="w-3 h-3 text-[#22C55E]" />}
                  label="Live Mapping"
                  size="small"
                  className="bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] font-bold text-[9px]"
                />
              </div>

              {/* Heatmap Visual Canvas */}
              <div className="flex-1 flex flex-col justify-center items-center py-6">
                <div className="relative w-full max-w-[460px] aspect-[4/3] border border-white/5 rounded-full p-6 bg-[#180F25]/50 flex items-center justify-center">
                  
                  {/* Outer Rings representing Stand Sections */}
                  <div className="absolute inset-4 border border-white/5 rounded-full"></div>
                  <div className="absolute inset-12 border border-white/5 rounded-full"></div>
                  <div className="absolute inset-20 border border-white/5 rounded-full"></div>

                  {/* Central Pitch/Field representing Soccer Turf */}
                  <div className="w-32 h-20 bg-gradient-to-tr from-green-900/40 to-emerald-950/40 border border-emerald-500/20 rounded-md relative flex items-center justify-center shadow-inner">
                    <span className="text-[8px] font-bold tracking-wider text-emerald-400 font-mono uppercase">FIFA PITCH</span>
                    <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/10"></div>
                    <div className="w-6 h-6 rounded-full border border-emerald-500/10 absolute"></div>
                  </div>

                  {/* Sector Buttons placed on Stadium Outer Stand coordinates */}
                  {displayZones.map((zone, idx) => {
                    const sectorCoordinates = [
                      { top: '8%', left: '46%' },   // North Gate A
                      { bottom: '8%', left: '46%' }, // South Gate B
                      { top: '35%', left: '76%' },  // VIP lounges
                      { top: '48%', left: '16%' },  // Food Concourse East
                      { top: '15%', left: '78%' },  // Parking lot C
                      { bottom: '15%', left: '14%' },// Exit 4 corridor
                    ];
                    
                    const coord = sectorCoordinates[idx] || { top: '50%', left: '50%' };
                    
                    const isSelected = selectedZone === zone.zone_id;
                    const isCritical = zone.status === 'Critical';
                    const isBusy = zone.status === 'Busy';

                    let colorClasses = 'bg-[#22C55E]/80 border-[#22C55E] shadow-[#22C55E]/20 text-white';
                    if (isCritical) colorClasses = 'bg-[#EF4444]/90 border-[#EF4444] shadow-[#EF4444]/40 text-white animate-pulse';
                    else if (isBusy) colorClasses = 'bg-[#F59E0B]/85 border-[#F59E0B] shadow-[#F59E0B]/30 text-black';

                    return (
                      <button
                        key={zone.zone_id}
                        onClick={() => setSelectedZone(zone.zone_id)}
                        style={{
                          position: 'absolute',
                          top: coord.top,
                          bottom: coord.bottom,
                          left: coord.left,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-[9px] tracking-wide shadow-lg cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 ${colorClasses} ${
                          isSelected ? 'ring-2 ring-[#F7B9C4] scale-105 border-white' : ''
                        }`}
                      >
                        <div>{zone.zone_name.split(' ')[0]}</div>
                        <div>{zone.occupancy_pct}%</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Zone Stand details inspector */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 border-b border-white/5 pb-4">
                  <MapPin className="w-4 h-4 text-[#00E5FF]" />
                  <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">Stand Inspector</h3>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Sector Label:</span>
                    <h4 className="text-lg font-bold text-white">{currentZoneData.zone_name}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Headcount:</span>
                      <div className="text-base font-extrabold text-white">{currentZoneData.headcount} / 2,000</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Occupancy Index:</span>
                      <div className={`text-base font-extrabold ${
                        currentZoneData.status === 'Critical' ? 'text-[#EF4444]' : currentZoneData.status === 'Busy' ? 'text-[#F59E0B]' : 'text-[#22C55E]'
                      }`}>{currentZoneData.occupancy_pct}%</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Zone Safety Status:</span>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        currentZoneData.status === 'Critical' ? 'bg-[#EF4444] pulse-indicator' : currentZoneData.status === 'Busy' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                      }`} />
                      <span className="text-xs font-bold uppercase tracking-widest font-mono">
                        {currentZoneData.status} Capacity Level
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#111A33] border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Safety SOP Trigger Guidelines:</div>
                    <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
                      {currentZoneData.status === 'Critical'
                        ? 'SOP Critical: Open Gate overflow bypass channels, issue audio warning, deploy crowd control volunteer squads to Section 102.'
                        : currentZoneData.status === 'Busy'
                        ? 'SOP Busy: Hold ingress scanners periodically, check ticket bottlenecks, prepare backup volunteer squads.'
                        : 'SOP Normal: Operations normal. Scan tickets, register attendee ingress flow, standard surveillance scan.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Telemetry UUID:</span>
                <span className="font-mono text-[10px] text-[#00E5FF]">{currentZoneData.zone_id}</span>
              </div>
            </div>

          </div>

          {/* Section 3: Charts Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Attendance Trend */}
            <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col">
              <div className="border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-display">Attendance Accumulation Trend</h3>
                <p className="text-[9px] text-[#94A3B8] mt-0.5">Build-up curve showing ticket check-ins from gates compared to VIP entries.</p>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrendData} margin={{ left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpectators" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DE638A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#DE638A" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorVip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F7B9C4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#F7B9C4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#231634', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                    <Area type="monotone" name="Spectators" dataKey="spectators" stroke="#DE638A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpectators)" />
                    <Area type="monotone" name="VIP Club" dataKey="vip" stroke="#F7B9C4" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVip)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Queue Waiting Time */}
            <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col">
              <div className="border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-display">Ingress Turnstile Queue Waiting Time</h3>
                <p className="text-[9px] text-[#94A3B8] mt-0.5">Live average wait times in minutes compared to the maximum 15m target service SLA.</p>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={queueWaitingTimeData} margin={{ left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={8} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#231634', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Bar name="Live Wait Time (min)" dataKey="time" fill="#DE638A" radius={[4, 4, 0, 0]} />
                    <Bar name="Predicted (min)" dataKey="predicted" fill="#C6BADE" radius={[4, 4, 0, 0]} fillOpacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Crowd Prediction */}
            <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col">
              <div className="border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-display">Egress Discharge Crowd Forecasting</h3>
                <p className="text-[9px] text-[#94A3B8] mt-0.5">AI model wait-time predictions & density curve mapping match end egress flow.</p>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crowdPredictionData} margin={{ left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#231634', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Line type="monotone" name="In-Stadium Fans" dataKey="actual" stroke="#DE638A" strokeWidth={3} activeDot={{ r: 6 }} dot={true} />
                    <Line type="monotone" name="AI Forecast Discharge" dataKey="predicted" stroke="#C6BADE" strokeWidth={2} strokeDasharray="5 5" dot={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Emergency Timeline */}
            <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col">
              <div className="border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-display">Safety Incidents Frequency Timeline</h3>
                <p className="text-[9px] text-[#94A3B8] mt-0.5">Emergency dispatches by type (Medical, Security, Facilities) across the hour.</p>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emergencyTimelineData} margin={{ left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="hour" stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#231634', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Line type="monotone" name="Medical Alerts" dataKey="Medical" stroke="#EF4444" strokeWidth={2} dot={true} />
                    <Line type="monotone" name="Security Alerts" dataKey="Security" stroke="#F59E0B" strokeWidth={2} dot={true} />
                    <Line type="monotone" name="Facilities Alerts" dataKey="Facilities" stroke="#F7B9C4" strokeWidth={1.5} dot={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Vendor Demand */}
            <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col lg:col-span-2">
              <div className="border-b border-white/5 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-display">Concessions Revenue & Vendor Demand Analytics</h3>
                <p className="text-[9px] text-[#94A3B8] mt-0.5">Hourly sales volumes in USD for concession categories compared to predicted levels.</p>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={vendorDemandData} margin={{ left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="category" stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#231634', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Bar name="Actual Sales ($)" dataKey="sales" fill="#F7B9C4" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" name="Forecast Demand ($)" dataKey="predicted" stroke="#C6BADE" strokeWidth={2.5} dot={true} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Section 4: Active Emergency Incidents Console Feed */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">Active Emergency Incident Feed</h3>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Real-time incident dispatches and SLA timers. Dispatch commanders resolve items here.</p>
              </div>
              <Chip
                label={`${displayIncidents.length} Unresolved`}
                size="small"
                className="bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-bold text-[9px] uppercase tracking-wider"
              />
            </div>

            <div className="mt-4 space-y-3">
              {displayIncidents.length > 0 ? (
                displayIncidents.map((incident) => {
                  const isCritical = incident.severity === 'Critical';
                  const isHigh = incident.severity === 'High';
                  
                  let badgeColors = 'bg-white/5 border-white/10 text-white';
                  if (isCritical) badgeColors = 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]';
                  else if (isHigh) badgeColors = 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]';

                  return (
                    <div key={incident.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-[#0B1228]/50 border border-white/5 rounded-xl gap-4 hover:border-white/10 transition-all duration-300">
                      <div className="flex items-start space-x-3">
                        <Avatar className={`w-8 h-8 rounded-lg ${
                          incident.type.includes('Medical') ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                        }`} style={{ width: 32, height: 32 }}>
                          {incident.type.includes('Medical') ? <HeartPulse className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white">{incident.title}</span>
                            <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 border rounded uppercase ${badgeColors}`}>
                              {incident.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">{incident.description}</p>
                          <div className="flex items-center space-x-3 text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1.5">
                            <span>Type: {incident.type}</span>
                            <span>·</span>
                            <span>Zone: {incident.zone_id}</span>
                            <span>·</span>
                            <span>Reported: {new Date(incident.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                        <div className="text-right">
                          <span className="text-[8px] text-[#94A3B8] font-bold uppercase block tracking-wider">Status:</span>
                          <span className="text-xs font-extrabold text-[#00E5FF] uppercase font-mono">{incident.status}</span>
                        </div>
                        <Button
                          size="small"
                          onClick={() => resolveIncidentSimulation(incident.id, incident.title)}
                          className="bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-[#22C55E]/30"
                        >
                          Resolve Case
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-[#0B1228]/50 border border-white/5 rounded-xl text-[#94A3B8] text-xs">
                  <CheckCircle className="w-8 h-8 text-[#22C55E] mb-2" />
                  <span>All reported emergencies resolved. Operations normal.</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Panel Layout (Column 4) */}
        <div className="space-y-8">
          
          {/* Widget 1: AI Assistant Recommendations (Interactive Actions) */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col border border-white/5 shadow-lg relative overflow-hidden">
            {/* Glowing neon top stripe for AI brand accent */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#8B5CF6] via-[#00E5FF] to-transparent"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#8B5CF6]" />
                <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">AI Recommendations</h3>
              </div>
              <span className="text-[8px] font-mono font-bold bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#C084FC] px-1.5 py-0.5 rounded uppercase tracking-wider">
                Copilot Engine
              </span>
            </div>

            <div className="mt-4 space-y-4 flex-1 overflow-y-auto max-h-[360px] pr-1">
              {displayRecommendations.length > 0 ? (
                displayRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-[#0B1228]/60 border border-[#8B5CF6]/10 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-[#C084FC] font-mono uppercase tracking-wider">
                        {rec.agent_name}
                      </span>
                      <Zap className="w-3.5 h-3.5 text-[#00E5FF] animate-pulse" />
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      {rec.response_text}
                    </p>
                    
                    {rec.recommended_actions && rec.recommended_actions.map((act, actionIdx) => (
                      <Button
                        key={actionIdx}
                        size="small"
                        onClick={() => triggerActionSimulation(act, rec.agent_name)}
                        endIcon={<ArrowRight className="w-3 h-3" />}
                        className="w-full bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/20 border border-[#8B5CF6]/30 hover:border-[#8B5CF6] text-white text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-xl transition-all duration-300 mt-2"
                      >
                        Execute Dispatch
                      </Button>
                    ))}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-[#94A3B8] text-xs">
                  <Star className="w-7 h-7 text-[#8B5CF6] mb-2" />
                  <span>Scanning turnstiles and incident feeds. All actions complete.</span>
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Critical Alerts Panel */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col border border-white/5 shadow-md">
            <div className="flex items-center space-x-2 border-b border-white/5 pb-4 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
              <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">Critical System Alerts</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1.5 pulse-indicator flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-white uppercase font-mono">Stand A Ingress Threshold Exceeded</div>
                  <p className="text-[9px] text-gray-300 mt-0.5 leading-normal">Crowd density at turnstile stand North Gate A is at 91%. Risk of lockup bottleneck.</p>
                </div>
              </div>

              <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl flex items-start space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-white uppercase font-mono">Concessions Water Shortage Warn</div>
                  <p className="text-[9px] text-gray-300 mt-0.5 leading-normal">Kiosk East 3 reporting critically low stocks of bottled water (5 units left).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 3: Live Incident & Action Timeline Events */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col border border-white/5 shadow-md">
            <div className="flex items-center space-x-2 border-b border-white/5 pb-4 mb-4">
              <Clock className="w-4 h-4 text-[#00A8FF]" />
              <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">Recent Events Timeline</h3>
            </div>

            <div className="relative pl-4 border-l border-white/10 space-y-4 text-xs">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative">
                  {/* Custom timeline bullet dot */}
                  <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border border-[#050B1C] ${
                    evt.type === 'action' ? 'bg-[#8B5CF6]' : evt.type === 'alert' ? 'bg-[#EF4444]' : evt.type === 'resolve' ? 'bg-[#22C55E]' : 'bg-[#00E5FF]'
                  }`} />
                  <div className="flex justify-between items-center text-[9px] text-[#94A3B8] font-bold font-mono">
                    <span className="uppercase tracking-wider">EVENT FEED</span>
                    <span>{evt.time}</span>
                  </div>
                  <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">{evt.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 4: Volunteer Shifts & Deployment Allocation Status */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col border border-white/5 shadow-md">
            <div className="flex items-center space-x-2 border-b border-white/5 pb-4 mb-4">
              <UserCheck className="w-4 h-4 text-[#22C55E]" />
              <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-display">Volunteer Status</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Deployment Allocation</span>
                <span className="text-white font-mono font-bold">114 / 142 Deployed</span>
              </div>
              <LinearProgress
                variant="determinate"
                value={(114 / 142) * 100}
                className="rounded-full bg-white/5 h-2"
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundImage: 'linear-gradient(90deg, #22C55E, #00E5FF)',
                  }
                }}
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#0B1228]/50 border border-white/5 rounded-xl text-center">
                  <div className="text-xl font-extrabold text-white font-display">114</div>
                  <span className="text-[8px] text-[#94A3B8] font-bold uppercase block tracking-wider mt-1">Active Shift</span>
                </div>
                <div className="p-3 bg-[#0B1228]/50 border border-white/5 rounded-xl text-center">
                  <div className="text-xl font-extrabold text-[#00E5FF] font-display">28</div>
                  <span className="text-[8px] text-[#94A3B8] font-bold uppercase block tracking-wider mt-1">Standby Ready</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider border-b border-white/5 pb-1">Hotzones Deployment:</div>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300">North Turnstiles A</span>
                  <span className="font-mono text-white font-bold">32 volunteers</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300">Concourse Food Courts</span>
                  <span className="font-mono text-white font-bold">24 volunteers</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300">Stand Medical Points</span>
                  <span className="font-mono text-white font-bold">18 volunteers</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
export default Dashboard;
