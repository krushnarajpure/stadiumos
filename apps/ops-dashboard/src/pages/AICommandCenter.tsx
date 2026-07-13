import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Mic,
  Bot,
  User,
  Clock,
  Cpu,
  RefreshCw,
  Shield,
  Activity,
  Users,
  AlertTriangle,
  HeartPulse,
  Zap,
  Cloud,
  Thermometer,
  Wifi,
  Check,
  Copy,
  ChevronRight,
  Terminal,
  MapPin,
  Eye,
  Signal,
  Gauge,
  Loader2,
  MessageSquare,
  Globe,
} from 'lucide-react';
import api from '../services/api';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  meta?: {
    confidence?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    latencyMs?: number;
    tokensUsed?: number;
  };
}

// ──────────────────────────────────────────────
// Mock AI Response Engine
// ──────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { text: 'What is happening at Gate B?', icon: MapPin },
  { text: 'Predict crowd congestion for halftime', icon: Users },
  { text: 'Any active medical emergencies?', icon: HeartPulse },
  { text: 'Show current security alerts', icon: Shield },
  { text: 'Suggest optimal evacuation route', icon: Zap },
  { text: 'Vendor inventory status report', icon: Terminal },
];

async function getRealAIResponse(prompt: string, sessionId: string): Promise<{ content: string; meta: ChatMessage['meta'] }> {
  try {
    const res = await api.post('/api/v1/copilot/query', {
      message: prompt,
      session_id: sessionId
    });
    
    const data = res.data;
    
    let md = `## Operational Intelligence Summary\n\n${data.summary}\n\n`;
    
    if (data.reasoning && data.reasoning.length > 0) {
      md += `### Reasoning\n`;
      data.reasoning.forEach((r: string) => {
        md += `- ${r}\n`;
      });
      md += `\n`;
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
      md += `### Recommended Actions\n`;
      data.recommendations.forEach((rec: any, idx: number) => {
        md += `${idx + 1}. **${rec.priority}** — ${rec.action}\n   *Impact: ${rec.expected_impact}*\n`;
      });
    }

    return {
      content: md,
      meta: {
        confidence: Math.round(data.confidence * 100),
        riskLevel: data.risk || 'LOW',
        latencyMs: Math.floor(Math.random() * 500) + 200, // mock latency if real one isn't tracked on frontend
        tokensUsed: Math.floor(Math.random() * 500) + 1000
      }
    };
  } catch (error) {
    console.error("Copilot API error:", error);
    return {
      content: "## Error\n\nFailed to reach the AI Operations Copilot backend. Ensure the FastAPI service is running and a valid LLM provider API key is set.",
      meta: {
        confidence: 0,
        riskLevel: 'LOW',
        latencyMs: 0,
        tokensUsed: 0
      }
    };
  }
}

// ──────────────────────────────────────────────
// Connected Systems data
// ──────────────────────────────────────────────

const CONNECTED_SYSTEMS = [
  { name: 'CCTV Analytics', status: true, latency: '12ms' },
  { name: 'Turnstile Telemetry', status: true, latency: '8ms' },
  { name: 'AED Network', status: true, latency: '15ms' },
  { name: 'PA System', status: true, latency: '5ms' },
  { name: 'Weather Feed', status: true, latency: '340ms' },
  { name: 'Access Control DB', status: true, latency: '22ms' },
  { name: 'Mobile App Push', status: true, latency: '45ms' },
  { name: 'Vendor POS Sync', status: false, latency: '—' },
];

// ──────────────────────────────────────────────
// Risk level badge color mapping
// ──────────────────────────────────────────────

function getRiskColors(level?: string) {
  switch (level) {
    case 'CRITICAL': return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' };
    case 'HIGH': return { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' };
    case 'MEDIUM': return { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    case 'LOW': return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' };
    default: return { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400' };
  }
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export const AICommandCenter: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      role: 'system',
      content: 'StadiumOS AI Copilot initialized. Connected to 7 live data streams. Model: GPT-5 Turbo. Ready for operational queries.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState(12847);
  const [sessionLatency, setSessionLatency] = useState(84);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Keyboard shortcut: Cmd/Ctrl + / to focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Streaming simulation
  const streamResponse = useCallback((fullContent: string, meta: ChatMessage['meta']) => {
    const msgId = `ai-${Date.now()}`;
    const streamMsg: ChatMessage = {
      id: msgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      meta,
    };

    setMessages(prev => [...prev, streamMsg]);
    setIsStreaming(true);

    let charIndex = 0;
    const interval = setInterval(() => {
      // Stream in chunks of 2-4 characters for natural feel
      const chunkSize = Math.floor(Math.random() * 3) + 2;
      charIndex = Math.min(charIndex + chunkSize, fullContent.length);

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, content: fullContent.slice(0, charIndex) }
            : m
        )
      );

      if (charIndex >= fullContent.length) {
        clearInterval(interval);
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId ? { ...m, isStreaming: false } : m
          )
        );
        setIsStreaming(false);
        setTotalTokens(prev => prev + (meta?.tokensUsed || 0));
        setSessionLatency(meta?.latencyMs || 84);
      }
    }, 12);
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      // sessionId can just be "default" for now or a random uuid
      const { content, meta } = await getRealAIResponse(msg, 'stadium-ops-session');
      streamResponse(content, meta);
    } catch (err) {
      setIsStreaming(false);
    }
  }, [input, isStreaming, streamResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ───── LEFT: Chat Panel ───── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Model Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#180F25]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#C6BADE] pulse-indicator" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display">AI Operations Copilot</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#C6BADE]/10 border border-[#C6BADE]/20 rounded-lg">
              <Cpu className="w-3 h-3 text-[#C6BADE]" />
              <span className="text-[9px] font-mono font-bold text-[#F7B9C4] uppercase">GPT-5 Turbo</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-[9px] text-[#94A3B8]">
              <Gauge className="w-3 h-3" />
              <span className="font-mono">{sessionLatency}ms</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center space-x-1.5 text-[9px] text-[#94A3B8]">
              <Activity className="w-3 h-3" />
              <span className="font-mono">2.4 GB</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center space-x-1.5 text-[9px] text-[#94A3B8]">
              <Terminal className="w-3 h-3" />
              <span className="font-mono">{totalTokens.toLocaleString()} tokens</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={() => {
                setMessages([{
                  id: 'sys-1',
                  role: 'system',
                  content: 'Session cleared. StadiumOS AI Copilot re-initialized. Connected to 7 live data streams.',
                  timestamp: new Date(),
                }]);
                setTotalTokens(12847);
              }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-white transition-colors"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {/* System messages */}
                {msg.role === 'system' && (
                  <div className="flex items-center space-x-2 px-4 py-2.5 bg-[#C6BADE]/8 border border-[#C6BADE]/15 rounded-xl max-w-[85%]">
                    <Zap className="w-3.5 h-3.5 text-[#C6BADE] shrink-0" />
                    <span className="text-[11px] text-[#F3D9E5] font-medium">{msg.content}</span>
                    <span className="text-[8px] text-[#94A3B8] font-mono shrink-0 ml-2">{formatTime(msg.timestamp)}</span>
                  </div>
                )}

                {/* User messages */}
                {msg.role === 'user' && (
                  <div className="flex items-start space-x-3 max-w-[70%]">
                    <div className="flex flex-col items-end flex-1 min-w-0">
                      <div className="bg-gradient-to-br from-[#DE638A] to-[#B23E63] text-white px-5 py-3.5 rounded-2xl rounded-br-md shadow-lg shadow-[#DE638A]/10">
                        <p className="text-[12px] leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-[8px] text-[#94A3B8] font-mono mt-1.5 mr-1">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#DE638A] to-[#B23E63] flex items-center justify-center shrink-0 shadow-lg shadow-[#DE638A]/15">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* AI messages */}
                {msg.role === 'assistant' && (
                  <div className="flex items-start space-x-3 max-w-[85%] min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C6BADE] to-[#9F91C7] flex items-center justify-center shrink-0 shadow-lg shadow-[#C6BADE]/15 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="glass-panel rounded-2xl rounded-bl-md px-5 py-4 border border-white/[0.06] relative overflow-hidden">
                        {/* Accent top stripe */}
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#C6BADE] via-[#F7B9C4] to-transparent" />

                        {/* Meta badges */}
                        {msg.meta && !msg.isStreaming && (
                          <div className="flex items-center flex-wrap gap-2 mb-3 pb-3 border-b border-white/5">
                            {msg.meta.confidence && (
                              <span className="text-[8px] font-mono font-bold bg-[#C6BADE]/10 border border-[#C6BADE]/20 text-[#E7E2F2] px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {msg.meta.confidence}% confidence
                              </span>
                            )}
                            {msg.meta.riskLevel && (() => {
                              const rc = getRiskColors(msg.meta.riskLevel);
                              return (
                                <span className={`text-[8px] font-mono font-bold ${rc.bg} border ${rc.border} ${rc.text} px-2 py-0.5 rounded-md uppercase tracking-wider`}>
                                  {msg.meta.riskLevel} risk
                                </span>
                              );
                            })()}
                            {msg.meta.latencyMs && (
                              <span className="text-[8px] font-mono text-[#94A3B8] bg-white/5 px-2 py-0.5 rounded-md">
                                {msg.meta.latencyMs}ms
                              </span>
                            )}
                            {msg.meta.tokensUsed && (
                              <span className="text-[8px] font-mono text-[#94A3B8] bg-white/5 px-2 py-0.5 rounded-md">
                                {msg.meta.tokensUsed} tokens
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message content with Markdown */}
                        <div className={`ai-prose text-[11.5px] text-[#CBD5E1] ${msg.isStreaming ? 'typing-cursor' : ''}`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Action row */}
                      <div className="flex items-center space-x-2 mt-1.5 ml-1">
                        <span className="text-[8px] text-[#94A3B8] font-mono">{formatTime(msg.timestamp)}</span>
                        {!msg.isStreaming && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-white/5 text-[#94A3B8] hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-2 ml-11 mt-2"
            >
              <div className="flex space-x-1">
                <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#C6BADE]" />
                <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#C6BADE]" />
                <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#C6BADE]" />
              </div>
              <span className="text-[9px] text-[#94A3B8] font-mono">Copilot is analyzing...</span>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6 pb-3 shrink-0"
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt.text)}
                  className="group flex items-center space-x-2.5 px-4 py-3 bg-[#231634]/60 hover:bg-[#332049]/80 border border-white/5 hover:border-[#C6BADE]/20 rounded-xl text-left transition-all duration-300"
                >
                  <prompt.icon className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#C6BADE] transition-colors shrink-0" />
                  <span className="text-[10px] text-[#94A3B8] group-hover:text-white transition-colors leading-snug">{prompt.text}</span>
                  <ChevronRight className="w-3 h-3 text-[#94A3B8]/0 group-hover:text-[#C6BADE] transition-all ml-auto shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Input Area */}
        <div className="px-6 pb-5 pt-3 border-t border-white/5 bg-[#0B1228]/60 backdrop-blur-md shrink-0">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stadium operations..."
                rows={1}
                disabled={isStreaming}
                className="w-full bg-[#231634]/80 border border-white/8 hover:border-white/12 focus:border-[#DE638A]/40 focus:ring-1 focus:ring-[#DE638A]/20 px-5 py-3.5 pr-12 rounded-2xl text-[12px] outline-none text-white placeholder-[#64748B] resize-none transition-all duration-200 disabled:opacity-50"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <div className="absolute right-3 bottom-2.5 flex items-center space-x-1">
                <span className="text-[8px] text-[#64748B] font-mono mr-1 hidden sm:inline">⌘ Enter</span>
              </div>
            </div>

            {/* Voice button (UI only) */}
            <button
              className="p-3 rounded-xl bg-[#231634]/80 border border-white/8 hover:border-[#F7B9C4]/30 text-[#94A3B8] hover:text-[#F7B9C4] transition-all duration-200 shrink-0"
              title="Voice input (coming soon)"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className="p-3 rounded-xl bg-gradient-to-br from-[#DE638A] to-[#B23E63] hover:from-[#E37A9D] hover:to-[#A13156] disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-lg shadow-[#DE638A]/20 hover:shadow-[#DE638A]/30 transition-all duration-200 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ───── RIGHT: Context Insights Panel ───── */}
      <div className="w-[340px] min-w-[340px] border-l border-white/5 bg-[#180F25]/60 backdrop-blur-md overflow-y-auto hidden xl:flex flex-col">

        {/* Panel Header */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Eye className="w-3.5 h-3.5 text-[#F7B9C4]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest font-display">Live Context</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator" />
            <span className="text-[8px] text-emerald-400 font-mono font-bold">LIVE</span>
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1">

          {/* Current Match */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Current Match</span>
              <span className="text-[8px] font-mono bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-1.5 py-0.5 rounded font-bold">LIVE</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-[11px] font-bold text-white font-display">ARG</div>
                <div className="text-[8px] text-[#94A3B8]">Argentina</div>
              </div>
              <div className="flex flex-col items-center px-4">
                <div className="text-lg font-extrabold text-white font-display tracking-wider">1 — 1</div>
                <div className="text-[9px] text-[#F7B9C4] font-mono font-bold mt-0.5">42' First Half</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-[11px] font-bold text-white font-display">FRA</div>
                <div className="text-[8px] text-[#94A3B8]">France</div>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-center space-x-2">
              <Globe className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[9px] text-[#94A3B8]">Lusail Iconic Stadium — Group C</span>
            </div>
          </div>

          {/* Attendance */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Attendance</span>
              <Users className="w-3 h-3 text-[#94A3B8]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-white font-display">67,204</span>
              <span className="text-[9px] text-[#94A3B8]">/ 80,000</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mt-2.5">
              <div className="bg-gradient-to-r from-[#DE638A] to-[#F7B9C4] h-1.5 rounded-full transition-all duration-1000" style={{ width: '84%' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[8px] text-[#94A3B8] font-mono">84% capacity</span>
              <span className="text-[8px] text-emerald-400 font-mono font-bold">+2,140 last 15m</span>
            </div>
          </div>

          {/* Crowd Density */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Crowd Density</span>
              <Signal className="w-3 h-3 text-[#94A3B8]" />
            </div>
            {[
              { zone: 'North Stand', pct: 88, color: '#EF4444' },
              { zone: 'South Stand', pct: 72, color: '#F59E0B' },
              { zone: 'East Wing', pct: 61, color: '#DE638A' },
              { zone: 'West Wing', pct: 45, color: '#22C55E' },
              { zone: 'VIP Lounge', pct: 34, color: '#8B5CF6' },
            ].map((z) => (
              <div key={z.zone} className="mb-2.5 last:mb-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-gray-300">{z.zone}</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color: z.color }}>{z.pct}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${z.pct}%`, backgroundColor: z.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Emergency Status */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Emergency Status</span>
              <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
            </div>
            {[
              { label: 'Medical Incidents', count: 3, severity: 'MODERATE', color: '#F59E0B' },
              { label: 'Security Alerts', count: 4, severity: 'ELEVATED', color: '#EF4444' },
              { label: 'Fire Systems', count: 0, severity: 'CLEAR', color: '#22C55E' },
            ].map((e) => (
              <div key={e.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                <span className="text-[9px] text-gray-300">{e.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-mono font-bold" style={{ color: e.color }}>{e.count}</span>
                  <span className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: e.color, backgroundColor: `${e.color}15`, border: `1px solid ${e.color}30` }}>
                    {e.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Weather */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Weather</span>
              <Cloud className="w-3 h-3 text-[#94A3B8]" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-baseline space-x-1">
                <Thermometer className="w-3.5 h-3.5 text-[#F59E0B] self-center" />
                <span className="text-lg font-extrabold text-white font-display">32°C</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#94A3B8]">Humidity</span>
                  <span className="text-gray-300 font-mono">42%</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#94A3B8]">Wind</span>
                  <span className="text-gray-300 font-mono">12 km/h NW</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#94A3B8]">UV Index</span>
                  <span className="text-yellow-400 font-mono font-bold">6 (High)</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">AI Confidence</span>
              <Cpu className="w-3 h-3 text-[#C6BADE]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-[#C6BADE] font-display">96.8%</span>
              <span className="text-[8px] text-emerald-400 font-mono">+1.2%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-[#C6BADE] to-[#E7E2F2] h-1.5 rounded-full transition-all duration-1000" style={{ width: '96.8%' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[8px] text-[#94A3B8] font-mono">Model accuracy score</span>
              <span className="text-[8px] text-[#C6BADE] font-mono font-bold">Excellent</span>
            </div>
          </div>

          {/* Connected Systems */}
          <div className="glass-panel rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest">Connected Systems</span>
              <Wifi className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="space-y-1.5">
              {CONNECTED_SYSTEMS.map((sys) => (
                <div key={sys.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${sys.status ? 'bg-emerald-400' : 'bg-red-400'} ${sys.status ? 'pulse-indicator' : ''}`} />
                    <span className="text-[9px] text-gray-300">{sys.name}</span>
                  </div>
                  <span className={`text-[8px] font-mono ${sys.status ? 'text-emerald-400' : 'text-red-400'}`}>
                    {sys.status ? sys.latency : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[8px] text-[#94A3B8]">System health</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">7/8 Online</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default AICommandCenter;
