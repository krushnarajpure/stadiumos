import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOpsStore } from '../store/opsStore';
import { wsService } from '../services/websocket';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  HeartPulse,
  Activity,
  Users,
  Compass,
  Zap,
  Clock,
  Shield,
  HelpCircle,
  Package,
  Flame,
  CheckCircle,
  CloudRain,
  Crown,
  Share2,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Simulation Event Definitions
// ──────────────────────────────────────────────
interface SimulationEvent {
  key: string;
  title: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'crowd' | 'medical' | 'child' | 'package' | 'security' | 'fire' | 'gate' | 'weather' | 'vip' | 'evacuation';
  team: string;
  responseTime: string;
  description: string;
  summary: string;
  affectedSpectators: number;
  expectedReduction: string;
  confidence: string;
  x: number; // Map X coordinate
  y: number; // Map Y coordinate
  recommendedActions: string[];
}

const SIMULATION_PRESETS: Record<string, SimulationEvent> = {
  CROWD_SURGE: {
    key: 'CROWD_SURGE',
    title: 'Crowd Surge Alert',
    location: 'Gate B (East Entrance)',
    severity: 'high',
    category: 'crowd',
    team: 'Crowd Stewards Team Beta',
    responseTime: '1.2s',
    description: 'Severe bottleneck detected at Gate B turnstiles. Ingress rate exceeding safety thresholds by 38%.',
    summary: 'Crowd surge detected at Gate B. Turnstile scanning speed dropped below standard. Ingress flow must be redirected to avoid crush risk.',
    affectedSpectators: 2140,
    expectedReduction: '31%',
    confidence: '94%',
    x: 770,
    y: 300,
    recommendedActions: [
      'Open Gate D for redirect',
      'Deploy 6 security officers',
      'Redirect arriving spectators',
      'Notify medical team'
    ]
  },
  MEDICAL_EMERGENCY: {
    key: 'MEDICAL_EMERGENCY',
    title: 'Cardiac Event Section 102',
    location: 'North Stand (Section 102)',
    severity: 'critical',
    category: 'medical',
    team: 'Medical Responder Team Alpha',
    responseTime: '0.8s',
    description: 'Spectator collapsed with chest pains. CPR initiated by bystanders.',
    summary: 'Suspected acute cardiac arrest in Sector N-102. Rapid response team dispatched via Corridor C-3.',
    affectedSpectators: 85,
    expectedReduction: 'N/A (Critical response)',
    confidence: '98%',
    x: 400,
    y: 110,
    recommendedActions: [
      'Dispatch Ambulance to Gate A loading dock',
      'Deploy Medic Team Alpha with AED',
      'Clear medical corridor B3'
    ]
  },
  LOST_CHILD: {
    key: 'LOST_CHILD',
    title: 'Lost Child Sector E4',
    location: 'East Stand (Concourse)',
    severity: 'medium',
    category: 'child',
    team: 'Volunteer Squad Delta',
    responseTime: '2.4s',
    description: '7-year-old child separated from parent near concession stand 3.',
    summary: 'Lost child reported. Visual matches on CCTV camera CAM-E02 show child matches description (wearing red jersey).',
    affectedSpectators: 1,
    expectedReduction: '100% (Visual lock)',
    confidence: '91%',
    x: 690,
    y: 300,
    recommendedActions: [
      'Lock down East Concourse exits',
      'Dispatch volunteer marshals',
      'Broadcast description to stewards'
    ]
  },
  SUSPICIOUS_PACKAGE: {
    key: 'SUSPICIOUS_PACKAGE',
    title: 'Unattended Backpack Alert',
    location: 'South Concourse (Gate C)',
    severity: 'high',
    category: 'package',
    team: 'Bomb Disposal Unit',
    responseTime: '3.5s',
    description: 'Black tactical backpack left unattended near ticket box office for 25 minutes.',
    summary: 'Unattended package identified by security camera anomaly detection. Precautionary isolation protocols active.',
    affectedSpectators: 450,
    expectedReduction: '85% divert',
    confidence: '88%',
    x: 400,
    y: 570,
    recommendedActions: [
      'Establish 50m cordon',
      'Reroute ingress from Gate C to B',
      'Dispatch K9 inspection team'
    ]
  },
  SECURITY_BREACH: {
    key: 'SECURITY_BREACH',
    title: 'Pitch Invader Detected',
    location: 'Main Pitch (South Boundary)',
    severity: 'high',
    category: 'security',
    team: 'Pitch Security Guard 3',
    responseTime: '1.1s',
    description: 'Spectator breached perimeter fencing from South Stand, running towards center circle.',
    summary: 'Pitch breach detected. AI tracking has locked coordinates. Interception squad dispatched from South Bench.',
    affectedSpectators: 120,
    expectedReduction: '95%',
    confidence: '99%',
    x: 400,
    y: 300,
    recommendedActions: [
      'Deploy boundary guards 1-4',
      'Activate cameras CAM-PITCH-01 & 02',
      'Initiate physical perimeter lockdown'
    ]
  },
  FIRE_ALARM: {
    key: 'FIRE_ALARM',
    title: 'Smoke Anomaly Concourse A',
    location: 'North Concourse Kitchen',
    severity: 'critical',
    category: 'fire',
    team: 'Fire Response Team 1',
    responseTime: '0.4s',
    description: 'Optical smoke detector triggered in Concourse A kitchen suite 2. Heavy smoke reported.',
    summary: 'Fire alarm triggered. Activating automated safety protocols. Redirecting spectator flow away from North corridor.',
    affectedSpectators: 3100,
    expectedReduction: 'Evac routing active',
    confidence: '99%',
    x: 140,
    y: 180,
    recommendedActions: [
      'Activate emergency voice alarm',
      'Unlock all exit gates A-D',
      'Initiate localized zone evacuation'
    ]
  },
  GATE_FAILURE: {
    key: 'GATE_FAILURE',
    title: 'Turnstile Gate C Power Outage',
    location: 'Gate C Entrance',
    severity: 'high',
    category: 'gate',
    team: 'Facilities Engineering',
    responseTime: '2.1s',
    description: 'Main power breaker tripped at Gate C turnstiles. All 20 digital scanning gates frozen.',
    summary: 'Gate C turnstiles offline. Ingress capacity dropped to 0%. Spectators piling up at entry plaza.',
    affectedSpectators: 3840,
    expectedReduction: '40% diversion',
    confidence: '95%',
    x: 400,
    y: 570,
    recommendedActions: [
      'Deploy manual ticket scanners',
      'Reroute ticket holders to Gate B',
      'Dispatch emergency electricians'
    ]
  },
  WEATHER_ALERT: {
    key: 'WEATHER_ALERT',
    title: 'Severe Lightning Warning',
    location: 'Stadium Airspace',
    severity: 'medium',
    category: 'weather',
    team: 'Ops Command Unit',
    responseTime: '1.8s',
    description: 'Electrical storm detected within 5km radius. Threat of lightning strikes.',
    summary: 'Severe lightning warning active. Advise spectators to clear open-sky stands and move to covered concourses.',
    affectedSpectators: 78550,
    expectedReduction: '10% attendance drop',
    confidence: '90%',
    x: 400,
    y: 300,
    recommendedActions: [
      'Close open stadium terrace seating',
      'Announce weather warning',
      'Open covered shelter concourses'
    ]
  },
  VIP_ARRIVAL: {
    key: 'VIP_ARRIVAL',
    title: 'State Dignitary Inbound',
    location: 'VIP West Lobby',
    severity: 'low',
    category: 'vip',
    team: 'VIP Security Detail',
    responseTime: '3.0s',
    description: 'Official state delegation arrival at West VIP gate. Special security escort active.',
    summary: 'VIP arrival sequence initialized. Secure lane active. Clearing corridor W1.',
    affectedSpectators: 50,
    expectedReduction: 'Normal flow',
    confidence: '97%',
    x: 110,
    y: 300,
    recommendedActions: [
      'Secure VIP lobby elevator 3',
      'Deploy VIP escorts',
      'Lock VIP entrance perimeter'
    ]
  },
  STADIUM_EVACUATION: {
    key: 'STADIUM_EVACUATION',
    title: 'Full Evacuation Directive',
    location: 'All Sectors',
    severity: 'critical',
    category: 'evacuation',
    team: 'All Emergency Units',
    responseTime: '0.2s',
    description: 'Command center order to evacuate stadium due to critical infrastructure threat.',
    summary: 'Automated evacuation sequence active. Directing all sectors to nearest emergency exits. All exit paths verified clear.',
    affectedSpectators: 78550,
    expectedReduction: 'Evacuation protocol',
    confidence: '99%',
    x: 400,
    y: 300,
    recommendedActions: [
      'Open all exit gates A-D',
      'Deactivate all turnstile ingress blocks',
      'Broadcast continuous evacuation instructions'
    ]
  }
};

export const Simulation: React.FC = () => {
  const store = useOpsStore();
  const simulationStatus = store.simulationStatus;
  const simulationSpeed = store.simulationSpeed;
  const timelineEvents = store.timelineEvents;
  const [selectedEvent, setSelectedEvent] = useState<SimulationEvent | null>(null);
  
  // Real-time animation states for map items
  const [responderPos, setResponderPos] = useState({ x: 140, y: 380 }); // start from Security HQ
  const [mapPulseZone, setMapPulseZone] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rainActive, setRainActive] = useState(false);
  const [evacActive, setEvacActive] = useState(false);

  // Sync visual storm/evac flags with store variables
  useEffect(() => {
    setRainActive(store.heavyRain);
    setEvacActive(store.crowdMetrics.every(m => m.status === 'Critical'));
  }, [store.heavyRain, store.crowdMetrics]);

  const triggerSimulation = (key: string) => {
    if (simulationStatus === 'paused') {
      setToastMessage('Simulation is paused. Resume to execute events.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const template = SIMULATION_PRESETS[key];
    if (!template) return;

    setSelectedEvent(template);
    setMapPulseZone(template.key);
    setResponderPos({ x: template.x, y: template.y });

    // Show local confirmation toast
    setToastMessage(`🚨 [SIMULATION ALERT] ${template.title} triggered!`);
    setTimeout(() => setToastMessage(null), 3000);

    // Call store dispatch
    store.triggerEvent(key);
  };

  const handleReset = () => {
    setSelectedEvent(null);
    setResponderPos({ x: 140, y: 380 });
    setMapPulseZone(null);
    setRainActive(false);
    setEvacActive(false);
    setToastMessage('Simulation engine state has been reset.');
    store.resetAll();
    wsService.resetSimulation();
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Severity style helper
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#DE638A]/20 relative overflow-hidden min-h-screen">
      
      {/* Toast Alert System */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 glass-panel border-[#DE638A]/30 px-6 py-4 rounded-xl flex items-center space-x-3 shadow-2xl"
          >
            <Zap className="w-5 h-5 text-[#DE638A] animate-pulse" />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider font-display">SIMULATOR LINK STATUS</div>
              <div className="text-xs text-[#F7B9C4] font-mono mt-0.5">{toastMessage}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weather Rain Overlay Effect */}
      {rainActive && (
        <div className="absolute inset-0 pointer-events-none bg-blue-950/5 z-40 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[size:20px_20px] animate-pulse" />
        </div>
      )}

      {/* Header bar and controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h4 className="text-2xl font-extrabold tracking-tight font-display text-white">
              Incident Simulation Center
            </h4>
            <span className="bg-[#C6BADE]/10 border border-[#C6BADE]/30 text-[#C6BADE] font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              Ready for Judges
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 font-semibold uppercase tracking-wider">
            FIFA WORLD CUP OPERATIONS COMMAND AND DESTRUCTIVE SCENARIO SIMULATION
          </p>
        </div>

        {/* Global simulation control panel */}
        <div className="flex items-center space-x-4 bg-white/[0.02] border border-white/5 px-6 py-2 rounded-2xl backdrop-blur-md">
          {/* Status buttons */}
          <div className="flex items-center space-x-2 border-r border-white/10 pr-4">
            <button
              onClick={() => {
                store.setSimulationStatus('running');
                wsService.startSimulation();
              }}
              className={`p-2 rounded-lg transition-all ${simulationStatus === 'running' ? 'bg-[#DE638A] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Resume simulation"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                store.setSimulationStatus('paused');
                wsService.stopSimulation();
              }}
              className={`p-2 rounded-lg transition-all ${simulationStatus === 'paused' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Pause simulation"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Reset simulation variables"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed settings */}
          <div className="flex items-center space-x-1.5 border-r border-white/10 pr-4">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">Time multiplier</span>
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => store.setSimulationSpeed(spd)}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border transition-all ${
                  simulationSpeed === spd
                    ? 'border-[#DE638A] text-[#DE638A] bg-[#DE638A]/5'
                    : 'border-white/5 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Demo mode selector */}
          <button
            onClick={() => store.setDemoMode(!store.demoModeActive)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg border transition-all ${
              store.demoModeActive
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                : 'border-white/5 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {store.demoModeActive ? 'DEMO: ACTIVE' : 'RUN DEMO'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left panel (Simulation Controls) | Center (Digital twin + timeline) | Right (AI Commander summary) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left column: Controls */}
        <div className="xl:col-span-1 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 relative bg-[#231634]/30">
            <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest block mb-4">Simulation Triggers</span>
            
            <div className="flex flex-col space-y-2.5">
              <button
                onClick={() => triggerSimulation('CROWD_SURGE')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#DE638A]/30 bg-[#180F25]/85 hover:bg-[#DE638A]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-[#DE638A]" />
                  <span className="text-xs font-semibold text-white">Crowd Surge</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-[#DE638A]" />
              </button>

              <button
                onClick={() => triggerSimulation('MEDICAL_EMERGENCY')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#EF4444]/30 bg-[#180F25]/85 hover:bg-[#EF4444]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <HeartPulse className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs font-semibold text-white">Medical Emergency</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-[#EF4444]" />
              </button>

              <button
                onClick={() => triggerSimulation('LOST_CHILD')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#C6BADE]/30 bg-[#180F25]/85 hover:bg-[#C6BADE]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <HelpCircle className="w-4 h-4 text-[#C6BADE]" />
                  <span className="text-xs font-semibold text-white">Lost Child</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-[#C6BADE]" />
              </button>

              <button
                onClick={() => triggerSimulation('SUSPICIOUS_PACKAGE')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-orange-500/30 bg-[#180F25]/85 hover:bg-orange-500/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold text-white">Suspicious Package</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-orange-400" />
              </button>

              <button
                onClick={() => triggerSimulation('SECURITY_BREACH')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#EF4444]/30 bg-[#180F25]/85 hover:bg-[#EF4444]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-semibold text-white">Security Breach</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-red-500" />
              </button>

              <button
                onClick={() => triggerSimulation('FIRE_ALARM')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#EF4444]/30 bg-[#180F25]/85 hover:bg-[#EF4444]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-white">Fire Alarm</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-red-500" />
              </button>

              <button
                onClick={() => triggerSimulation('GATE_FAILURE')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#F59E0B]/30 bg-[#180F25]/85 hover:bg-[#F59E0B]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-semibold text-white">Gate Failure</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              </button>

              <button
                onClick={() => triggerSimulation('WEATHER_ALERT')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#C6BADE]/30 bg-[#180F25]/85 hover:bg-[#C6BADE]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <CloudRain className="w-4 h-4 text-[#C6BADE]" />
                  <span className="text-xs font-semibold text-white">Weather Alert</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-[#C6BADE]" />
              </button>

              <button
                onClick={() => triggerSimulation('VIP_ARRIVAL')}
                className="w-full text-left px-4 py-3 border border-white/5 hover:border-[#F7B9C4]/30 bg-[#180F25]/85 hover:bg-[#F7B9C4]/10 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Crown className="w-4 h-4 text-[#F7B9C4]" />
                  <span className="text-xs font-semibold text-white">VIP Arrival</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-[#F7B9C4]" />
              </button>

              <button
                onClick={() => triggerSimulation('STADIUM_EVACUATION')}
                className="w-full text-left px-4 py-3 border border-[#EF4444]/40 hover:border-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 rounded-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs font-bold text-white">Stadium Evacuation</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-red-500 animate-ping" />
              </button>
            </div>
          </div>
        </div>

        {/* Center column: Live Map (Top) + Event Timeline (Bottom) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Live Stadium Digital Twin Map Widget */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-[340px] relative overflow-hidden bg-[#0D0715]">
            <div className="flex justify-between items-center z-10 shrink-0">
              <div>
                <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest block">Live Simulator Twin</span>
                <span className="text-xs font-bold text-white mt-1 block">Active Ingress/Telemetry Map</span>
              </div>
              
              <div className="flex space-x-2">
                <span className="px-2 py-0.5 text-[8px] font-bold font-mono text-emerald-400 bg-emerald-500/10 rounded">SYSTEM OK</span>
                {evacActive && (
                  <span className="px-2 py-0.5 text-[8px] font-bold font-mono text-red-400 bg-red-500/10 rounded animate-pulse">EVACUATION PROTOCOL ACTIVE</span>
                )}
              </div>
            </div>

            {/* Stadium Vector Twin Display */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 select-none">
              <svg viewBox="0 0 800 600" className="w-full h-full max-h-[250px] pointer-events-none">
                
                {/* Stadium base structure */}
                <ellipse cx={400} cy={300} rx={270} ry={220} fill="#180F25" stroke="rgba(255, 255, 255, 0.05)" strokeWidth={3} />
                
                {/* Ground Service Rooms */}
                <rect x={140} y={180} width={50} height={35} rx={4} fill="rgba(222, 99, 138, 0.15)" stroke="rgba(222, 99, 138, 0.3)" strokeWidth={1} />
                <text x={145} y={200} fill="#DE638A" fontSize={6} fontWeight="bold">CTRL</text>

                <rect x={140} y={380} width={50} height={35} rx={4} fill="rgba(198, 186, 222, 0.15)" stroke="rgba(198, 186, 222, 0.3)" strokeWidth={1} />
                <text x={145} y={400} fill="#C6BADE" fontSize={6} fontWeight="bold">SEC HQ</text>

                {/* Stadium Stand Sectors */}
                <path d="M 230 160 Q 400 130 570 160 L 610 90 Q 400 50 190 90 Z" fill="rgba(35, 22, 52, 0.65)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={2} />
                <path d="M 230 440 Q 400 470 570 440 L 610 510 Q 400 550 190 510 Z" fill="rgba(35, 22, 52, 0.65)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={2} />
                
                {/* Center Pitch */}
                <rect x={270} y={200} width={260} height={200} rx={12} fill="#1A1028" stroke="rgba(247, 185, 196, 0.2)" strokeWidth={1} />

                {/* Pulsing incident glow at coordinates */}
                {mapPulseZone && (
                  <g>
                    <circle
                      cx={SIMULATION_PRESETS[mapPulseZone]?.x || 400}
                      cy={SIMULATION_PRESETS[mapPulseZone]?.y || 300}
                      r={30}
                      fill="none"
                      stroke={SIMULATION_PRESETS[mapPulseZone]?.severity === 'critical' ? '#EF4444' : '#DE638A'}
                      strokeWidth={2}
                      className="opacity-75"
                    >
                      <animate attributeName="r" values="10;45" dur="1.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                    <circle
                      cx={SIMULATION_PRESETS[mapPulseZone]?.x || 400}
                      cy={SIMULATION_PRESETS[mapPulseZone]?.y || 300}
                      r={10}
                      fill={SIMULATION_PRESETS[mapPulseZone]?.severity === 'critical' ? '#EF4444' : '#DE638A'}
                    />
                  </g>
                )}

                {/* Animated moving responder team */}
                <motion.g
                  animate={{ x: responderPos.x, y: responderPos.y }}
                  transition={{ duration: 3 / simulationSpeed, ease: 'easeInOut' }}
                  className="z-30"
                >
                  {/* Outer glow ring */}
                  <circle cx={0} cy={0} r={16} fill="none" stroke="#F7B9C4" strokeWidth={1} opacity={0.6}>
                    <animate attributeName="r" values="8;20" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={0} cy={0} r={10} fill="#DE638A" stroke="#FFFFFF" strokeWidth={1.5} />
                  <text x={0} y={3} textAnchor="middle" fill="#FFFFFF" fontSize={7} fontWeight="black" fontFamily="monospace">RSP</text>
                </motion.g>
              </svg>
            </div>
          </div>

          {/* Event Timeline Table */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col min-h-[300px]">
            <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest block mb-4">Simulation Event Timeline</span>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[#94A3B8]">
                    <th className="py-2.5 font-bold uppercase tracking-wider text-[9px]">Event</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-[9px]">Location</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-[9px]">Severity</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-[9px]">Team</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-[9px] text-right">AI Resp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  <AnimatePresence initial={false}>
                    {timelineEvents.map((evt) => {
                      const matchedPreset = Object.values(SIMULATION_PRESETS).find(p => evt.text.includes(p.title));
                      if (!matchedPreset) return null;
                      return (
                        <motion.tr
                          key={evt.id}
                          initial={{ opacity: 0, height: 0, y: -20 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          onClick={() => {
                            setSelectedEvent(matchedPreset);
                            setResponderPos({ x: matchedPreset.x, y: matchedPreset.y });
                            setMapPulseZone(matchedPreset.key);
                          }}
                          className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${selectedEvent?.key === matchedPreset.key ? 'bg-[#DE638A]/5' : ''}`}
                        >
                          <td className="py-3 flex items-center space-x-2 font-semibold text-white">
                            <span className="text-gray-500 text-[10px]">●</span>
                            <span>{matchedPreset.title}</span>
                          </td>
                          <td className="py-3 text-[#94A3B8]">{matchedPreset.location}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 border text-[9px] rounded font-bold uppercase ${getSeverityBadge(matchedPreset.severity)}`}>
                              {matchedPreset.severity}
                            </span>
                          </td>
                          <td className="py-3 text-[#94A3B8]">{matchedPreset.team}</td>
                          <td className="py-3 text-right text-[#C6BADE] font-bold">{matchedPreset.responseTime}</td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  
                  {timelineEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#64748B] text-[10px] uppercase font-bold tracking-wider">
                        No active simulated incidents. Click any control trigger to inject an event.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: AI Incident Commander console */}
        <div className="xl:col-span-1 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 h-full flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center space-x-2 border-b border-white/5 pb-4 mb-4">
                <Cpu className="w-4 h-4 text-[#C6BADE]" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">AI Incident Commander</h3>
                  <span className="text-[8px] text-[#94A3B8] font-mono">AUTOMATED MITIGATION DESK</span>
                </div>
              </div>

              {selectedEvent ? (
                <div className="space-y-5">
                  <div>
                    <span className="text-[8px] text-[#C6BADE] font-mono uppercase">Assessment log</span>
                    <h4 className="text-sm font-extrabold text-white mt-1 leading-relaxed">{selectedEvent.title}</h4>
                    <p className="text-[11px] text-gray-300 mt-2 leading-relaxed">{selectedEvent.summary}</p>
                  </div>

                  <div className="p-3 bg-[#120A1D] border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Affected Headcount:</span>
                      <span className="font-bold text-white font-mono">{selectedEvent.affectedSpectators.toLocaleString()} fans</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Risk Assessment:</span>
                      <span className="font-bold text-[#EF4444] uppercase font-mono">{selectedEvent.severity}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Expected Recovery Rate:</span>
                      <span className="font-bold text-emerald-400 font-mono">{selectedEvent.expectedReduction}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">AI Logic Confidence:</span>
                      <span className="font-bold text-[#C6BADE] font-mono">{selectedEvent.confidence}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] text-[#94A3B8] font-mono uppercase block mb-2">Recommended mitigation keys</span>
                    <div className="space-y-1.5">
                      {selectedEvent.recommendedActions.map((action, index) => (
                        <div key={index} className="flex items-start space-x-2 text-[10.5px] text-gray-300 bg-white/[0.01] border border-white/[0.03] p-2 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Share2 className="w-10 h-10 text-[#64748B] mb-3 animate-pulse" />
                  <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider leading-relaxed">
                    Awaiting Incident dispatch.<br />Trigger a simulation event on the left panel to review AI recommendations.
                  </p>
                </div>
              )}
            </div>

            {/* Console summary indicator */}
            {selectedEvent && (
              <div className="pt-4 border-t border-white/5 text-[9px] text-[#94A3B8] font-mono text-center flex items-center justify-center space-x-1">
                <span>AI DISPATCH ACTION ACTIVE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Simulation;
