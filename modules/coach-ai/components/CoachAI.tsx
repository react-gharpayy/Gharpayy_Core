'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Users, 
  Zap, 
  BrainCircuit, 
  Loader2, 
  Database,
  ClipboardCheck,
  Download,
  Share2
} from 'lucide-react';
import { exportOperationalReport } from '../lib/export-engine';
import { FollowUpPrompts } from './FollowUpPrompts';
import { useToast } from '@/hooks/use-toast';

const INITIAL_PROMPTS = [
  "Summarize today’s operations.",
  "Which hubs are at risk?",
  "Who are my top-performing operators?",
  "Analyze attendance risks.",
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dataSnapshot?: any;
  followUps?: string[];
  isDirective?: boolean;
}

const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 5); // Fast typing speed
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <MarkdownContent content={displayedText} />;
};

const MarkdownContent = ({ content }: { content: string }) => {
  // Enhanced parsing to support better Markdown hierarchy
  const renderLines = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-3 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
          {line.replace('# ', '')}
        </h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold text-gray-800 mt-5 mb-2 border-b border-gray-100 pb-1 uppercase tracking-tight">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-bold text-orange-600 mt-4 mb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const cleanLine = line.replace(/^[-*]\s+/, '');
        return (
          <div key={i} className="flex gap-3 items-start ml-1 my-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-300 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed">
              {cleanLine.split('**').map((part, index) => 
                index % 2 === 1 ? <strong key={index} className="text-gray-900 font-bold">{part}</strong> : part
              )}
            </p>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      return (
        <p key={i} className="text-sm leading-relaxed text-gray-600 my-1">
          {line.split('**').map((part, index) => 
            index % 2 === 1 ? <strong key={index} className="text-gray-900 font-bold">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return <div className="space-y-1">{renderLines(content)}</div>;
};

export default function CoachAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [operationalData, setOperationalData] = useState<any | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/command-center', { cache: 'no-store' });
      const d = await res.json();
      if (d.ok) setOperationalData(d);
    } catch (error) {
      console.error("Failed to fetch operational data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isAtBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      const offset = 50;
      isAtBottom.current = el.scrollHeight - el.scrollTop <= el.clientHeight + offset;
    }
  };

  const handleSend = async (query: string, isDirective: boolean = false) => {
    if (!query.trim()) return;
    
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // 1. Get latest operational data for context
      const dataRes = await fetch('/api/command-center', { cache: 'no-store' });
      const opData = await dataRes.json();

      // 2. Prepare chat history for AI context
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      chatHistory.push({ role: 'user', content: query });

      // 3. Call Groq-powered Chat API
      const res = await fetch('/api/coach-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          operationalData: opData.ok ? opData : (operationalData || {}),
          isDirective
        }),
      });

      const data = await res.json();
      
      if (data.ok) {
        const aiMsg: Message = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          dataSnapshot: opData.ok ? {
            healthScore: opData.healthScore,
            kpis: opData.kpis,
            query
          } : undefined,
          followUps: data.followUps || [],
          isDirective
        };
        setMessages(prev => [...prev, aiMsg]);
        setLastMessageId(aiMsg.id);
      } else {
        throw new Error(data.error || 'Failed to generate insight');
      }
    } catch (error: any) {
      toast({
        title: "Coaching Error",
        description: error.message || "Failed to reach Coach AI. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleExport = async (msg: Message) => {
    setIsExporting(msg.id);
    try {
      await exportOperationalReport(msg.content, {
        timestamp: msg.timestamp,
        healthScore: msg.dataSnapshot?.healthScore,
        query: msg.dataSnapshot?.query || 'Operational Analysis'
      });
      toast({
        title: "PDF Generated",
        description: "Executive briefing downloaded as PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsExporting(null), 1200);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Native Enterprise Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Coach AI</h1>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider underline decoration-orange-500/30 decoration-2 underline-offset-4">Constrained Operational Reasoning</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isLoadingData ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
              <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aggregating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Ontology Sync Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Intelligence Feed */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#fcfcfc] no-scrollbar scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-8 py-12">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center mb-2 border border-orange-100">
              <Database className="w-8 h-8 text-orange-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Structured Intelligence</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Coach AI analyzes hubs, teams, and operators using constrained business logic to provide executive-level operational guidance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {INITIAL_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="p-4 text-left rounded-xl bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50/30 transition-all group shadow-sm"
                >
                  <p className="text-xs font-semibold text-gray-600 group-hover:text-orange-700 transition-colors">{prompt}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
            {msg.role === 'user' ? (
              <div className="max-w-[80%] bg-gray-900 text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-md">
                <p className="text-sm font-medium">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-[90%] w-full bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
                {/* AI Briefing Badge */}
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className={`w-3.5 h-3.5 ${msg.isDirective ? 'text-green-500' : 'text-orange-500'}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {msg.isDirective ? 'Actionable Directives' : 'Operational Context Briefing'}
                    </span>
                  </div>
                  {msg.dataSnapshot && (
                    <div className="flex items-center gap-3">
                       <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Health Score:</span>
                        <span className="text-[11px] font-bold text-gray-800">{msg.dataSnapshot.healthScore}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {msg.id === lastMessageId ? (
                    <TypewriterText text={msg.content} onComplete={() => {
                      if (scrollRef.current && isAtBottom.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                      }
                    }} />
                  ) : (
                    <MarkdownContent content={msg.content} />
                  )}
                  
                  {/* Follow-up Section */}
                  {!isTyping && index === messages.length - 1 && (
                    <FollowUpPrompts 
                      prompts={msg.followUps || []} 
                      onSelect={(p) => handleSend(p)} 
                    />
                  )}
                </div>

                <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center gap-4">
                  {!msg.isDirective && (
                    <button 
                      onClick={() => handleSend(msg.content, true)}
                      className="flex items-center gap-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wider transition-colors group"
                    >
                      <ClipboardCheck className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      Generate Directives
                    </button>
                  )}
                  <button 
                    onClick={() => handleExport(msg)}
                    disabled={isExporting === msg.id}
                    className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider transition-colors group disabled:opacity-60"
                  >
                    {isExporting === msg.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                        <span className="text-orange-500">Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                        Export Briefing
                      </>
                    )}
                  </button>
                  <div className="flex-1" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-6 shadow-sm w-full max-w-md">
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <div className="w-2 h-2 rounded-full bg-orange-300 delay-150" />
                <div className="w-2 h-2 rounded-full bg-orange-200 delay-300" />
                <span className="text-xs font-bold text-gray-400 ml-2 uppercase tracking-widest">Reasoning with Ontology...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Native Shell Input */}
      <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="relative flex items-end gap-3">
          <div className="relative flex-1">
            <textarea 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(inputValue);
                }
              }}
              placeholder="Ask about burnout, risk, performance, or accountability..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-500/5 transition-all font-medium resize-none min-h-[52px] max-h-[150px]"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <div className="absolute right-3 bottom-1.5 flex items-center gap-2">
              <button 
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-black disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-8">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <Database className="w-3 h-3 text-gray-300" />
            Ontology Enforced
          </p>
          <div className="w-1 h-1 rounded-full bg-gray-200" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <BrainCircuit className="w-3 h-3 text-gray-300" />
            Constrained Reasoning
          </p>
        </div>
      </div>
    </div>
  );
}
