import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Grid, 
  ChevronRight, 
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Minimize2
} from 'lucide-react';

interface SidebarAIProps {
  boardId: string;
  clientId: string;
  selectedElementIds: string[];
  aiStatus: { message?: string; error?: string } | null;
  setAiStatus: (status: { message?: string; error?: string } | null) => void;
  onRefreshBoard: () => void;
}

export default function SidebarAI({
  boardId,
  clientId,
  selectedElementIds,
  aiStatus,
  setAiStatus,
  onRefreshBoard,
}: SidebarAIProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState<string | null>(null); // 'generate' | 'summarize' | 'review' | 'organize'
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRetracted, setIsRetracted] = useState(false);

  const handleCopy = () => {
    if (aiResponse) {
      navigator.clipboard.writeText(aiResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const runAIDiagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading('generate');
    setAiStatus({ message: 'Initializing diagram request...' });
    setAiResponse(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, clientId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setPrompt('');
      setAiStatus({ message: `Successfully generated and added ${data.addedCount} elements to your canvas!` });
      setTimeout(() => setAiStatus(null), 5000);
      onRefreshBoard();
    } catch (err: any) {
      setAiStatus({ error: err.message || 'Failed to generate diagram.' });
    } finally {
      setLoading(null);
    }
  };

  const runAISummarize = async () => {
    setLoading('summarize');
    setAiStatus({ message: 'Compiling board context and summarizing...' });
    setAiResponse(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/ai/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: selectedElementIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setAiResponse(data.summary);
      setAiStatus(null);
    } catch (err: any) {
      setAiStatus({ error: err.message || 'Failed to summarize board.' });
    } finally {
      setLoading(null);
    }
  };

  const runAIReview = async () => {
    setLoading('review');
    setAiStatus({ message: 'Conducting production readiness system architecture review...' });
    setAiResponse(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/ai/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setAiResponse(data.review);
      setAiStatus(null);
    } catch (err: any) {
      setAiStatus({ error: err.message || 'Failed to review architecture.' });
    } finally {
      setLoading(null);
    }
  };

  const runAIOrganize = async () => {
    setLoading('organize');
    setAiStatus({ message: 'Analyzing semantic themes of sticky notes...' });
    setAiResponse(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/ai/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setAiStatus({ message: `Reorganized sticky notes into ${data.groupsCount} thematic clusters!` });
      setTimeout(() => setAiStatus(null), 5000);
      onRefreshBoard();
    } catch (err: any) {
      setAiStatus({ error: err.message || 'Failed to cluster notes.' });
    } finally {
      setLoading(null);
    }
  };

  if (isRetracted) {
    return (
      <button
        onClick={() => setIsRetracted(false)}
        className="flex items-center justify-center w-12 h-12 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-full shadow-2xl border border-slate-800/80 hover:border-slate-700 pointer-events-auto cursor-pointer transition-all hover:scale-105 ml-auto relative group"
        title="Open Gemini AI Workspace"
      >
        <Sparkles size={18} className="animate-pulse" />
        <span className="absolute right-14 bg-slate-950 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Open Gemini AI Workspace
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-2xl border border-slate-800 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-400 animate-pulse" size={20} />
          <div>
            <h2 className="font-bold text-sm text-slate-100 tracking-tight">Gemini AI Workspace</h2>
            <p className="text-[10px] text-slate-400">Transform sketches into production ideas</p>
          </div>
        </div>
        <button
          onClick={() => setIsRetracted(true)}
          className="text-slate-400 hover:text-indigo-400 p-1.5 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
          title="Retract AI Workspace"
        >
          <Minimize2 size={14} />
        </button>
      </div>

      {/* Main Panel Content Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-5 pt-4 pr-1 scrollbar-thin">
        {/* Real-time Loading Status Indicators */}
        {aiStatus && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
            aiStatus.error 
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' 
              : 'bg-indigo-950/40 border-indigo-800/80 text-indigo-300'
          }`}>
            {aiStatus.error ? (
              <AlertCircle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <RefreshCw size={18} className="text-indigo-400 animate-spin flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-semibold">{aiStatus.error ? 'AI Agent Error' : 'Collaborative AI Agent'}</p>
              <p className="text-[11px] leading-normal opacity-90 mt-0.5">{aiStatus.error || aiStatus.message}</p>
            </div>
          </div>
        )}

        {/* 1. Generate Diagram Section */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 px-1">
            <Layers size={14} className="text-indigo-400" />
            Diagram Creator
          </label>
          <form onSubmit={runAIDiagram} className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A scale-out user service architecture with API Gateway, JWT validator, Redis cache, and PostgreSQL DB"
              rows={3}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
              disabled={!!loading}
            />
            <button
              type="submit"
              disabled={!!loading || !prompt.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading === 'generate' ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generate Diagram
            </button>
          </form>
        </div>

        {/* 2. Rapid AI Operation Utilities */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 px-1">
            <Sparkles size={14} className="text-indigo-400" />
            Whiteboard Quick Actions
          </label>
          
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={runAISummarize}
              disabled={!!loading}
              className="flex items-center gap-3 w-full text-left bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 p-3 rounded-xl transition-all hover:border-slate-700 group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 group-hover:scale-105 transition-transform">
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200">Summarize Content</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {selectedElementIds.length > 0 ? `Summarize ${selectedElementIds.length} items` : 'Summarize entire board layout'}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" />
            </button>

            <button
              onClick={runAIReview}
              disabled={!!loading}
              className="flex items-center gap-3 w-full text-left bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 p-3 rounded-xl transition-all hover:border-slate-700 group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 group-hover:scale-105 transition-transform">
                <ShieldCheck size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200">Architecture Critique</p>
                <p className="text-[10px] text-slate-400 truncate">Review diagrams for bottlenecks & risks</p>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" />
            </button>

            <button
              onClick={runAIOrganize}
              disabled={!!loading}
              className="flex items-center gap-3 w-full text-left bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 p-3 rounded-xl transition-all hover:border-slate-700 group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-950 text-amber-400 group-hover:scale-105 transition-transform">
                <Grid size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200">Affinity Map Stickies</p>
                <p className="text-[10px] text-slate-400 truncate">Auto-cluster notes into categorized groups</p>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" />
            </button>
          </div>
        </div>

        {/* 3. Render Markdown Text/Response Output */}
        {aiResponse && (
          <div className="space-y-2 border-t border-slate-800/60 pt-4 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-200">Gemini Response Insight</span>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-800 rounded-lg flex items-center gap-1 text-[10px]"
                title="Copy to clipboard"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            
            <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl p-4.5 text-xs text-slate-300 font-normal leading-relaxed overflow-y-auto max-h-[350px] scrollbar-thin select-text">
              {aiResponse.split('\n').map((line, idx) => {
                if (line.startsWith('## ')) {
                  return <h3 key={idx} className="font-bold text-slate-100 text-sm mt-4 mb-2 first:mt-0">{line.replace('## ', '')}</h3>;
                }
                if (line.startsWith('### ')) {
                  return <h4 key={idx} className="font-semibold text-slate-200 text-xs mt-3 mb-1">{line.replace('### ', '')}</h4>;
                }
                if (line.startsWith('# ')) {
                  return <h2 key={idx} className="font-extrabold text-indigo-400 text-base mt-4 mb-2 border-b border-slate-800 pb-1">{line.replace('# ', '')}</h2>;
                }
                if (line.startsWith('- ')) {
                  return <li key={idx} className="ml-4 list-disc mt-1 text-[11px] leading-relaxed text-slate-300">{line.replace('- ', '')}</li>;
                }
                return <p key={idx} className="mt-2 text-[11px] leading-relaxed text-slate-400">{line}</p>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
