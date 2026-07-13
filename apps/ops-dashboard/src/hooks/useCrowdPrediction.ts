import { useState, useEffect, useRef, useCallback } from 'react';
import { useOpsStore } from '../store/opsStore';
import { predictionService, PredictionInput, PredictionOutput } from '../services/prediction';

const PREDICTION_HISTORY_KEY = 'stadiumos_prediction_history';

export const useCrowdPrediction = () => {
  const store = useOpsStore();
  
  // State variables
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PredictionOutput[]>([]);

  // Ref tracking for abort controllers and timers
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Read current inputs from unified store
  const attendance = store.attendance;
  const gateCapacity = store.gateCapacity;
  const securityStaff = store.securityStaff;
  const closeGateC = store.closeGateC;
  const heavyRain = store.heavyRain;
  const vipArrival = store.vipArrival;

  // Build prediction input payload based on the unified store state
  const buildInputPayload = useCallback((): PredictionInput => {
    // Generate realistic, consistent live parameters corresponding to the active store states
    const gateOpenCount = Math.max(1, Math.round(gateCapacity / 5));
    const entryRate = Math.round((attendance / 80000) * 450);
    const exitRate = heavyRain ? 80 : 15;
    
    return {
      attendance,
      stadium_capacity: 80000,
      match_minute: 58,
      entry_rate_per_min: entryRate,
      exit_rate_per_min: exitRate,
      temperature: heavyRain ? 21.0 : 31.0,
      humidity: heavyRain ? 90.0 : 63.0,
      rain_probability: heavyRain ? 100.0 : 10.0,
      parking_occupancy: Math.round((attendance / 80000) * 85),
      metro_arrivals: Math.round((attendance / 80000) * 890),
      bus_arrivals: Math.round((attendance / 80000) * 410),
      ticket_scan_rate: Math.round(entryRate * 0.9),
      security_queue_length: Math.max(10, Math.round((entryRate / gateOpenCount) * 15)),
      food_court_density: Math.round((attendance / 80000) * 75),
      restroom_density: Math.round((attendance / 80000) * 65),
      medical_incidents: store.incidents.filter(i => i.type.includes('Medical')).length,
      previous_congestion: 55,
      gate_open_count: gateOpenCount,
      vip_event: vipArrival,
      special_event: true,
      holiday: false,
      weekday: 'Sunday'
    };
  }, [attendance, gateCapacity, heavyRain, vipArrival, store.incidents]);

  const triggerPrediction = useCallback(async (isRetry = false) => {
    // 1. Cancel in-flight queries
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsLoading(true);
    if (isRetry) setError(null);
    
    try {
      const payload = buildInputPayload();
      const result = await predictionService.predictCrowd(payload, controller.signal);
      
      setPrediction(result);
      setError(null);
      
      // Update predictions history chart trend list (max 10 points)
      setHistory(prev => {
        const next = [...prev, result];
        if (next.length > 10) next.shift();
        return next;
      });
    } catch (e: any) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') {
        // Ignored because request was aborted for a newer state change
        return;
      }
      console.error("FastAPI prediction error:", e);
      setError("Prediction Service Offline");
    } finally {
      setIsLoading(false);
    }
  }, [buildInputPayload]);

  // Handle Input Changes with 350ms Debouncing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      triggerPrediction();
    }, 350);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [attendance, gateCapacity, securityStaff, closeGateC, heavyRain, vipArrival, triggerPrediction]);

  return {
    prediction,
    isLoading,
    error,
    history,
    retry: () => triggerPrediction(true),
    inputPayload: buildInputPayload()
  };
};
