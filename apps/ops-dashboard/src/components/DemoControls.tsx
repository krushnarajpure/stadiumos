import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, LayoutDashboard } from 'lucide-react';
import { useOpsStore } from '../store/opsStore';
import { wsService } from '../services/websocket';

export const DemoControls: React.FC = () => {
  const simulationStatus = useOpsStore((state) => state.simulationStatus);
  const simulationSpeed = useOpsStore((state) => state.simulationSpeed);
  const demoTime = useOpsStore((state) => state.demoTime);
  const demoModeActive = useOpsStore((state) => state.demoModeActive);
  const setDemoMode = useOpsStore((state) => state.setDemoMode);

  // Format T+ mm:ss
  const formatDemoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (simulationStatus === 'paused') {
      wsService.resumeSimulation();
    } else {
      wsService.startSimulation();
    }
  };

  const handlePause = () => {
    wsService.pauseSimulation();
  };

  const handleStop = () => {
    wsService.resetSimulation();
  };

  const handleSpeed = (speed: number) => {
    wsService.setSimulationSpeed(speed);
  };

  const togglePresentationMode = () => {
    setDemoMode(!demoModeActive);
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center space-x-4 bg-[#180F25]/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl"
    >
      {/* Time Display */}
      <div className="flex flex-col items-center border-r border-white/10 pr-4">
        <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider mb-0.5">Timeline</span>
        <span className="text-sm font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">
          {formatDemoTime(demoTime)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-2 border-r border-white/10 pr-4">
        {simulationStatus === 'running' ? (
          <button 
            onClick={handlePause}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors"
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button 
            onClick={handleStart}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30 transition-colors"
          >
            <Play className="w-4 h-4 fill-current ml-1" />
          </button>
        )}
        <button 
          onClick={handleStop}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center space-x-2 border-r border-white/10 pr-4">
        {[1, 2, 5].map((speed) => (
          <button
            key={speed}
            onClick={() => handleSpeed(speed)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${
              simulationSpeed === speed
                ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* Presentation Toggle */}
      <button
        onClick={togglePresentationMode}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
          demoModeActive
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
        }`}
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span>Presentation</span>
      </button>

    </motion.div>
  );
};
