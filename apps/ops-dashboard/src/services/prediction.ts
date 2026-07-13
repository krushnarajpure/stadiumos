import api from './api';

export interface PredictionInput {
  attendance: number;
  stadium_capacity: number;
  match_minute: number;
  entry_rate_per_min: number;
  exit_rate_per_min: number;
  temperature: number;
  humidity: number;
  rain_probability: number;
  parking_occupancy: number;
  metro_arrivals: number;
  bus_arrivals: number;
  ticket_scan_rate: number;
  security_queue_length: number;
  food_court_density: number;
  restroom_density: number;
  medical_incidents: number;
  previous_congestion: number;
  gate_open_count: number;
  vip_event: boolean;
  special_event: boolean;
  holiday: boolean;
  weekday: string;
}

export interface FactorImpact {
  feature: string;
  impact: number;
}

export interface PredictionOutput {
  risk_level: string;
  congestion_score: number;
  queue_prediction: number;
  confidence: number;
  top_factors: FactorImpact[];
  timestamp: string;
}

export const predictionService = {
  predictCrowd: async (input: PredictionInput, signal?: AbortSignal): Promise<PredictionOutput> => {
    // Expose backend prediction call
    const response = await api.post<PredictionOutput>('/api/v1/predict/crowd', input, { signal });
    return response.data;
  }
};
