import api from './api';

export interface CrowdZone {
  zone_id: string;
  zone_name: string;
  occupancy_pct: number;
  headcount: number;
  status: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  zone_id: string;
  reported_at: string;
}

export interface IncidentDashboard {
  active_incidents_count: number;
  severity_distribution: { severity: string; count: number }[];
  type_distribution: { type: string; count: number }[];
  sla_compliance_rate: number;
}

export interface InventoryItem {
  id: string;
  vendor_id: string;
  product_id: string;
  current_stock: number;
  min_threshold: number;
  max_capacity?: number;
}

export interface Vendor {
  id: string;
  name: string;
  type: string;
  zone_id: string;
  status: string;
}

export interface VendorAnalytics {
  vendor_id: string;
  sales_volume_units: number;
  revenue_usd: number;
  cost_usd: number;
  net_profit_usd: number;
  popular_products: string[];
}

export interface ProductAnalytics {
  most_purchased_category: string;
  hourly_sales_average_usd: number;
  predicted_demand_spike_time: string;
}

export interface CrowdHistoryPoint {
  recorded_at: string;
  headcount: number;
  occupancy_pct: number;
}

export interface RouteResult {
  path_nodes: { id: string; name: string; zone_id: string }[];
  total_distance_meters: number;
  estimated_time_seconds: number;
  routing_profile: string;
  confidence_score: number;
}

export interface MapNode {
  id: string;
  name: string;
  zone_id: string;
  type: string;
  floor: string;
  is_wheelchair_accessible: boolean;
}

export interface NavigationStatus {
  active_navigation_sessions: number;
  average_routing_latency_ms: number;
  dynamic_reroutes_last_hour: number;
}

export interface UserRecord {
  id: string;
  email: string;
  is_active: boolean;
  roles: { name: string }[];
  profile?: { first_name?: string; last_name?: string } | null;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
}

export interface AIRecommendation {
  agent_name: string;
  response_text: string;
  citations?: string[];
  recommended_actions?: string[];
}

export const dashboardService = {
  getCrowdHeatmap: () =>
    api.get<CrowdZone[]>('/api/v1/crowd/heatmap').then((r) => r.data),

  getCrowdZones: () =>
    api.get('/api/v1/crowd/zones').then((r) => r.data),

  getCrowdHistory: (zoneId: string, limit = 50) =>
    api.get<CrowdHistoryPoint[]>(`/api/v1/crowd/history?zone_id=${zoneId}&limit=${limit}`).then((r) => r.data),

  getLiveCrowdAlerts: () =>
    api.get('/api/v1/crowd/live').then((r) => r.data),

  getIncidents: (params?: { status?: string; limit?: number }) =>
    api.get<Incident[]>('/api/v1/emergencies', { params }).then((r) => r.data),

  createIncident: (payload: {
    title: string;
    description: string;
    type: string;
    severity: string;
    zone_id: string;
  }) => api.post<Incident>('/api/v1/emergencies/', payload).then((r) => r.data),

  getIncidentDashboard: () =>
    api.get<IncidentDashboard>('/api/v1/emergencies/dashboard').then((r) => r.data),

  getLowStockInventory: () =>
    api.get<InventoryItem[]>('/api/v1/vendors/inventory/low-stock').then((r) => r.data),

  getVendorInventory: () =>
    api.get<InventoryItem[]>('/api/v1/vendors/inventory').then((r) => r.data),

  getVendors: () =>
    api.get<Vendor[]>('/api/v1/vendors/').then((r) => r.data),

  getVendorAnalytics: (vendorId: string) =>
    api.get<VendorAnalytics>(`/api/v1/vendors/analytics/vendor?vendor_id=${vendorId}`).then((r) => r.data),

  getProductAnalytics: () =>
    api.get<ProductAnalytics>('/api/v1/vendors/analytics/products').then((r) => r.data),

  calculateRoute: (payload: {
    start_node_id: string;
    end_node_id: string;
    routing_profile?: string;
    requires_accessibility?: boolean;
  }) => api.post<RouteResult>('/api/v1/navigation/route', payload).then((r) => r.data),

  getNavigationMap: () =>
    api.get<{ nodes: MapNode[]; edges: unknown[] }>('/api/v1/navigation/map').then((r) => r.data),

  getNavigationStatus: () =>
    api.get<NavigationStatus>('/api/v1/navigation/status').then((r) => r.data),

  getNavigationAccessibility: () =>
    api.get<{ accessible_nodes: string[] }>('/api/v1/navigation/accessibility').then((r) => r.data),

  getEvacuationStatus: () =>
    api.get('/api/v1/navigation/evacuation').then((r) => r.data),

  searchUsers: (params?: { skip?: number; limit?: number; q?: string }) =>
    api.get<UserRecord[]>('/api/v1/users/search', { params }).then((r) => r.data),

  getNotificationPreferences: () =>
    api.get<{ channel: string; is_enabled: boolean }[]>('/api/v1/notifications/preferences').then((r) => r.data),

  updateNotificationPreferences: (prefs: { preferences: { channel: string; is_enabled: boolean }[] }) =>
    api.patch('/api/v1/notifications/preferences', prefs).then((r) => r.data),
};
