import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Copy, 
  Clock, 
  Layers, 
  ArrowRight,
  ChevronRight,
  User,
  ArrowUpRight,
  Search,
  Tag,
  X,
  LayoutTemplate
} from 'lucide-react';
import { TEMPLATES } from '../data/templates';

interface BoardSummary {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  elementCount: number;
}

interface BoardListProps {
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  triggerRefresh: number;
  onApplyTemplate?: (elements: any) => void;
}

export default function BoardList({
  activeBoardId,
  onSelectBoard,
  triggerRefresh,
  onApplyTemplate,
}: BoardListProps) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);
  const [boardElements, setBoardElements] = useState<Record<string, Record<string, any>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'workspaces' | 'templates'>('workspaces');

  const getBoardTags = (elements: Record<string, any> | undefined): string[] => {
    if (!elements) return [];
    const tagsSet = new Set<string>();
    (Object.values(elements) as any[]).forEach(el => {
      if (el && el.text) {
        // Match hashtags like #todo, #ideas (allowing alphanumeric and dashes)
        const matches = el.text.match(/#[a-zA-Z0-9_-]+/g);
        if (matches) {
          matches.forEach((match: string) => tagsSet.add(match.toLowerCase()));
        }
      }
    });
    return Array.from(tagsSet);
  };

  const fetchBoardDetails = async (boardIds: string[]) => {
    for (const id of boardIds) {
      try {
        const res = await fetch(`/api/boards/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBoardElements(prev => ({
            ...prev,
            [id]: data.elements || {}
          }));
        }
      } catch (err) {
        console.error('Failed to fetch board details', id, err);
      }
    }
  };

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        const ids = data.map((b: any) => b.id);
        fetchBoardDetails(ids);
      }
    } catch (err) {
      console.error('Failed to fetch boards list', err);
    }
  };

  const renderThumbnail = (elements: Record<string, any> | undefined) => {
    if (!elements || Object.keys(elements).length === 0) {
      return (
        <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col items-center justify-center text-[8px] text-slate-400 font-bold uppercase tracking-wider relative overflow-hidden flex-shrink-0">
          <Layers size={12} className="text-slate-300 mb-0.5 animate-pulse" />
          <span className="scale-90 origin-center text-[6px] text-slate-400">Empty</span>
        </div>
      );
    }

    const items = Object.values(elements).filter(el => el.type !== 'connector');
    if (items.length === 0) {
      return (
        <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col items-center justify-center text-[8px] text-slate-400 font-bold uppercase tracking-wider relative overflow-hidden flex-shrink-0">
          <Layers size={12} className="text-slate-300 mb-0.5" />
          <span className="scale-90 origin-center text-[6px] text-slate-400">Empty</span>
        </div>
      );
    }

    // Sort elements by zIndex if available, otherwise use original order
    const sortedItems = [...items].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    // Find bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    sortedItems.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });

    const bWidth = maxX - minX || 1;
    const bHeight = maxY - minY || 1;

    // Scale to fit a 38x38 box inside the 48x48 card
    const targetSize = 36;
    const padding = 6;
    const scale = Math.min(targetSize / bWidth, targetSize / bHeight, 0.15); // limit scale to 0.15 to prevent huge items

    // Center offsets
    const offsetX = padding + (targetSize - bWidth * scale) / 2;
    const offsetY = padding + (targetSize - bHeight * scale) / 2;

    return (
      <div className="w-12 h-12 bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-inner group-hover:border-slate-300 transition-colors">
        <svg className="w-full h-full pointer-events-none" viewBox="0 0 48 48">
          {sortedItems.map(el => {
            const rx = offsetX + (el.x - minX) * scale;
            const ry = offsetY + (el.y - minY) * scale;
            const rw = el.width * scale;
            const rh = el.height * scale;

            const fill = el.style?.fill || '#ffffff';
            const stroke = el.style?.stroke || '#475569';

            if (el.type === 'circle') {
              return (
                <circle
                  key={el.id}
                  cx={rx + rw / 2}
                  cy={ry + rh / 2}
                  r={Math.min(rw, rh) / 2}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.75}
                />
              );
            } else if (el.type === 'sticky') {
              return (
                <rect
                  key={el.id}
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.75}
                  rx={0.5}
                />
              );
            } else if (el.type === 'text') {
              // Draw text label as a couple of minimal horizontal gray lines representing text lines
              return (
                <g key={el.id}>
                  <line
                    x1={rx}
                    y1={ry + rh / 2}
                    x2={rx + rw}
                    y2={ry + rh / 2}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </g>
              );
            } else {
              return (
                <rect
                  key={el.id}
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.75}
                  rx={1}
                />
              );
            }
          })}
        </svg>
      </div>
    );
  };

  useEffect(() => {
    fetchBoards();
  }, [triggerRefresh, activeBoardId]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName.trim() || undefined }),
      });
      if (res.ok) {
        const newBoard = await res.json();
        setNewBoardName('');
        onSelectBoard(newBoard.id);
        fetchBoards();
      }
    } catch (err) {
      console.error('Failed to create board', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the board
    try {
      const res = await fetch(`/api/boards/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        const duplicated = await res.json();
        onSelectBoard(duplicated.id);
        fetchBoards();
      }
    } catch (err) {
      console.error('Failed to duplicate board', err);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xl w-80 max-h-[85vh] pointer-events-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <FolderKanban size={18} />
        </div>
        <div>
          <h2 className="font-bold text-sm text-slate-800 tracking-tight">Project Workspaces</h2>
          <p className="text-[10px] text-slate-400">All collaborative whiteboards</p>
        </div>
      </div>

      {/* Create New Board Form */}
      <form onSubmit={handleCreateBoard} className="mt-4 flex gap-1.5">
        <input
          type="text"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          placeholder="New whiteboard name..."
          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-slate-700"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating}
          className="p-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15"
          title="Create Board"
        >
          <Plus size={16} />
        </button>
      </form>

      {/* Segment Tabs */}
      <div className="flex border-b border-slate-100 mt-4 text-xs select-none">
        <button
          onClick={() => setActiveTab('workspaces')}
          className={`flex-1 pb-2 text-center font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'workspaces'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Workspaces
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 pb-2 text-center font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Templates
        </button>
      </div>

      {activeTab === 'workspaces' ? (
        <>
          {/* Search Bar */}
          <div className="mt-3 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, tag, or content..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:border-indigo-500 text-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full cursor-pointer transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Board Listing Scroll Container */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-1 scrollbar-thin">
            {(() => {
              const filteredBoards = boards.filter(board => {
                const query = searchQuery.trim().toLowerCase();
                if (!query) return true;

                // Check board name
                if (board.name.toLowerCase().includes(query)) return true;

                // Check elements and tags
                const elements = boardElements[board.id];
                if (elements) {
                  const tags = getBoardTags(elements);
                  if (tags.some(t => t.includes(query))) return true;

                  const hasContentMatch = (Object.values(elements) as any[]).some(el => 
                    el && el.text && el.text.toLowerCase().includes(query)
                  );
                  if (hasContentMatch) return true;
                }

                return false;
              });

              if (boards.length > 0 && filteredBoards.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    No boards match your search.
                  </div>
                );
              }

              if (boards.length === 0) {
                return (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    No active boards. Create one above!
                  </div>
                );
              }

              return filteredBoards.map((board) => {
                const isActive = board.id === activeBoardId;
                return (
                  <div
                    key={board.id}
                    onClick={() => onSelectBoard(board.id)}
                    className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/60 border-indigo-200/80'
                        : 'bg-white border-slate-100 hover:bg-slate-50/80 hover:border-slate-200/60'
                    }`}
                  >
                    {renderThumbnail(boardElements[board.id])}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{board.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} />
                          {formatTime(board.updatedAt)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="flex items-center gap-0.5">
                          <ArrowUpRight size={10} />
                          {board.elementCount} items
                        </span>
                      </div>

                      {/* Render content tags dynamically */}
                      {(() => {
                        const tags = getBoardTags(boardElements[board.id]);
                        if (tags.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tags.slice(0, 3).map(tag => (
                              <span 
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchQuery(tag);
                                }}
                                className="text-[8px] font-bold bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100/60 text-indigo-600 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                                title={`Filter by ${tag}`}
                              >
                                {tag}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span className="text-[8px] font-medium text-slate-400 self-center">
                                +{tags.length - 3}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicateBoard(board.id, e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                        title="Duplicate Board"
                      >
                        <Copy size={12} />
                      </button>
                      <ChevronRight size={12} className="text-slate-400" />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1 scrollbar-thin">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 select-none">Baseline Blueprints</p>
          {TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                if (onApplyTemplate) {
                  onApplyTemplate(tmpl.elements);
                }
              }}
              className="group p-3 bg-slate-50/40 hover:bg-indigo-50/30 border border-slate-200/50 hover:border-indigo-200/50 rounded-xl transition-all cursor-pointer flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-white group-hover:bg-indigo-50 border border-slate-200/50 group-hover:border-indigo-100 rounded-xl text-slate-500 group-hover:text-indigo-600 shadow-sm transition-all flex-shrink-0">
                  <LayoutTemplate size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{tmpl.name}</span>
                    <span className="text-[7px] font-extrabold bg-indigo-50 border border-indigo-100/50 text-indigo-600 px-1 py-0.5 rounded uppercase tracking-wider">{tmpl.category}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 group-hover:text-slate-500 leading-normal mt-0.5 mt-1 line-clamp-2">{tmpl.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                <span>Apply Template</span>
                <ArrowRight size={10} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
