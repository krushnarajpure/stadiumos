import { create } from 'zustand';
import type {
  CrowdZone,
  Incident,
  InventoryItem,
  AIRecommendation,
} from '../services/dashboard';

export type CrowdMetrics = CrowdZone;
export type EmergencyIncident = Incident;
export type VendorInventoryLevel = InventoryItem;

export interface TimelineEvent {
  id: string;
  time: string;
  text: string;
  type: 'alert' | 'incident' | 'volunteer' | 'vendor' | 'action' | 'resolve';
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface OpsState {
  crowdMetrics: CrowdMetrics[];
  incidents: EmergencyIncident[];
  recommendations: AIRecommendation[];
  inventories: VendorInventoryLevel[];
  timelineEvents: TimelineEvent[];
  notifications: ToastNotification[];
  
  // Real-Time Simulator & What-If state
  simulationStatus: 'running' | 'paused' | 'reset';
  simulationSpeed: 1 | 2 | 5;
  demoModeActive: boolean;
  demoTime: number;
  
  // What-If Sliders
  attendance: number;
  gateCapacity: number;
  securityStaff: number;
  closeGateC: boolean;
  heavyRain: boolean;
  vipArrival: boolean;
  
  wsConnected: boolean;
  wsLatency: number;
  wsMsgRate: number;
  wsLastEvent: string;
  updateWsMetrics: (metrics: Partial<{ latency: number; msgRate: number; lastEvent: string }>) => void;
  
  // Actions
  evacuationActive: boolean;
  setWsConnected: (connected: boolean) => void;
  setCrowdMetrics: (metrics: CrowdMetrics[]) => void;
  updateCrowdMetrics: (metrics: CrowdMetrics[]) => void;
  setIncidents: (incidents: EmergencyIncident[]) => void;
  addIncident: (incident: EmergencyIncident) => void;
  addRecommendation: (rec: AIRecommendation) => void;
  setInventories: (invs: VendorInventoryLevel[]) => void;
  
  addNotification: (title: string, message: string, priority: ToastNotification['priority']) => void;
  removeNotification: (id: string) => void;
  setSimulationStatus: (status: OpsState['simulationStatus']) => void;
  setSimulationSpeed: (speed: OpsState['simulationSpeed']) => void;
  setDemoMode: (active: boolean) => void;
  setDemoTime: (time: number) => void;
  
  updateWhatIf: (newState: Partial<Pick<OpsState, 'attendance' | 'gateCapacity' | 'securityStaff' | 'closeGateC' | 'heavyRain' | 'vipArrival'>>) => void;
  triggerEvent: (eventKey: string) => void;
  resetAll: () => void;
  resolveIncident: (id: string) => void;
}

const DEFAULT_METRICS: CrowdMetrics[] = [
  { zone_id: 'ZONE_GATE_A', zone_name: 'North Gate A', occupancy_pct: 91, headcount: 1820, status: 'Critical' },
  { zone_id: 'ZONE_GATE_B', zone_name: 'South Gate B', occupancy_pct: 38, headcount: 750, status: 'Normal' },
  { zone_id: 'ZONE_VIP', zone_name: 'VIP Club Lounges', occupancy_pct: 31, headcount: 310, status: 'Normal' },
  { zone_id: 'ZONE_FOOD_E', zone_name: 'East Food Concourse', occupancy_pct: 77, headcount: 1540, status: 'Busy' },
  { zone_id: 'ZONE_PARK_C', zone_name: 'Parking Sector C', occupancy_pct: 71, headcount: 1410, status: 'Busy' },
  { zone_id: 'ZONE_EXIT_4', zone_name: 'Northwest Exit 4 corridor', occupancy_pct: 11, headcount: 110, status: 'Normal' },
];

const DEFAULT_INCIDENTS: EmergencyIncident[] = [
  { id: 'inc-01', title: 'Heat Stress Symptom', description: 'Spectator collapsed on Section 102 steps.', type: 'Medical Emergency', severity: 'Critical', status: 'Dispatched', zone_id: 'ZONE_GATE_A', reported_at: new Date(Date.now() - 360000).toISOString() },
  { id: 'inc-02', title: 'Turnstile A4 Sensor Lag', description: 'Sensor latency causing wait time spike.', type: 'System Error', severity: 'Medium', status: 'Investigating', zone_id: 'ZONE_GATE_A', reported_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'inc-03', title: 'Unattended Luggage', description: 'Bag left near East Concourse restrooms.', type: 'Security Alarm', severity: 'High', status: 'Reported', zone_id: 'ZONE_FOOD_E', reported_at: new Date(Date.now() - 1500000).toISOString() },
];

const DEFAULT_RECOMMENDATIONS: AIRecommendation[] = [
  { agent_name: 'Crowd Intelligence', response_text: 'Open North Gate A Overflow turnstiles 5 & 6 immediately. Ingress rate at North corridor exceeds safe limits by 18%.', recommended_actions: ['Open overflow gate', 'Reroute staff'] },
  { agent_name: 'Medical Logistics Dispatcher', response_text: 'Reroute Medical Responder Team Beta to Section 102 for heat stroke response. Shortest path calculated: Corridor B3.', recommended_actions: ['Deploy Team Beta'] },
  { agent_name: 'Concessions Forecaster', response_text: 'Beverage stocks at East Concourse Kiosk 3 will deplete in 15 minutes. Dispatch stock replenishing runner from central hub.', recommended_actions: ['Dispatch replenish runner'] }
];

const DEFAULT_TIMELINE: TimelineEvent[] = [
  { id: 't-01', time: '22:04:12', text: 'Crowd analytics detected 91% occupancy threshold breach at Gate A.', type: 'alert' },
  { id: 't-02', time: '22:02:45', text: 'Emergency dispatcher registered Heat Stress incident in stand Section 102.', type: 'incident' },
  { id: 't-03', time: '21:58:30', text: 'Volunteer Squad Delta deployed to North Stand stairs for queue control.', type: 'volunteer' },
  { id: 't-04', time: '21:55:10', text: 'Water stocks replenished at central Concourse Vendor Zone 1.', type: 'vendor' },
];

export const useOpsStore = create<OpsState>((set) => ({
  crowdMetrics: DEFAULT_METRICS,
  incidents: DEFAULT_INCIDENTS,
  recommendations: DEFAULT_RECOMMENDATIONS,
  inventories: [],
  timelineEvents: DEFAULT_TIMELINE,
  notifications: [],
  
  simulationStatus: 'paused',
  simulationSpeed: 1,
  demoModeActive: false,
  demoTime: 0,
  
  attendance: 78550,
  gateCapacity: 100,
  securityStaff: 342,
  closeGateC: false,
  heavyRain: false,
  vipArrival: false,
  
  evacuationActive: false,
  wsConnected: false,
  wsLatency: 0,
  wsMsgRate: 0,
  wsLastEvent: 'None',
  updateWsMetrics: (metrics) => set((state) => ({
    wsLatency: metrics.latency !== undefined ? metrics.latency : state.wsLatency,
    wsMsgRate: metrics.msgRate !== undefined ? metrics.msgRate : state.wsMsgRate,
    wsLastEvent: metrics.lastEvent !== undefined ? metrics.lastEvent : state.wsLastEvent,
  })),

  setWsConnected: (connected) => set({ wsConnected: connected }),
  setCrowdMetrics: (metrics) => set({ crowdMetrics: metrics }),
  updateCrowdMetrics: (metrics) => set({ crowdMetrics: metrics }),
  setIncidents: (incidents) => set({ incidents }),
  addIncident: (inc) => set((state) => ({ incidents: [inc, ...state.incidents] })),
  addRecommendation: (rec) => set((state) => ({ recommendations: [rec, ...state.recommendations] })),
  setInventories: (invs) => set({ inventories: invs }),
  
  addNotification: (title, message, priority) =>
    set((state) => ({
      notifications: [
        {
          id: `toast-${Date.now()}`,
          title,
          message,
          priority,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...state.notifications,
      ],
    })),
    
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
    
  setSimulationStatus: (status) => set({ simulationStatus: status }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setDemoMode: (active) => set({ demoModeActive: active }),
  setDemoTime: (time) => set({ demoTime: time }),
  
  updateWhatIf: (newState) =>
    set((state) => {
      const merged = { ...state, ...newState };
      // Dynamically recalculate crowdMetrics based on new slider states
      const updatedMetrics = state.crowdMetrics.map((m) => {
        if (m.zone_id === 'ZONE_GATE_A') {
          const occupancy = Math.min(99, Math.round((merged.attendance / 80000) * 88 * (100 / merged.gateCapacity)));
          return {
            ...m,
            occupancy_pct: occupancy,
            headcount: Math.round(occupancy * 20),
            status: occupancy > 85 ? 'Critical' : occupancy > 65 ? 'Busy' : 'Normal',
          };
        }
        return m;
      });
      
      return {
        ...newState,
        crowdMetrics: updatedMetrics,
      };
    }),
    
  resolveIncident: (id) =>
    set((state) => ({
      incidents: state.incidents.filter((i) => i.id !== id),
      timelineEvents: [
        {
          id: `t-res-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          text: `Emergency incident resolved (Incident Code: ${id.slice(-5)}).`,
          type: 'resolve',
        },
        ...state.timelineEvents,
      ],
    })),

  triggerEvent: (eventKey) =>
    set((state) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const idStr = `inc-sim-${Date.now()}`;
      
      let title = 'General Event';
      let description = 'Operations event simulated.';
      let priority: ToastNotification['priority'] = 'low';
      let type = 'Security';
      let severity = 'Medium';
      let crowdMultiplier = 1;
      let targetZone = 'ZONE_GATE_B';
      let weather = state.heavyRain;
      let evac = state.evacuationActive || false;
      let vip = state.vipArrival;
      
      if (eventKey === 'CROWD_SURGE') {
        title = 'Crowd Surge Bottleneck';
        description = 'Severe spectator congestion at Gate B (East Plaza). Turnstiles congested.';
        priority = 'high';
        type = 'Crowd Congestion';
        severity = 'High';
        crowdMultiplier = 1.25;
      } else if (eventKey === 'MEDICAL_EMERGENCY') {
        title = 'Spectator Cardiac Distress';
        description = 'Chest pain alert in Sector North GA 102. Responder dispatched.';
        priority = 'critical';
        type = 'Medical Emergency';
        severity = 'Critical';
        targetZone = 'ZONE_GATE_A';
      } else if (eventKey === 'LOST_CHILD') {
        title = 'Lost Child Sector E4';
        description = '7-year-old child reported separated near concession stand 3.';
        priority = 'medium';
        type = 'Security Search';
        severity = 'Medium';
      } else if (eventKey === 'SUSPICIOUS_PACKAGE') {
        title = 'Suspicious Backpack Alert';
        description = 'Unattended baggage isolated near East Plaza box offices.';
        priority = 'high';
        type = 'Security Alert';
        severity = 'High';
      } else if (eventKey === 'SECURITY_BREACH') {
        title = 'Pitch Invader Perimeter Breach';
        description = 'Spectator bypassed boundary gates running towards player field.';
        priority = 'high';
        type = 'Security Guard Breach';
        severity = 'High';
      } else if (eventKey === 'FIRE_ALARM') {
        title = 'Fire Alarm Concourse A';
        description = 'Optical smoke detector triggered in Concourse A kitchen.';
        priority = 'critical';
        type = 'Fire Hazard';
        severity = 'Critical';
      } else if (eventKey === 'GATE_FAILURE') {
        title = 'Gate C Turnstile Failure';
        description = 'Turnstiles offline due to local breaker trip. Queue halted.';
        priority = 'high';
        type = 'System Error';
        severity = 'High';
      } else if (eventKey === 'WEATHER_ALERT') {
        title = 'Lightning Storm Warning';
        description = 'Severe weather alert. Advise clearing open terrace decks.';
        priority = 'medium';
        type = 'Weather Risk';
        severity = 'Medium';
        weather = true;
      } else if (eventKey === 'VIP_ARRIVAL') {
        title = 'VIP Dignitary Inbound';
        description = 'State convoy cleared West VIP garage perimeter corridor.';
        priority = 'low';
        type = 'VIP Arrival';
        severity = 'Low';
        vip = true;
      } else if (eventKey === 'STADIUM_EVACUATION') {
        title = 'Full Stadium Evacuation Alert';
        description = 'Emergency voice alarms active. Evacuating all stand gates.';
        priority = 'critical';
        type = 'Evacuation Code Red';
        severity = 'Critical';
        evac = true;
      }

      // Generate simulation changes on crowd zones
      const updatedMetrics = state.crowdMetrics.map((m) => {
        if (m.zone_id === targetZone) {
          const occupancy = Math.min(99, Math.round(m.occupancy_pct * crowdMultiplier));
          return {
            ...m,
            occupancy_pct: occupancy,
            headcount: Math.round(m.headcount * crowdMultiplier),
            status: occupancy > 85 ? 'Critical' : 'Busy',
          };
        }
        return m;
      });

      const newIncident: EmergencyIncident = {
        id: idStr,
        title,
        description,
        type,
        severity,
        status: 'Active',
        zone_id: targetZone,
        reported_at: new Date().toISOString(),
      };

      const newTimeline: TimelineEvent = {
        id: `t-sim-${Date.now()}`,
        time: timeStr,
        text: `Event Fired: ${title} (${description})`,
        type: 'incident',
      };

      const newRecommendation: AIRecommendation = {
        agent_name: 'AI Commander System',
        response_text: `Mitigation plans generated for "${title}". Clear corridors and direct flows away from sector.`,
        recommended_actions: ['Re-route volunteers', 'Unlock exit corridors', 'Inform medical bay'],
      };

      return {
        incidents: [newIncident, ...state.incidents],
        timelineEvents: [newTimeline, ...state.timelineEvents],
        recommendations: [newRecommendation, ...state.recommendations],
        crowdMetrics: updatedMetrics,
        heavyRain: weather,
        vipArrival: vip,
        notifications: [
          {
            id: `toast-${Date.now()}`,
            title: `🚨 ${title}`,
            message: description,
            priority,
            timestamp: timeStr,
          },
          ...state.notifications,
        ],
      };
    }),
    
  resetAll: () =>
    set({
      crowdMetrics: DEFAULT_METRICS,
      incidents: DEFAULT_INCIDENTS,
      recommendations: DEFAULT_RECOMMENDATIONS,
      timelineEvents: DEFAULT_TIMELINE,
      notifications: [],
      attendance: 78550,
      gateCapacity: 100,
      securityStaff: 342,
      closeGateC: false,
      heavyRain: false,
      vipArrival: false,
      simulationStatus: 'paused',
      simulationSpeed: 1,
      demoModeActive: false,
      demoTime: 0,
    }),
}));
