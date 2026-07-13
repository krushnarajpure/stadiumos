import React, { useState } from 'react';
import { dashboardService } from '../services/dashboard';
import { parseApiError } from '../utils/apiError';

async function queryOpsAssistant(message: string): Promise<string> {
  const lower = message.toLowerCase();

  if (lower.includes('crowd') || lower.includes('gate') || lower.includes('congestion') || lower.includes('zone')) {
    const heatmap = await dashboardService.getCrowdHeatmap();
    if (heatmap.length === 0) return 'No crowd zone data is available right now.';
    const sorted = [...heatmap].sort((a, b) => b.occupancy_pct - a.occupancy_pct);
    const lowest = sorted[sorted.length - 1];
    const highest = sorted[0];
    return `Lowest congestion: ${lowest.zone_name} at ${lowest.occupancy_pct.toFixed(0)}% (${lowest.headcount} people). Highest: ${highest.zone_name} at ${highest.occupancy_pct.toFixed(0)}%.`;
  }

  if (lower.includes('emergency') || lower.includes('incident') || lower.includes('sla')) {
    const [incidents, dashboard] = await Promise.all([
      dashboardService.getIncidents(),
      dashboardService.getIncidentDashboard(),
    ]);
    const active = incidents.filter((i) => i.status !== 'Resolved');
    return `There are ${active.length} active incidents. SLA compliance: ${dashboard.sla_compliance_rate.toFixed(0)}%. ${
      active.length > 0 ? `Latest: "${active[0].title}" (${active[0].severity}) in zone ${active[0].zone_id}.` : ''
    }`;
  }

  if (lower.includes('inventory') || lower.includes('stock') || lower.includes('vendor') || lower.includes('concession')) {
    const lowStock = await dashboardService.getLowStockInventory();
    if (lowStock.length === 0) return 'All vendor inventories are above minimum thresholds.';
    return `${lowStock.length} low-stock item(s): ${lowStock
      .slice(0, 5)
      .map((i) => `vendor ${i.vendor_id.slice(0, 8)} / product ${i.product_id.slice(0, 8)} (${i.current_stock} left)`)
      .join('; ')}.`;
  }

  if (lower.includes('user') || lower.includes('operator') || lower.includes('staff')) {
    const users = await dashboardService.searchUsers({ limit: 10 });
    return `${users.length} registered operator(s). Active: ${users.filter((u) => u.is_active).length}.`;
  }

  return 'I can query live crowd zones, emergencies, vendor inventory, and user data. Try asking about congestion, incidents, or low stock.';
}

export const AIChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: 'Ops assistant connected. Ask about crowd zones, emergencies, inventory, or users.', isUser: false },
  ]);
  const [loading, setLoading] = useState(false);

  const suggestedPrompts = [
    'Which gate has the lowest congestion?',
    'How many active emergencies are there?',
    'List low stock inventory items',
  ];

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setLogs((prev) => [...prev, { text, isUser: true }]);
    setLoading(true);

    try {
      const response = await queryOpsAssistant(text);
      setLogs((prev) => [...prev, { text: response, isUser: false }]);
    } catch (err: unknown) {
      setLogs((prev) => [...prev, { text: parseApiError(err, 'Failed to query live data.'), isUser: false }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 bg-gradient-to-tr from-[#8B5CF6] to-[#00E5FF] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {open && (
        <div className="w-[380px] h-[500px] bg-[#111A33] border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
          <div className="bg-[#0B1228] p-4 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6] pulse-indicator" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Ops Data Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-xs uppercase font-bold">
              Hide
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {logs.map((log, idx) => (
              <div key={idx} className={`flex ${log.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                  log.isUser ? 'bg-[#00A8FF] text-white rounded-br-none' : 'bg-[#16213E] text-gray-300 rounded-bl-none border border-white/5'
                }`}>
                  {log.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#16213E] p-3 rounded-xl text-xs text-gray-400 border border-white/5 animate-pulse">
                  Querying live APIs...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-[#0B1228] border-t border-white/5 space-y-2">
            {logs.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-white/5">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="text-[9px] bg-[#16213E] hover:bg-[#111A33] border border-white/5 text-[#00E5FF] px-2 py-1 rounded-lg"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about live ops data..."
                className="bg-[#111A33] border border-white/10 px-4 py-2.5 rounded-xl text-xs outline-none text-white placeholder-gray-500 focus:border-[#8B5CF6] flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (handleSend(message), setMessage(''))}
              />
              <button
                onClick={() => (handleSend(message), setMessage(''))}
                className="bg-[#8B5CF6] hover:bg-[#7c4ee4] text-white p-2.5 rounded-xl"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AIChatBot;
