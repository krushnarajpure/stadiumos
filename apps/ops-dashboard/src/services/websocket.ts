import { useOpsStore } from '../store/opsStore';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 16000;
  
  // Telemetry metrics
  private msgCounter = 0;
  private msgRateInterval: any = null;
  private lastPingSent = 0;
  
  // Custom event listener hooks
  private onMetricsUpdate: ((metrics: any) => void) | null = null;

  public connect() {
    this.disconnect();
    
    // Resolve host connection
    const isHttps = window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '')
      : window.location.host;
      
    const url = `${wsProto}//${host}/ws/live`;
    console.log(`Connecting to WebSocket gateway at: ${url}`);
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log("WebSocket gateway session established.");
        this.reconnectDelay = 1000;
        
        // Update Zustand status
        useOpsStore.getState().setWsConnected(true);
        
        // Start heartbeat ping-pong
        this.startHeartbeat();
        this.startRateMeter();
      };
      
      this.ws.onclose = () => {
        console.log("WebSocket gateway session closed.");
        useOpsStore.getState().setWsConnected(false);
        this.stopHeartbeat();
        this.stopRateMeter();
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (err) => {
        console.error("WebSocket transport error:", err);
      };
      
      this.ws.onmessage = (event) => {
        this.msgCounter++;
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingEvent(data);
        } catch (e) {
          console.warn("Raw WebSocket event parsed as text:", event.data);
        }
      };
      
    } catch (e) {
      console.error("Failed creating WebSocket connection:", e);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    this.stopRateMeter();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    useOpsStore.getState().setWsConnected(false);
  }

  public connectAll() {
    this.connect();
  }

  public disconnectAll() {
    this.disconnect();
  }

  public startSimulation() {
    this.send({ type: "SimulationStarted" });
  }

  public stopSimulation() {
    this.send({ type: "SimulationStopped" });
  }

  public resetSimulation() {
    this.send({ type: "SimulationReset" });
  }

  public pauseSimulation() {
    this.send({ type: "SimulationPause" });
  }

  public resumeSimulation() {
    this.send({ type: "SimulationResume" });
  }

  public setSimulationSpeed(speed: number) {
    this.send({ type: "SimulationSpeedChanged", data: { speed } });
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.lastPingSent = performance.now();
      this.send({ type: "ping" });
    }, 3000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private startRateMeter() {
    this.msgRateInterval = setInterval(() => {
      const store = useOpsStore.getState() as any;
      if (store.updateWsMetrics) {
        store.updateWsMetrics({
          msgRate: this.msgCounter,
        });
      }
      this.msgCounter = 0;
    }, 1000);
  }

  private stopRateMeter() {
    if (this.msgRateInterval) {
      clearInterval(this.msgRateInterval);
      this.msgRateInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    
    console.log(`Scheduling reconnection attempt in ${this.reconnectDelay}ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private handleIncomingEvent(event: any) {
    const store = useOpsStore.getState() as any;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Track last event name in telemetry
    if (store.updateWsMetrics) {
      store.updateWsMetrics({
        lastEvent: event.type || "Event",
      });
    }

    if (event.type === 'pong') {
      const latency = Math.round(performance.now() - this.lastPingSent);
      if (store.updateWsMetrics) {
        store.updateWsMetrics({ latency });
      }
      return;
    }

    // Process event type broadcasts
    switch (event.type) {
      case 'PredictionUpdated':
        store.addNotification(
          "🔮 Live Prediction Updated", 
          `ML Congestion Score shifts to ${event.data.congestion_score}% (${event.data.risk} Risk)`, 
          event.data.risk.toLowerCase() === 'critical' ? 'critical' : 'high'
        );
        // Force update of internal prediction variables
        store.updateWhatIf({
          attendance: Math.round((event.data.congestion_score / 100) * 80000)
        });
        break;

      case 'CrowdDensityUpdated':
        store.addNotification(
          "👥 Crowd Density Event", 
          `Zone Gate ${event.data.zone} density changes to ${event.data.density}%`, 
          'medium'
        );
        break;

      case 'GateStatusChanged': {
        const isClosed = event.data.status === 'CLOSED';
        store.addNotification(
          "🚪 Gate Status Changed", 
          `Gate Corridor ${event.data.gate} is now ${event.data.status}`, 
          isClosed ? 'high' : 'low'
        );
        if (event.data.gate === 'C') {
          store.updateWhatIf({ closeGateC: isClosed });
        }
        break;
      }

      case 'EmergencyAlert':
        store.addNotification(
          "🚨 Emergency Event Active", 
          `${event.data.severity} alarm at ${event.data.location}`, 
          event.data.severity.toLowerCase() === 'critical' ? 'critical' : 'high'
        );
        // Map as incident
        store.addIncident({
          id: `ws-inc-${Date.now()}`,
          title: `Emergency Alarm: ${event.data.location}`,
          description: `Dispatched response unit. Priority: ${event.data.severity}`,
          type: 'Medical Emergency',
          severity: event.data.severity,
          status: 'Dispatched',
          zone_id: 'ZONE_GATE_A',
          reported_at: new Date().toISOString()
        });
        break;

      case 'WeatherUpdated': {
        const isStorm = event.data.condition === 'STORMY' || event.data.condition === 'RAINY';
        store.addNotification(
          "🌧️ Weather Sensor Update", 
          `Climate shifted to ${event.data.condition} (${event.data.temperature}°C)`, 
          'low'
        );
        store.updateWhatIf({ heavyRain: isStorm });
        break;
      }

      case 'NotificationCreated':
        store.addNotification(
          "🔔 Operation Broadcast", 
          event.data.message, 
          'low'
        );
        break;

      case 'IncidentCreated':
        store.addNotification(
          "⚠️ Operation Risk Logged", 
          `${event.data.type} detected at ${event.data.location}`, 
          'high'
        );
        break;

      case 'SimulationStarted':
        store.setSimulationStatus('running');
        break;
      case 'SimulationStopped':
        store.setSimulationStatus('reset');
        break;
      case 'SimulationPaused':
        store.setSimulationStatus('paused');
        break;
      case 'SimulationResumed':
        store.setSimulationStatus('running');
        break;
      case 'SimulationReset':
        store.resetAll();
        break;
      case 'SimulationSpeedUpdated':
        store.setSimulationSpeed(event.data.speed);
        break;
      case 'DemoTimeUpdate':
        store.setDemoTime(event.data.demo_time);
        if (event.data.demo_speed) {
          store.setSimulationSpeed(event.data.demo_speed);
        }
        break;
        
      default:
        console.log("Unhandled WebSocket event category:", event);
    }
  }
}

export const wsService = new WebSocketClient();
export default wsService;
