import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Bot, 
  UserPlus, 
  Sparkles, 
  Radio, 
  Circle,
  HelpCircle,
  StopCircle,
  Play
} from 'lucide-react';
import { Collaborator } from '../types';

interface CollaboratorsPanelProps {
  boardId: string;
  clientId: string;
  collaborators: Collaborator[];
  onAddSimulatedCollaborator: (name: string, role: 'developer' | 'designer' | 'manager') => void;
  onStopSimulatedCollaborators: () => void;
  isSimulating: boolean;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
];

export default function CollaboratorsPanel({
  boardId,
  clientId,
  collaborators,
  onAddSimulatedCollaborator,
  onStopSimulatedCollaborators,
  isSimulating,
}: CollaboratorsPanelProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/?boardId=${boardId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const spawnSarah = () => {
    onAddSimulatedCollaborator('Sarah (Developer)', 'developer');
  };

  const spawnAlex = () => {
    onAddSimulatedCollaborator('Alex (Designer)', 'designer');
  };

  return (
    <div className="flex flex-col bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xl w-80 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={16} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-800 tracking-tight">Active Team</h3>
            <p className="text-[9px] text-slate-400">Collaborating on this board</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-semibold uppercase text-emerald-600">LIVE</span>
        </div>
      </div>

      {/* Collaborator Avatars List */}
      <div className="space-y-2 mt-3 flex-1 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin">
        {collaborators.map((user) => (
          <div key={user.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-all">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                </div>
              )}
              {/* Active dot */}
              <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-emerald-500" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">
                {user.name} {user.id === clientId ? '(You)' : ''}
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                {user.isSimulated ? 'Simulated AI Bot' : 'Connected Browser'}
              </p>
            </div>

            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: user.color }}
              title="Collaborator cursor accent"
            />
          </div>
        ))}
      </div>

      {/* Multi-Tab and Share Trigger */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={handleCopyShareLink}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 py-1.5 px-3 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <UserPlus size={12} />
          {copiedLink ? 'Link Copied!' : 'Copy Multi-tab Collab Link'}
        </button>
        <p className="text-[9px] text-slate-400 mt-1.5 text-center leading-normal">
          Tip: Open this link in another tab to test real-time cursor tracking!
        </p>
      </div>

      {/* Simulator Control Board */}
      <div className="mt-4 pt-3.5 border-t border-slate-100/80 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1.5 mb-2">
          <Bot size={13} className="text-indigo-600 animate-bounce" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Multiplayer Simulator</span>
        </div>

        <p className="text-[9px] text-slate-400 mb-2.5 leading-relaxed">
          No teammate online? Spawn smart simulated colleagues who dynamically brainstorm ideas, move around, and sketch diagrams.
        </p>

        <div className="flex gap-1.5">
          <button
            onClick={spawnSarah}
            disabled={isSimulating && collaborators.some(c => c.name.includes('Sarah'))}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all shadow-sm cursor-pointer disabled:opacity-40"
          >
            + Sarah (Dev)
          </button>
          <button
            onClick={spawnAlex}
            disabled={isSimulating && collaborators.some(c => c.name.includes('Alex'))}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all shadow-sm cursor-pointer disabled:opacity-40"
          >
            + Alex (UX)
          </button>
        </div>

        {isSimulating && (
          <button
            onClick={onStopSimulatedCollaborators}
            className="w-full mt-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] py-1 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <StopCircle size={10} />
            Stop Collaboration Sim
          </button>
        )}
      </div>
    </div>
  );
}
