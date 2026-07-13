import React, { useState, useEffect, useRef } from 'react';
import { useOpsStore } from '../store/opsStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  RefreshCw,
  Layers,
  Camera,
  Users,
  TrendingUp,
  MapPin,
  AlertTriangle,
  HeartPulse,
  Shield,
  Activity,
  Clock,
  Compass,
  Phone,
  Eye,
  Info,
  Check,
  Zap,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────

interface StadiumZone {
  id: string;
  name: string;
  category: 'stand' | 'gate' | 'service' | 'pitch' | 'parking';
  occupancy: number;
  maxCapacity: number;
  expectedOccupancy: number;
  predictionNext15m: number;
  nearestMedical: string;
  nearestSecurity: string;
  nearbyCameras: string[];
  lastIncident: string;
  currentAlerts: string[];
  x: number; // SVG center X
  y: number; // SVG center Y
  risk?: 'green' | 'yellow' | 'orange' | 'red';
  queueLength?: number; // only for gates
}

interface EventAlert {
  id: string;
  type: 'medical' | 'child' | 'package' | 'fight' | 'crowd' | 'weather';
  title: string;
  description: string;
  timestamp: string;
  zoneId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  x: number; // SVG mapping coordinates
  y: number;
}

// ──────────────────────────────────────────────
// Initial Dataset
// ──────────────────────────────────────────────

const INITIAL_ZONES: StadiumZone[] = [
  // Stands
  {
    id: 'zone-north-stand',
    name: 'North Stand (General Admission)',
    category: 'stand',
    occupancy: 18450,
    maxCapacity: 20000,
    expectedOccupancy: 19100,
    predictionNext15m: 19500,
    nearestMedical: 'Medical Bay Alpha (Ground Level)',
    nearestSecurity: 'Security Station 2 (North Gate)',
    nearbyCameras: ['CAM-N01', 'CAM-N02', 'CAM-N03'],
    lastIncident: 'Slip and fall accident reported at Stairs 12',
    currentAlerts: ['Stairwell congestion high near Gate A exit'],
    x: 400,
    y: 110,
    risk: 'orange',
  },
  {
    id: 'zone-south-stand',
    name: 'South Stand (Supporters End)',
    category: 'stand',
    occupancy: 19120,
    maxCapacity: 20000,
    expectedOccupancy: 19800,
    predictionNext15m: 19950,
    nearestMedical: 'Medical Bay Beta (Lower South)',
    nearestSecurity: 'Security Station 4 (South)',
    nearbyCameras: ['CAM-S01', 'CAM-S02', 'CAM-S03'],
    lastIncident: 'Flares confiscated at checkpoint 6',
    currentAlerts: ['Crowd density exceeding 85% in Lower Tier'],
    x: 400,
    y: 490,
    risk: 'red',
  },
  {
    id: 'zone-east-stand',
    name: 'East Stand (Family Sector)',
    category: 'stand',
    occupancy: 13500,
    maxCapacity: 18000,
    expectedOccupancy: 14200,
    predictionNext15m: 14500,
    nearestMedical: 'Medical Bay Gamma (East)',
    nearestSecurity: 'Security Station 3 (East)',
    nearbyCameras: ['CAM-E01', 'CAM-E02'],
    lastIncident: 'Lost child resolved in Sector E4',
    currentAlerts: [],
    x: 690,
    y: 300,
    risk: 'green',
  },
  {
    id: 'zone-west-stand',
    name: 'West Stand (Premium & Press)',
    category: 'stand',
    occupancy: 11450,
    maxCapacity: 16000,
    expectedOccupancy: 12000,
    predictionNext15m: 12200,
    nearestMedical: 'Medical Bay Delta (VIP West)',
    nearestSecurity: 'Security Main HQ (West)',
    nearbyCameras: ['CAM-W01', 'CAM-W02', 'CAM-W03'],
    lastIncident: 'Credential mismatch at press lobby',
    currentAlerts: [],
    x: 110,
    y: 300,
    risk: 'green',
  },
  // Pitch
  {
    id: 'zone-pitch',
    name: 'Main Playing Field & Bench Areas',
    category: 'pitch',
    occupancy: 65,
    maxCapacity: 120,
    expectedOccupancy: 70,
    predictionNext15m: 80,
    nearestMedical: 'Pitch-side Trauma Unit',
    nearestSecurity: 'Pitch Boundary Guard 1-4',
    nearbyCameras: ['CAM-PITCH-01', 'CAM-PITCH-02'],
    lastIncident: 'Minor muscle strain treated during warmup',
    currentAlerts: [],
    x: 400,
    y: 300,
    risk: 'green',
  },
  // Gates
  {
    id: 'gate-a',
    name: 'Gate A (North Entrance)',
    category: 'gate',
    occupancy: 3840,
    maxCapacity: 5000,
    expectedOccupancy: 4200,
    predictionNext15m: 4500,
    nearestMedical: 'Medical Station A',
    nearestSecurity: 'North Gate Patrol A',
    nearbyCameras: ['CAM-GATE-A1', 'CAM-GATE-A2'],
    lastIncident: 'Scanning system outage (resolved)',
    currentAlerts: ['Queue wait time exceeds 6 minutes'],
    queueLength: 210,
    risk: 'yellow',
    x: 400,
    y: 30,
  },
  {
    id: 'gate-b',
    name: 'Gate B (East Entrance)',
    category: 'gate',
    occupancy: 4120,
    maxCapacity: 5000,
    expectedOccupancy: 4800,
    predictionNext15m: 4950,
    nearestMedical: 'Medical Station B',
    nearestSecurity: 'East Gate Patrol B',
    nearbyCameras: ['CAM-GATE-B1', 'CAM-GATE-B2'],
    lastIncident: 'Minor bottleneck near bag check',
    currentAlerts: ['Queue length at 320 people'],
    queueLength: 320,
    risk: 'orange',
    x: 770,
    y: 300,
  },
  {
    id: 'gate-c',
    name: 'Gate C (South Entrance)',
    category: 'gate',
    occupancy: 4780,
    maxCapacity: 5000,
    expectedOccupancy: 4900,
    predictionNext15m: 5120,
    nearestMedical: 'Medical Station C',
    nearestSecurity: 'South Gate Patrol C',
    nearbyCameras: ['CAM-GATE-C1', 'CAM-GATE-C2'],
    lastIncident: 'Spectator ticket validation loop',
    currentAlerts: ['Queue capacity at CRITICAL - redirecting flow'],
    queueLength: 480,
    risk: 'red',
    x: 400,
    y: 570,
  },
  {
    id: 'gate-d',
    name: 'Gate D (West VIP Entrance)',
    category: 'gate',
    occupancy: 1240,
    maxCapacity: 3000,
    expectedOccupancy: 1400,
    predictionNext15m: 1500,
    nearestMedical: 'Medical Station D',
    nearestSecurity: 'VIP Entrance Security',
    nearbyCameras: ['CAM-GATE-D1'],
    lastIncident: 'Lost accreditation pass replaced',
    currentAlerts: [],
    queueLength: 45,
    risk: 'green',
    x: 30,
    y: 300,
  },
  // Key Operations Offices / Services
  {
    id: 'service-control-room',
    name: 'Main Venue Control Room (VCR)',
    category: 'service',
    occupancy: 24,
    maxCapacity: 40,
    expectedOccupancy: 25,
    predictionNext15m: 25,
    nearestMedical: 'HQ First Aid Kit',
    nearestSecurity: 'VCR Dedicated Guard',
    nearbyCameras: ['CAM-VCR-INTERNAL'],
    lastIncident: 'System failover test completed',
    currentAlerts: [],
    x: 170,
    y: 200,
    risk: 'green',
  },
  {
    id: 'service-medical-hq',
    name: 'Primary Medical Center (Level 1)',
    category: 'service',
    occupancy: 18,
    maxCapacity: 50,
    expectedOccupancy: 20,
    predictionNext15m: 22,
    nearestMedical: 'On-site Medical Staff',
    nearestSecurity: 'Security Station 1',
    nearbyCameras: ['CAM-MED-HQ'],
    lastIncident: 'Stretcher dispatch to West Stand',
    currentAlerts: [],
    x: 630,
    y: 200,
    risk: 'green',
  },
  {
    id: 'service-security-hq',
    name: 'Central Security HQ',
    category: 'service',
    occupancy: 45,
    maxCapacity: 80,
    expectedOccupancy: 50,
    predictionNext15m: 55,
    nearestMedical: 'Medical Bay Delta',
    nearestSecurity: 'Response Team A-H Standby',
    nearbyCameras: ['CAM-SEC-HQ'],
    lastIncident: 'Marshal briefing completed',
    currentAlerts: [],
    x: 170,
    y: 400,
    risk: 'green',
  },
  {
    id: 'service-food-court',
    name: 'North Concourse Food Court',
    category: 'service',
    occupancy: 2400,
    maxCapacity: 3000,
    expectedOccupancy: 2600,
    predictionNext15m: 2850,
    nearestMedical: 'Medical Bay Alpha',
    nearestSecurity: 'North Stand Stewards',
    nearbyCameras: ['CAM-FOOD-N1', 'CAM-FOOD-N2'],
    lastIncident: 'Minor spill reported and cleaned',
    currentAlerts: [],
    x: 520,
    y: 160,
    risk: 'green',
  },
  {
    id: 'service-parking',
    name: 'North Broadcast & VIP Parking Lot',
    category: 'parking',
    occupancy: 840,
    maxCapacity: 1200,
    expectedOccupancy: 860,
    predictionNext15m: 900,
    nearestMedical: 'Medical Bay Alpha',
    nearestSecurity: 'Parking Zone Patrol',
    nearbyCameras: ['CAM-PARK-01', 'CAM-PARK-02'],
    lastIncident: 'VIP transport convoy arrival',
    currentAlerts: [],
    x: 600,
    y: 60,
    risk: 'green',
  },
];

const INITIAL_EVENTS: EventAlert[] = [
  {
    id: 'evt-1',
    type: 'medical',
    title: 'Medical Emergency',
    description: 'Spectator complaining of chest tightness in Section S4, Row 12.',
    timestamp: '22:41',
    zoneId: 'zone-south-stand',
    severity: 'high',
    resolved: false,
    x: 320,
    y: 470,
  },
  {
    id: 'evt-2',
    type: 'crowd',
    title: 'Overcrowding Alert',
    description: 'Chokepoint warning at Gate C interior lobby turnstiles.',
    timestamp: '22:42',
    zoneId: 'gate-c',
    severity: 'critical',
    resolved: false,
    x: 400,
    y: 540,
  },
  {
    id: 'evt-3',
    type: 'child',
    title: 'Lost Child Reported',
    description: '7-year-old child wearing red jersey separated near Merchandise Shop B.',
    timestamp: '22:43',
    zoneId: 'zone-east-stand',
    severity: 'medium',
    resolved: false,
    x: 690,
    y: 260,
  },
  {
    id: 'evt-4',
    type: 'package',
    title: 'Suspicious Package',
    description: 'Unattended black duffel bag under seat block W14.',
    timestamp: '22:44',
    zoneId: 'zone-west-stand',
    severity: 'high',
    resolved: false,
    x: 140,
    y: 330,
  },
];

// ──────────────────────────────────────────────
// Risk Level and Colors
// ──────────────────────────────────────────────

const getRiskColor = (risk?: string) => {
  switch (risk) {
    case 'red': return '#EF4444';
    case 'orange': return '#F59E0B';
    case 'yellow': return '#EAB308';
    case 'green':
    default:
      return '#22C55E';
  }
};

const getRiskTextColor = (risk?: string) => {
  switch (risk) {
    case 'red': return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20';
    case 'orange': return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20';
    case 'yellow': return 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20';
    case 'green':
    default:
      return 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20';
  }
};

// ──────────────────────────────────────────────
// Component Definition
// ──────────────────────────────────────────────

export const Navigation: React.FC = () => {
  const store = useOpsStore();
  const [zones, setZones] = useState<StadiumZone[]>(INITIAL_ZONES);
  const [events, setEvents] = useState<EventAlert[]>(INITIAL_EVENTS);
  const [selectedZone, setSelectedZone] = useState<StadiumZone | null>(null);
  
  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showCameras, setShowCameras] = useState(true);
  const [showCrowdStats, setShowCrowdStats] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);

  // Zoom & Pan transforms
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // ──────────────────────────────────────────
  // Centralized State Sync Hook
  // ──────────────────────────────────────────
  useEffect(() => {
    // 1. Sync zones with global metrics
    setZones((prevZones) =>
      prevZones.map((z) => {
        let matchedMetric = store.crowdMetrics[0];
        if (z.id.includes('north')) matchedMetric = store.crowdMetrics.find(m => m.zone_id === 'ZONE_GATE_A') || matchedMetric;
        if (z.id.includes('south')) matchedMetric = store.crowdMetrics.find(m => m.zone_id === 'ZONE_GATE_B') || matchedMetric;
        if (z.id.includes('east')) matchedMetric = store.crowdMetrics.find(m => m.zone_id === 'ZONE_FOOD_E') || matchedMetric;
        if (z.id.includes('west')) matchedMetric = store.crowdMetrics.find(m => m.zone_id === 'ZONE_VIP') || matchedMetric;

        const occupancyPct = matchedMetric?.occupancy_pct || 50;
        return {
          ...z,
          occupancy: Math.round(z.maxCapacity * (occupancyPct / 100)),
          risk: occupancyPct > 85 ? 'red' : occupancyPct > 65 ? 'orange' : 'green',
        };
      })
    );

    // 2. Sync active alarms on layout map with global incidents list
    const activeAlarms: EventAlert[] = store.incidents.map((inc) => {
      let x = 400;
      let y = 300;
      if (inc.zone_id === 'ZONE_GATE_A') { x = 400; y = 110; }
      else if (inc.zone_id === 'ZONE_GATE_B') { x = 400; y = 490; }
      else if (inc.zone_id === 'ZONE_FOOD_E') { x = 690; y = 300; }
      else if (inc.zone_id === 'ZONE_VIP') { x = 110; y = 300; }

      return {
        id: inc.id,
        type: inc.type.toLowerCase().includes('medical') ? 'medical' : inc.type.toLowerCase().includes('weather') ? 'weather' : 'crowd',
        title: inc.title,
        description: inc.description,
        timestamp: new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        zoneId: inc.zone_id === 'ZONE_GATE_A' ? 'zone-north-stand' : inc.zone_id === 'ZONE_GATE_B' ? 'zone-south-stand' : 'zone-east-stand',
        severity: inc.severity.toLowerCase() as any,
        resolved: inc.status === 'Resolved',
        x,
        y
      };
    });

    setEvents(activeAlarms);
  }, [store.crowdMetrics, store.incidents]);

  // Update selected zone data in drawer when zones shift
  useEffect(() => {
    if (selectedZone) {
      const updated = zones.find(z => z.id === selectedZone.id);
      if (updated) setSelectedZone(updated);
    }
  }, [zones, selectedZone]);

  // ──────────────────────────────────────────
  // Pan & Zoom Handlers
  // ──────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedZone(null);
  };

  const selectAndFocusLocation = (zoneId: string, x: number, y: number) => {
    const matched = zones.find(z => z.id === zoneId);
    if (matched) setSelectedZone(matched);
    
    // Pan to center the item
    // Dimensions of viewport is approx 600px x 800px. Standard SVG coordinates range 0-800x0-600.
    // Center of viewport in absolute coordinates is (400, 300).
    const centerX = 400;
    const centerY = 300;
    setPan({
      x: (centerX - x) * zoom,
      y: (centerY - y) * zoom,
    });
  };

  // Aggregates for Right Panel
  const totalOccupancy = zones.reduce((sum, z) => sum + z.occupancy, 0);
  const totalMax = zones.reduce((sum, z) => sum + z.maxCapacity, 0);
  const criticalGates = zones.filter(z => z.category === 'gate' && z.risk === 'red').length;
  const criticalStands = zones.filter(z => z.category === 'stand' && (z.risk === 'red' || z.risk === 'orange')).length;

  return (
    <div className="flex h-full w-full overflow-hidden font-sans text-[#F8FAFC]">
      
      {/* ───── LEFT / CENTER: Map Canvas ───── */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#120A1D]">
        
        {/* Top Controls Toolbar */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
          
          {/* Zoom / Navigation Controls */}
          <div className="flex items-center space-x-2 bg-[#180F25]/90 border border-white/5 p-2 rounded-xl backdrop-blur-md pointer-events-auto shadow-2xl">
            <button
              onClick={() => handleZoom(0.15)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={resetView}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex items-center space-x-1.5"
              title="Reset Zoom"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Layer Visibility Toggles */}
          <div className="flex items-center space-x-2 bg-[#180F25]/90 border border-white/5 p-2 rounded-xl backdrop-blur-md pointer-events-auto shadow-2xl">
            <div className="flex items-center space-x-1 px-2 border-r border-white/5 text-[9px] font-bold text-gray-400 uppercase tracking-widest mr-1">
              <Layers className="w-3.5 h-3.5 text-[#F7B9C4] mr-1.5" />
              <span>Layers</span>
            </div>
            
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                showHeatmap 
                  ? 'bg-[#C6BADE]/15 border border-[#C6BADE]/45 text-[#E7E2F2]' 
                  : 'bg-transparent border border-transparent text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              Heatmap
            </button>

            <button
              onClick={() => setShowCameras(!showCameras)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                showCameras 
                  ? 'bg-[#F7B9C4]/15 border border-[#F7B9C4]/45 text-[#F7B9C4]' 
                  : 'bg-transparent border border-transparent text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              Cameras
            </button>

            <button
              onClick={() => setShowCrowdStats(!showCrowdStats)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                showCrowdStats 
                  ? 'bg-[#DE638A]/15 border border-[#DE638A]/45 text-[#DE638A]' 
                  : 'bg-transparent border border-transparent text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              Crowd Status
            </button>

            <button
              onClick={() => setShowPredictions(!showPredictions)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                showPredictions 
                  ? 'bg-emerald-500/15 border border-emerald-500/45 text-emerald-400' 
                  : 'bg-transparent border border-transparent text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              Predictions
            </button>
          </div>

        </div>

        {/* ───── STADIUM CANVAS VIEWPORT ───── */}
        <div
          className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden select-none relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Vector Stadium & Layers Container */}
          <div
            className="w-full h-full flex items-center justify-center origin-center transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg
              viewBox="0 0 800 600"
              className="w-[800px] h-[600px] select-none pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              <defs>
                {/* Heatmap Gradients */}
                <radialGradient id="heat-red" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#EF4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heat-orange" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.55" />
                  <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
                
                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 1. Parking Lots Outlines */}
              <path
                d="M 50 50 L 250 50 L 250 120 L 50 120 Z"
                fill="rgba(255, 255, 255, 0.02)"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <text x={60} y={75} fill="#64748B" fontSize={8} fontWeight="bold" letterSpacing="0.1em">PARKING LOT WEST</text>
              
              <path
                d="M 550 50 L 750 50 L 750 120 L 550 120 Z"
                fill="rgba(255, 255, 255, 0.02)"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <text x={560} y={75} fill="#64748B" fontSize={8} fontWeight="bold" letterSpacing="0.1em">PARKING LOT EAST</text>

              {/* Outer Security Ring Boundary */}
              <circle cx={400} cy={300} r={285} fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} />

              {/* 2. Stadium Structure Backplate */}
              <ellipse cx={400} cy={300} rx={270} ry={220} fill="#0D0715" stroke="rgba(255, 255, 255, 0.05)" strokeWidth={3} />
              
              {/* 3. Outer Concourse / Gate Indicators (Clickable) */}
              {/* Gate A (Top) */}
              <path
                d="M 360 40 L 440 40 L 450 70 L 350 70 Z"
                fill={selectedZone?.id === 'gate-a' ? 'rgba(222, 99, 138, 0.25)' : 'rgba(255, 255, 255, 0.03)'}
                stroke={selectedZone?.id === 'gate-a' ? '#DE638A' : 'rgba(255,255,255,0.1)'}
                strokeWidth={1.5}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('gate-a', 400, 30); }}
              />
              {/* Gate B (Right) */}
              <path
                d="M 730 260 L 760 250 L 760 350 L 730 340 Z"
                fill={selectedZone?.id === 'gate-b' ? 'rgba(222, 99, 138, 0.25)' : 'rgba(255, 255, 255, 0.03)'}
                stroke={selectedZone?.id === 'gate-b' ? '#DE638A' : 'rgba(255,255,255,0.1)'}
                strokeWidth={1.5}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('gate-b', 770, 300); }}
              />
              {/* Gate C (Bottom) */}
              <path
                d="M 350 530 L 450 530 L 440 560 L 360 560 Z"
                fill={selectedZone?.id === 'gate-c' ? 'rgba(222, 99, 138, 0.25)' : 'rgba(255, 255, 255, 0.03)'}
                stroke={selectedZone?.id === 'gate-c' ? '#DE638A' : 'rgba(255,255,255,0.1)'}
                strokeWidth={1.5}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('gate-c', 400, 570); }}
              />
              {/* Gate D (Left) */}
              <path
                d="M 40 250 L 70 260 L 70 340 L 40 350 Z"
                fill={selectedZone?.id === 'gate-d' ? 'rgba(222, 99, 138, 0.25)' : 'rgba(255, 255, 255, 0.03)'}
                stroke={selectedZone?.id === 'gate-d' ? '#DE638A' : 'rgba(255,255,255,0.1)'}
                strokeWidth={1.5}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('gate-d', 30, 300); }}
              />

              {/* 4. Stand Sectors (Interactive Polygons) */}
              {/* North Stand */}
              <path
                d="M 230 160 Q 400 130 570 160 L 610 90 Q 400 50 190 90 Z"
                fill={selectedZone?.id === 'zone-north-stand' ? 'rgba(198, 186, 222, 0.25)' : 'rgba(35, 22, 52, 0.65)'}
                stroke={selectedZone?.id === 'zone-north-stand' ? '#C6BADE' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={2}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/[0.05]"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('zone-north-stand', 400, 110); }}
              />
              {/* South Stand */}
              <path
                d="M 230 440 Q 400 470 570 440 L 610 510 Q 400 550 190 510 Z"
                fill={selectedZone?.id === 'zone-south-stand' ? 'rgba(198, 186, 222, 0.25)' : 'rgba(35, 22, 52, 0.65)'}
                stroke={selectedZone?.id === 'zone-south-stand' ? '#C6BADE' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={2}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/[0.05]"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('zone-south-stand', 400, 490); }}
              />
              {/* East Stand */}
              <path
                d="M 580 180 Q 640 300 580 420 L 670 450 Q 740 300 670 150 Z"
                fill={selectedZone?.id === 'zone-east-stand' ? 'rgba(198, 186, 222, 0.25)' : 'rgba(35, 22, 52, 0.65)'}
                stroke={selectedZone?.id === 'zone-east-stand' ? '#C6BADE' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={2}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/[0.05]"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('zone-east-stand', 690, 300); }}
              />
              {/* West Stand */}
              <path
                d="M 220 180 Q 160 300 220 420 L 130 450 Q 60 300 130 150 Z"
                fill={selectedZone?.id === 'zone-west-stand' ? 'rgba(198, 186, 222, 0.25)' : 'rgba(35, 22, 52, 0.65)'}
                stroke={selectedZone?.id === 'zone-west-stand' ? '#C6BADE' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={2}
                className="pointer-events-auto cursor-pointer transition-all hover:fill-white/[0.05]"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('zone-west-stand', 110, 300); }}
              />

              {/* 5. Inner Field Ring / Concourse Ring */}
              <ellipse cx={400} cy={300} rx={200} ry={150} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

              {/* 6. Pitch (Center Playing Area) */}
              <rect
                x={270}
                y={200}
                width={260}
                height={200}
                rx={12}
                fill="#1A1028"
                stroke={selectedZone?.id === 'zone-pitch' ? '#F7B9C4' : 'rgba(247, 185, 196, 0.2)'}
                strokeWidth={selectedZone?.id === 'zone-pitch' ? 2 : 1}
                className="pointer-events-auto cursor-pointer transition-all hover:opacity-90"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('zone-pitch', 400, 300); }}
              />
              {/* Field Inner Lines */}
              <rect x={280} y={210} width={240} height={180} fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} />
              <line x1={400} y1={210} x2={400} y2={390} stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} />
              <circle cx={400} cy={300} r={30} fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} />

              {/* 7. Key Ground Service Rooms (Clickable rectangles) */}
              {/* Control Room (Left-ish) */}
              <rect
                x={140}
                y={180}
                width={50}
                height={35}
                rx={4}
                fill={selectedZone?.id === 'service-control-room' ? 'rgba(222, 99, 138, 0.2)' : 'rgba(255,255,255,0.02)'}
                stroke="rgba(222, 99, 138, 0.3)"
                strokeWidth={1}
                className="pointer-events-auto cursor-pointer hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('service-control-room', 170, 200); }}
              />
              <text x={145} y={200} fill="#DE638A" fontSize={6} fontWeight="bold">CTRL</text>

              {/* Security Room */}
              <rect
                x={140}
                y={380}
                width={50}
                height={35}
                rx={4}
                fill={selectedZone?.id === 'service-security-hq' ? 'rgba(198, 186, 222, 0.2)' : 'rgba(255,255,255,0.02)'}
                stroke="rgba(198, 186, 222, 0.3)"
                strokeWidth={1}
                className="pointer-events-auto cursor-pointer hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('service-security-hq', 170, 400); }}
              />
              <text x={145} y={400} fill="#C6BADE" fontSize={6} fontWeight="bold">SEC HQ</text>

              {/* Medical HQ */}
              <rect
                x={610}
                y={180}
                width={50}
                height={35}
                rx={4}
                fill={selectedZone?.id === 'service-medical-hq' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.02)'}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth={1}
                className="pointer-events-auto cursor-pointer hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('service-medical-hq', 630, 200); }}
              />
              <text x={615} y={200} fill="#EF4444" fontSize={6} fontWeight="bold">MED HQ</text>

              {/* Food Court */}
              <rect
                x={495}
                y={145}
                width={50}
                height={25}
                rx={4}
                fill={selectedZone?.id === 'service-food-court' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(255,255,255,0.02)'}
                stroke="rgba(22, 163, 74, 0.3)"
                strokeWidth={1}
                className="pointer-events-auto cursor-pointer hover:fill-white/5"
                onClick={(e) => { e.stopPropagation(); selectAndFocusLocation('service-food-court', 520, 160); }}
              />
              <text x={502} y={160} fill="#22C55E" fontSize={6} fontWeight="bold">FOOD</text>

              {/* ──────────────────────────────────────────
                  LAYER OVERLAY: Live Crowd Heatmap
                  ────────────────────────────────────────── */}
              {showHeatmap && (
                <g className="mix-blend-lighten pointer-events-none">
                  {/* Heatmap overlaying South Stand (Critical) */}
                  <circle cx={400} cy={480} r={110} fill="url(#heat-red)" opacity={0.8} />
                  <circle cx={350} cy={460} r={70} fill="url(#heat-red)" opacity={0.65} />
                  <circle cx={450} cy={460} r={70} fill="url(#heat-red)" opacity={0.65} />

                  {/* Heatmap overlaying North Stand (Moderate) */}
                  <circle cx={400} cy={120} r={80} fill="url(#heat-orange)" opacity={0.7} />
                  
                  {/* Heatmap near Gate C (Critical) */}
                  <circle cx={400} cy={540} r={60} fill="url(#heat-red)" opacity={0.85} />
                </g>
              )}

              {/* ──────────────────────────────────────────
                  LAYER OVERLAY: Cameras & CCTV Indicators
                  ────────────────────────────────────────── */}
              {showCameras && (
                <g className="pointer-events-none">
                  {/* Cam nodes */}
                  {[[110, 140], [690, 140], [110, 460], [690, 460], [400, 80], [400, 520]].map(([cx, cy], idx) => (
                    <g key={idx} className="opacity-80">
                      <circle cx={cx} cy={cy} r={6} fill="#0D0715" stroke="#F7B9C4" strokeWidth={1} />
                      <circle cx={cx} cy={cy} r={2} fill="#F7B9C4" />
                    </g>
                  ))}
                </g>
              )}

              {/* ──────────────────────────────────────────
                  LAYER OVERLAY: Live Crowd Stats Labels
                  ────────────────────────────────────────── */}
              {showCrowdStats && (
                <g className="pointer-events-none">
                  {zones.map((zone) => {
                    if (zone.category === 'pitch' || zone.category === 'service' || zone.category === 'parking') return null;
                    const pct = (zone.occupancy / zone.maxCapacity) * 100;
                    return (
                      <g key={zone.id} transform={`translate(${zone.x}, ${zone.y})`}>
                        {/* Background plaque */}
                        <rect
                          x={-35}
                          y={-12}
                          width={70}
                          height={22}
                          rx={4}
                          fill="rgba(5, 11, 28, 0.85)"
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth={1}
                        />
                        {/* Occupancy text */}
                        <text
                          x={0}
                          y={-2}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={6.5}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {zone.occupancy.toLocaleString()}
                        </text>
                        {/* Percent text */}
                        <text
                          x={0}
                          y={6}
                          textAnchor="middle"
                          fill={getRiskColor(zone.risk)}
                          fontSize={6.5}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pct.toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* ──────────────────────────────────────────
                  LAYER OVERLAY: Prediction Indicators
                  ────────────────────────────────────────── */}
              {showPredictions && (
                <g className="pointer-events-none">
                  {zones.map((zone) => {
                    if (zone.category !== 'stand' && zone.category !== 'gate') return null;
                    const delta = zone.predictionNext15m - zone.occupancy;
                    const isUp = delta >= 0;
                    return (
                      <g key={`pred-${zone.id}`} transform={`translate(${zone.x + 25}, ${zone.y - 20})`}>
                        <rect x={-15} y={-6} width={30} height={12} rx={2} fill="rgba(11, 18, 40, 0.9)" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                        <text x={2} y={3} textAnchor="middle" fill={isUp ? '#EF4444' : '#22C55E'} fontSize={5.5} fontWeight="bold">
                          {isUp ? '▲' : '▼'} {Math.abs(delta)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* ──────────────────────────────────────────
                  LAYER OVERLAY: Pulsing Active Incidents
                  ────────────────────────────────────────── */}
              {events.map((evt) => (
                <g
                  key={evt.id}
                  transform={`translate(${evt.x}, ${evt.y})`}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAndFocusLocation(evt.zoneId, evt.x, evt.y);
                  }}
                >
                  {/* Expanding pulse animation rings */}
                  <circle cx={0} cy={0} r={14} fill="none" stroke={evt.severity === 'critical' ? '#EF4444' : '#F59E0B'} strokeWidth={1.5} opacity={0.6}>
                    <animate attributeName="r" values="8;24" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={0} cy={0} r={8} fill={evt.severity === 'critical' ? '#EF4444' : '#F59E0B'} />
                  {/* Small inner symbol icon */}
                  <text x={0} y={3} textAnchor="middle" fill="#FFFFFF" fontSize={9} fontWeight="bold">
                    {evt.type === 'medical' ? '＋' : '!'}
                  </text>
                </g>
              ))}

            </svg>
          </div>
        </div>

        {/* ───── BOTTOM PANELS: Timeline Event Ticker ───── */}
        <div className="border-t border-white/5 bg-[#180F25]/85 backdrop-blur-md p-4 relative z-10 shrink-0">
          <div className="flex items-center space-x-3 mb-2.5">
            <Clock className="w-3.5 h-3.5 text-[#F7B9C4]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest font-display">Live Incident Timeline</span>
          </div>
          
          <div className="flex space-x-3 overflow-x-auto pb-1.5 scrollbar-thin">
            {events.map((evt) => (
              <button
                key={evt.id}
                onClick={() => selectAndFocusLocation(evt.zoneId, evt.x, evt.y)}
                className="flex items-start space-x-3 px-4 py-3 bg-[#231634]/85 hover:bg-[#332049]/80 border border-white/5 hover:border-[#F7B9C4]/20 rounded-xl text-left min-w-[260px] max-w-[260px] shrink-0 transition-all duration-200"
              >
                {evt.severity === 'critical' ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                ) : evt.type === 'medical' ? (
                  <HeartPulse className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                ) : (
                  <Shield className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white truncate pr-1">{evt.title}</span>
                    <span className="text-[8px] text-[#94A3B8] font-mono shrink-0">{evt.timestamp}</span>
                  </div>
                  <p className="text-[9px] text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">{evt.description}</p>
                </div>
              </button>
            ))}
            {events.length === 0 && (
              <div className="text-xs text-gray-500 py-3 px-2">No active incidents reported. Stadium operations normal.</div>
            )}
          </div>
        </div>

        {/* ───── DETAILS SLIDE-OUT DRAWER ───── */}
        <AnimatePresence>
          {selectedZone && (
            <motion.div
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute left-6 top-24 bottom-28 w-[320px] bg-[#180F25]/95 border border-white/8 rounded-2xl shadow-2xl backdrop-blur-lg z-20 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-white/5 bg-[#120A1D] flex justify-between items-start">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border ${getRiskTextColor(selectedZone.risk)}`}>
                      {selectedZone.category}
                    </span>
                    <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Telemetry drawer</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white mt-1.5 truncate font-display">{selectedZone.name}</h4>
                </div>
                <button
                  onClick={() => setSelectedZone(null)}
                  className="text-xs text-[#94A3B8] hover:text-white uppercase font-bold tracking-widest pl-2"
                >
                  Hide
                </button>
              </div>

              {/* Drawer Contents */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                
                {/* Large Occupancy Plate */}
                <div className="grid grid-cols-2 gap-2 bg-[#231634] border border-white/5 rounded-xl p-3.5">
                  <div>
                    <div className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-wider">Current Capacity</div>
                    <div className="text-lg font-black text-white mt-1 font-mono">
                      {selectedZone.occupancy.toLocaleString()}
                    </div>
                    <div className="text-[8px] text-[#94A3B8] mt-0.5">/ {selectedZone.maxCapacity.toLocaleString()} limit</div>
                  </div>
                  <div className="border-l border-white/5 pl-3">
                    <div className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-wider">Capacity Load</div>
                    <div className="text-lg font-black mt-1 font-mono" style={{ color: getRiskColor(selectedZone.risk) }}>
                      {((selectedZone.occupancy / selectedZone.maxCapacity) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Queue telemetry (if gate) */}
                {selectedZone.queueLength !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-[#94A3B8]">Queue Length</span>
                      <span className="font-bold font-mono text-white">{selectedZone.queueLength} people</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-[#94A3B8]">Average Scan Rate</span>
                      <span className="font-mono text-[#F7B9C4]">48 scans/min</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-[#94A3B8]">Est. Wait Time</span>
                      <span className="font-mono text-[#F59E0B]">~6.8 minutes</span>
                    </div>
                  </div>
                )}

                {/* Predictions Panel */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">Halftime Flow Forecast</span>
                  </div>
                  
                  <div className="space-y-2 bg-[#050B1C]/50 rounded-xl p-3 border border-white/5">
                    <div className="flex justify-between text-[9.5px]">
                      <span className="text-[#94A3B8]">Expected 10m Influx</span>
                      <span className="text-[#00E5FF] font-bold font-mono">+{selectedZone.expectedOccupancy - selectedZone.occupancy}</span>
                    </div>
                    <div className="flex justify-between text-[9.5px]">
                      <span className="text-[#94A3B8]">Next 15m Peak</span>
                      <span className="text-white font-bold font-mono">{selectedZone.predictionNext15m.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1 mt-1">
                      <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${(selectedZone.predictionNext15m / selectedZone.maxCapacity) * 100}%` }} />
                    </div>
                  </div>
                </div>

                {/* Resource Allocation */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">First Responder Coverage</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 text-[9.5px]">
                      <span className="text-[#94A3B8] shrink-0 font-bold uppercase">Medical:</span>
                      <span className="text-gray-300 font-medium">{selectedZone.nearestMedical}</span>
                    </div>
                    <div className="flex items-start space-x-2 text-[9.5px]">
                      <span className="text-[#94A3B8] shrink-0 font-bold uppercase">Security:</span>
                      <span className="text-gray-300 font-medium">{selectedZone.nearestSecurity}</span>
                    </div>
                  </div>
                </div>

                {/* Camera Feeds (Grid of mock screen boxes) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#00E5FF]" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white">Live Camera Matrix</span>
                    </div>
                    <span className="text-[8px] font-mono text-emerald-400">FEED OK</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {selectedZone.nearbyCameras.map((cam) => (
                      <div key={cam} className="aspect-video bg-[#050B1C] rounded-lg border border-white/5 relative overflow-hidden flex flex-col justify-end p-2">
                        {/* Simulating cam lines */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
                        <div className="absolute top-1 right-1 flex items-center space-x-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
                          <span className="text-[5px] text-gray-500 font-mono">REC</span>
                        </div>
                        <span className="text-[7px] text-[#00E5FF] font-mono relative z-10 font-bold">{cam}</span>
                      </div>
                    ))}
                    {selectedZone.nearbyCameras.length === 0 && (
                      <div className="col-span-2 text-center text-[#94A3B8] text-[9px] py-4 bg-[#050B1C]/35 rounded-lg">No static cams assigned.</div>
                    )}
                  </div>
                </div>

                {/* Incidents & Alerts */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white">Ops Logs</span>
                  
                  <div className="space-y-1.5 text-[9.5px]">
                    <div className="text-[#94A3B8]">
                      <span className="font-bold text-gray-400 uppercase text-[8px] block">Last Logged Event:</span>
                      {selectedZone.lastIncident}
                    </div>
                    
                    {selectedZone.currentAlerts.length > 0 ? (
                      selectedZone.currentAlerts.map((alert, idx) => (
                        <div key={idx} className="p-2 bg-red-950/15 border border-red-900/20 text-red-400 rounded-lg flex items-center space-x-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{alert}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-emerald-950/10 border border-emerald-900/10 text-emerald-400 rounded-lg flex items-center space-x-1.5">
                        <Check className="w-3 h-3 shrink-0" />
                        <span>No current alerts</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ───── RIGHT SIDEBAR: Live AI & Resource Insights ───── */}
      <div className="w-[340px] min-w-[340px] border-l border-white/5 bg-[#180F25]/85 backdrop-blur-md overflow-y-auto hidden lg:flex flex-col shrink-0">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-[#C6BADE]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest font-display">Command Insights</span>
          </div>
          <span className="text-[8px] font-mono text-[#94A3B8] uppercase">StadiumOS Twin</span>
        </div>

        {/* Dashboard Panels */}
        <div className="p-4 space-y-4 flex-1">
          
          {/* Live System Gauge */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest block mb-3">Overall Stadium Load</span>
            
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white font-display">
                {totalOccupancy.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#94A3B8]">/ {totalMax.toLocaleString()} total capacity</span>
            </div>
            
            <div className="w-full bg-white/5 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#C6BADE] via-[#DE638A] to-[#F7B9C4] h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(totalOccupancy / totalMax) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-[#94A3B8] font-mono">
                {((totalOccupancy / totalMax) * 100).toFixed(1)}% Saturation
              </span>
              <span className="text-[9px] text-emerald-400 font-bold font-mono">STABLE OPERATIONS</span>
            </div>
          </div>

          {/* AI Decision Copilot Recommendations */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#C6BADE] to-[#F7B9C4]" />
            <div className="flex items-center space-x-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#C6BADE]" />
              <span className="text-[8px] text-[#C6BADE] font-bold uppercase tracking-widest">AI Dispatch Engine</span>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-[#120A1D]/65 border border-[#C6BADE]/15 rounded-lg space-y-1">
                <span className="text-[8px] font-bold font-mono text-[#F7B9C4] uppercase block">Gate C Redirect Protocol</span>
                <p className="text-[9.5px] text-gray-300 leading-relaxed">
                  Gate C turnstiles are at **95%** threshold. Automatically updating digital wayfinding screens to route sector S-West ticket holders to Gate D.
                </p>
              </div>

              <div className="p-2.5 bg-[#120A1D]/65 border border-white/5 rounded-lg space-y-1">
                <span className="text-[8px] font-bold font-mono text-[#F59E0B] uppercase block">Halftime Concourse Influx</span>
                <p className="text-[9.5px] text-gray-300 leading-relaxed">
                  Forecast predicts Concourse North food court density reaching **92%** peak within 6 minutes. Advise activating auxiliary mobile registers.
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Alert & Dispatch Logs */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Active System Alarms</span>
              <span className="text-[9px] font-bold font-mono text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                {events.filter(e => !e.resolved).length} ALERTS
              </span>
            </div>

            <div className="space-y-2">
              {events.map((evt) => (
                <div key={evt.id} className="p-3 bg-[#120A1D]/50 border border-white/5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-white uppercase font-display">{evt.title}</span>
                    <span className={`text-[7px] font-mono font-bold px-1.5 py-0.25 rounded uppercase ${
                      evt.severity === 'critical' ? 'text-red-400 bg-red-400/10 border border-red-400/25' : 'text-orange-400 bg-orange-400/10 border border-orange-400/25'
                    }`}>
                      {evt.severity}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-gray-300 leading-relaxed">{evt.description}</p>
                  
                  <div className="flex justify-between items-center pt-1 text-[8.5px]">
                    <span className="text-[#F7B9C4] font-semibold">{evt.timestamp} • Active</span>
                    <button
                      onClick={() => {
                        // resolve incident
                        setEvents(prev => prev.filter(e => e.id !== evt.id));
                      }}
                      className="text-emerald-400 hover:text-white uppercase font-bold tracking-wider"
                    >
                      Resolve Code
                    </button>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-6 text-[#64748B] text-[9.5px]">
                  All systems operating within normal tolerances.
                </div>
              )}
            </div>
          </div>

          {/* Volunteer & Stewards Deployment */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest block mb-3">Resource Deployment Matrix</span>
            
            <div className="space-y-2 text-[9.5px]">
              <div className="flex justify-between py-1 border-b border-white/[0.03]">
                <span className="text-gray-300">Security Officers Deployed</span>
                <span className="font-mono text-white font-bold">186 / 200</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.03]">
                <span className="text-gray-300">Medical Responders</span>
                <span className="font-mono text-white font-bold">24 / 24</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.03]">
                <span className="text-gray-300">Crowd Stewards / Marshals</span>
                <span className="font-mono text-white font-bold">342 / 360</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.03]">
                <span className="text-gray-300">Gate Ops Volunteers</span>
                <span className="font-mono text-white font-bold">120 / 120</span>
              </div>
            </div>
            
            <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-[9px]">
              <span className="text-[#94A3B8]">Standby Reserves</span>
              <span className="text-[#F7B9C4] font-bold font-mono">32 volunteers ready</span>
            </div>
          </div>

          {/* Hotline / Quick Help Panel */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[9.5px] font-bold text-white uppercase tracking-wider">Operational Hotline</div>
                <div className="text-[8.5px] text-[#94A3B8]">Emergency dispatcher direct line</div>
              </div>
            </div>
            <a
              href="tel:5551234"
              className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-[9px] font-bold transition-all"
            >
              CALL
            </a>
          </div>

        </div>
      </div>
      
    </div>
  );
};
export default Navigation;
