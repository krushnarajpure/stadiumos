export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notificationsEnabled: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  preferences: UserPreferences;
}

export interface IngressTelemetry {
  gateId: string;
  stadiumId: string;
  queueLength: number;
  estWaitSeconds: number;
  timestamp: string;
}

export interface SecurityAnomaly {
  incidentId: string;
  cameraId: string;
  classLabel: string;
  confidence: number;
  timestamp: string;
}

export interface MedicalCase {
  caseId: string;
  location: { x: number; y: number };
  triageLevel: 'RED' | 'AMBER' | 'GREEN';
  assignedSquad: string | null;
  status: 'PENDING' | 'DISPATCHED' | 'RESOLVED';
}
