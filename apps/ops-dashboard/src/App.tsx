import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOpsStore } from './store/opsStore';
import { wsService } from './services/websocket';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { AIChatBot } from './components/AIChatBot';
import { DemoControls } from './components/DemoControls';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Simulation } from './pages/Simulation';
import { PredictionCenter } from './pages/PredictionCenter';
import { CrowdMonitoring } from './pages/CrowdMonitoring';
import { AICommandCenter } from './pages/AICommandCenter';
import { EmergencyManagement } from './pages/EmergencyManagement';
import { Navigation } from './pages/Navigation';
import { VendorAnalytics } from './pages/VendorAnalytics';
import { UserManagement } from './pages/UserManagement';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const demoModeActive = useOpsStore((state) => state.demoModeActive);
  const simulationStatus = useOpsStore((state) => state.simulationStatus);
  const simulationSpeed = useOpsStore((state) => state.simulationSpeed);
  const triggerEvent = useOpsStore((state) => state.triggerEvent);
  const notifications = useOpsStore((state) => state.notifications);
  const removeNotification = useOpsStore((state) => state.removeNotification);

  // Initialize live WebSocket loop
  useEffect(() => {
    wsService.connect();
    return () => wsService.disconnect();
  }, []);

  // Removed local Demo Mode Event Scheduler - backend orchestration handles timeline now.

  return (
    <Routes>
      {/* Auth Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Dashboard Command Console */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/*"
          element={
            <div className="flex bg-[#120A1D] h-screen w-screen overflow-hidden text-[#F8FAFC] relative">
              
              {/* Toast Notification Container */}
              <div className="fixed top-6 right-6 z-[999] flex flex-col space-y-3 max-w-sm pointer-events-none">
                <AnimatePresence>
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 100, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 50, scale: 0.95 }}
                      className={`pointer-events-auto border p-4 rounded-2xl shadow-2xl backdrop-blur-lg flex justify-between items-start space-x-3 w-[320px] ${
                        notif.priority === 'critical'
                          ? 'border-red-500/40 bg-red-950/85 text-red-100'
                          : notif.priority === 'high'
                          ? 'border-orange-500/40 bg-orange-950/85 text-orange-100'
                          : notif.priority === 'medium'
                          ? 'border-yellow-500/40 bg-yellow-950/85 text-yellow-100'
                          : 'border-[#4A3267]/40 bg-[#231634]/95 text-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-wider font-display flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span>{notif.title}</span>
                        </div>
                        <p className="text-[10px] opacity-90 mt-1 leading-relaxed">{notif.message}</p>
                        <span className="text-[8px] opacity-55 mt-1.5 block font-mono">{notif.timestamp}</span>
                      </div>
                      <button
                        onClick={() => removeNotification(notif.id)}
                        className="text-white/40 hover:text-white p-0.5 text-xs font-mono font-bold leading-none"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {!demoModeActive && <Sidebar />}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/simulation" element={<Simulation />} />
                    <Route path="/prediction" element={<PredictionCenter />} />
                    <Route path="/crowd" element={<CrowdMonitoring />} />
                    <Route path="/ai-command" element={<AICommandCenter />} />
                    <Route path="/emergencies" element={<EmergencyManagement />} />
                    <Route path="/navigation" element={<Navigation />} />
                    <Route path="/vendors" element={<VendorAnalytics />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
              {/* Floating AI Agent Companion */}
              <AIChatBot />

              {/* Central Demo Controls Widget */}
              <DemoControls />
            </div>
          }
        />
      </Route>
    </Routes>
  );
};
export default App;
