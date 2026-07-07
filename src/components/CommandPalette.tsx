import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Command, 
  MousePointer, 
  Hand, 
  Square, 
  Circle, 
  StickyNote, 
  Type, 
  MessageSquare, 
  Maximize2, 
  Move, 
  Undo2, 
  Redo2, 
  Sun, 
  Moon, 
  Grid, 
  FolderKanban, 
  Check, 
  Sparkles 
} from 'lucide-react';

interface BoardItem {
  id: string;
  name: string;
  elementCount?: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBoard: (id: string) => void;
  activeBoardId: string;
  setActiveTool: (tool: any) => void;
  setCanvasTheme: (theme: 'light' | 'dark' | 'blueprint') => void;
  setGridEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  handleUndo: () => void;
  handleRedo: () => void;
  handlePanToOrigin: () => void;
  handleCenterView: () => void;
  onAutoLayout: () => void;
  toggleCanvasSearch?: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectBoard,
  activeBoardId,
  setActiveTool,
  setCanvasTheme,
  setGridEnabled,
  setSnapToGrid,
  handleUndo,
  handleRedo,
  handlePanToOrigin,
  handleCenterView,
  onAutoLayout,
  toggleCanvasSearch,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Listen for global Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // wait, we want to toggle or open
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [isOpen, onClose]);

  // 2. Fetch boards when open
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    
    // Quick focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const loadBoards = async () => {
      try {
        const res = await fetch('/api/boards');
        if (res.ok) {
          const data = await res.json();
          setBoards(data);
        }
      } catch (err) {
        console.error('Failed to fetch boards in command palette', err);
      }
    };
    loadBoards();
  }, [isOpen]);

  if (!isOpen) return null;

  // 3. Define all static commands
  const staticCommands = [
    // Tools
    { id: 'tool-select', name: 'Switch to Select Tool', category: 'Tools', icon: 'Pointer', action: () => setActiveTool('select') },
    { id: 'tool-pan', name: 'Switch to Pan Canvas Tool', category: 'Tools', icon: 'Hand', action: () => setActiveTool('pan') },
    { id: 'tool-rect', name: 'Select Rectangle Shape', category: 'Tools', icon: 'Square', action: () => setActiveTool('rectangle') },
    { id: 'tool-circle', name: 'Select Circle Shape', category: 'Tools', icon: 'Circle', action: () => setActiveTool('circle') },
    { id: 'tool-sticky', name: 'Select Sticky Note', category: 'Tools', icon: 'StickyNote', action: () => setActiveTool('sticky') },
    { id: 'tool-text', name: 'Select Text Label', category: 'Tools', icon: 'Type', action: () => setActiveTool('text') },
    { id: 'tool-comment', name: 'Select Comment Box', category: 'Tools', icon: 'MessageSquare', action: () => setActiveTool('comment') },
    // Canvas Actions
    { id: 'action-search', name: 'Search Canvas Elements & Sticky Notes (Ctrl+F)', category: 'Canvas Actions', icon: 'Search', action: toggleCanvasSearch || (() => {}) },
    { id: 'action-autolayout', name: 'Auto-Layout Diagram (Hierarchical Alignment)', category: 'Canvas Actions', icon: 'Sparkles', action: onAutoLayout },
    { id: 'action-center', name: 'Center View (Fit All Nodes)', category: 'Canvas Actions', icon: 'Maximize2', action: handleCenterView },
    { id: 'action-pan-origin', name: 'Pan to Origin (0,0)', category: 'Canvas Actions', icon: 'Move', action: handlePanToOrigin },
    { id: 'action-undo', name: 'Undo Last Action', category: 'Canvas Actions', icon: 'Undo2', action: handleUndo },
    { id: 'action-redo', name: 'Redo Last Action', category: 'Canvas Actions', icon: 'Redo2', action: handleRedo },
    // Themes & Options
    { id: 'theme-light', name: 'Set Theme: Light Grid', category: 'Preferences', icon: 'Sun', action: () => setCanvasTheme('light') },
    { id: 'theme-dark', name: 'Set Theme: Dark Slate', category: 'Preferences', icon: 'Moon', action: () => setCanvasTheme('dark') },
    { id: 'theme-blueprint', name: 'Set Theme: Engineering Blueprint', category: 'Preferences', icon: 'Grid', action: () => setCanvasTheme('blueprint') },
    { id: 'grid-toggle', name: 'Toggle Dot Grid Visiblity', category: 'Preferences', icon: 'Grid', action: () => setGridEnabled(prev => !prev) },
    { id: 'snap-toggle', name: 'Toggle Snap to Grid Guides', category: 'Preferences', icon: 'Maximize2', action: () => setSnapToGrid(prev => !prev) },
  ];

  // 4. Filter lists based on query
  const filteredBoards = boards
    .filter(b => b.name.toLowerCase().includes(query.toLowerCase()))
    .map(b => ({
      id: `board-${b.id}`,
      name: `Switch to Board: ${b.name}`,
      category: 'Boards',
      icon: 'FolderKanban',
      action: () => onSelectBoard(b.id),
      active: b.id === activeBoardId
    }));

  const filteredStatic = staticCommands.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [...filteredBoards, ...filteredStatic];

  // 5. Handle keyboard navigation inside the palette
  const handleKeyDownPalette = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Pointer': return <MousePointer size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Hand': return <Hand size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Square': return <Square size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Circle': return <Circle size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'StickyNote': return <StickyNote size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Type': return <Type size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'MessageSquare': return <MessageSquare size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Maximize2': return <Maximize2 size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Move': return <Move size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Undo2': return <Undo2 size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Redo2': return <Redo2 size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Sun': return <Sun size={14} className="text-amber-500 group-hover:text-indigo-600 transition-colors" />;
      case 'Moon': return <Moon size={14} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />;
      case 'Grid': return <Grid size={14} className="text-blue-500 group-hover:text-indigo-600 transition-colors" />;
      case 'FolderKanban': return <FolderKanban size={14} className="text-indigo-500 group-hover:text-indigo-600 transition-colors" />;
      case 'Search': return <Search size={14} className="text-indigo-500 group-hover:text-indigo-600 transition-colors" />;
      default: return <Sparkles size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />;
    }
  };

  // Group matched items by category for bento/layout rendering
  const categories: Record<string, typeof allItems> = {};
  allItems.forEach((item) => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-auto">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />

      {/* Main command palette element container */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-2xl bg-white/95 backdrop-blur-lg border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px] animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDownPalette}
      >
        {/* Upper search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={18} className="text-slate-400 flex-shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            className="w-full text-sm font-bold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-400"
            placeholder="Type a command, tool, or board name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-500 rounded-md select-none flex-shrink-0 shadow-sm">
            <span>ESC</span>
          </div>
        </div>

        {/* List of matches */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 divide-y divide-slate-50">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Command size={24} className="mx-auto mb-2 opacity-30 animate-bounce" />
              <p className="text-xs font-semibold">No matching results found for <strong className="text-slate-700">"{query}"</strong></p>
            </div>
          ) : (
            Object.entries(categories).map(([category, items]) => (
              <div key={category} className="pt-2 first:pt-0">
                <h3 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  {category}
                </h3>
                <div className="mt-1 space-y-0.5">
                  {items.map((item) => {
                    // Find actual flat index of this item in the master flat list
                    const flatIdx = allItems.findIndex(x => x.id === item.id);
                    const isFocused = flatIdx === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                          isFocused 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15 scale-[1.008]' 
                            : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1 rounded-lg transition-colors ${isFocused ? 'bg-indigo-500/35 text-white' : 'bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                            {renderIcon(item.icon)}
                          </div>
                          <span className={`text-xs font-bold leading-none ${isFocused ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.active && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isFocused ? 'bg-white/25 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                              ACTIVE
                            </span>
                          )}
                          {isFocused && (
                            <div className="flex items-center gap-0.5 text-[9px] font-bold opacity-80 uppercase tracking-wider">
                              <span>Enter</span>
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer tip bar */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-bold">↑↓</span>
            <span>Navigate</span>
            <span className="px-1 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-bold ml-1.5">Enter</span>
            <span>Select</span>
          </div>
          <div>
            <span>Ctrl+K to toggle anywhere</span>
          </div>
        </div>
      </div>
    </div>
  );
}
