import React from 'react';
import { 
  MousePointer, 
  Hand, 
  Square, 
  Circle as CircleIcon, 
  StickyNote, 
  Type, 
  ArrowUpRight, 
  Trash2, 
  Undo2, 
  Redo2,
  Type as FontIcon,
  Palette,
  Layers,
  Sparkles,
  Lock,
  Unlock,
  Grid,
  Magnet,
  Compass,
  Maximize2,
  MessageSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical
} from 'lucide-react';
import { ElementType, ElementStyle } from '../types';

interface ToolbarProps {
  activeTool: ElementType | 'select' | 'pan';
  setActiveTool: (tool: ElementType | 'select' | 'pan') => void;
  elementStyle: ElementStyle;
  setElementStyle: (style: ElementStyle) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  canGroup: boolean;
  canUngroup: boolean;
  gridEnabled: boolean;
  setGridEnabled: (enabled: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  onToggleLock: () => void;
  isSelectionLocked: boolean;
  canToggleLock: boolean;
  onBringToFront: () => void;
  onSendToBack: () => void;
  canReorderLayers: boolean;
  onPanToOrigin: () => void;
  onCenterView: () => void;
  onAlignSelected: (type: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  onDistributeSelected: (direction: 'horizontal' | 'vertical') => void;
  canAlign: boolean;
  canDistribute: boolean;
  onAddQuickShape: (shapeType: 'process' | 'decision' | 'start-end') => void;
  selectedCount?: number;
  onApplyGroupStyle?: (style: Partial<ElementStyle>) => void;
}

const PRESET_FILLS = [
  { value: '#ffffff', label: 'White' },
  { value: '#e0f2fe', label: 'Sky Blue' },
  { value: '#dcfce7', label: 'Soft Green' },
  { value: '#fef3c7', label: 'Warm Yellow' },
  { value: '#f3e8ff', label: 'Lavender' },
  { value: '#ffe4e6', label: 'Rose Red' },
  { value: '#f3f4f6', label: 'Light Gray' },
];

const PRESET_STROKES = [
  { value: '#1e293b', label: 'Dark Slate' },
  { value: '#0284c7', label: 'Sky Blue' },
  { value: '#16a34a', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#7c3aed', label: 'Indigo' },
  { value: '#e11d48', label: 'Rose' },
];

export default function Toolbar({
  activeTool,
  setActiveTool,
  elementStyle,
  setElementStyle,
  onUndo,
  onRedo,
  onDeleteSelected,
  hasSelection,
  canUndo,
  canRedo,
  onGroup,
  onUngroup,
  canGroup,
  canUngroup,
  gridEnabled,
  setGridEnabled,
  snapToGrid,
  setSnapToGrid,
  onToggleLock,
  isSelectionLocked,
  canToggleLock,
  onBringToFront,
  onSendToBack,
  canReorderLayers,
  onPanToOrigin,
  onCenterView,
  onAlignSelected,
  onDistributeSelected,
  canAlign,
  canDistribute,
  onAddQuickShape,
  selectedCount = 0,
  onApplyGroupStyle,
}: ToolbarProps) {
  const handleStyleChange = (key: keyof ElementStyle, value: any) => {
    setElementStyle({
      ...elementStyle,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-xl max-w-fit pointer-events-auto">
      {/* Undo / Redo / Trash Panel */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent ml-auto"
          title="Delete Selection (Delete / Backspace)"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Main Drawing Tools */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Tools</span>
        
        <button
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'select'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MousePointer size={16} />
          Select
        </button>

        <button
          onClick={() => setActiveTool('pan')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'pan'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Hand size={16} />
          Pan Canvas
        </button>

        <div className="h-[1px] bg-slate-100 my-1" />

        <button
          onClick={() => setActiveTool('rectangle')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'rectangle'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Square size={16} />
          Rectangle
        </button>

        <button
          onClick={() => setActiveTool('circle')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'circle'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CircleIcon size={16} />
          Circle
        </button>

        <button
          onClick={() => setActiveTool('sticky')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'sticky'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <StickyNote size={16} />
          Sticky Note
        </button>

        <button
          onClick={() => setActiveTool('text')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'text'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Type size={16} />
          Text Label
        </button>

        <button
          onClick={() => setActiveTool('connector')}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === 'connector'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight size={16} />
          Connector
        </button>

        <button
          onClick={() => setActiveTool('comment' as any)}
          className={`flex items-center gap-3 w-36 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTool === ('comment' as any)
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare size={16} />
          Add Comment
        </button>
      </div>

      {/* Quick Flowchart Shapes Panel */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">Quick Flowcharts</span>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onAddQuickShape('process')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-sky-50/70 hover:bg-sky-100 border border-sky-200 hover:border-sky-300 text-sky-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Add Process rectangular step shape"
          >
            <div className="w-5 h-3 border-1.5 border-sky-500 bg-sky-100 rounded-sm flex-shrink-0" />
            <span>Process Step</span>
          </button>
          
          <button
            onClick={() => onAddQuickShape('decision')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50/70 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Add Decision diamond shape"
          >
            <div className="w-3.5 h-3.5 border-1.5 border-amber-500 bg-amber-100 rotate-45 flex-shrink-0" />
            <span>Decision (Diamond)</span>
          </button>

          <button
            onClick={() => onAddQuickShape('start-end')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Add Start/End capsule shape"
          >
            <div className="w-5 h-3 border-1.5 border-emerald-500 bg-emerald-100 rounded-full flex-shrink-0" />
            <span>Start / End</span>
          </button>
        </div>
      </div>

      {/* Grouping Actions Panel */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Grouping</span>
        <div className="flex gap-1.5">
          <button
            onClick={onGroup}
            disabled={!canGroup}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 text-xs font-semibold rounded-xl text-slate-700 hover:text-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Group selected elements (Ctrl+G)"
          >
            <Layers size={13} />
            <span>Group</span>
          </button>
          <button
            onClick={onUngroup}
            disabled={!canUngroup}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 text-xs font-semibold rounded-xl text-slate-700 hover:text-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Ungroup selected elements (Ctrl+Shift+G)"
          >
            <Layers size={13} className="opacity-70" />
            <span>Ungroup</span>
          </button>
        </div>
      </div>

      {/* Layer Reordering Panel */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Arrange Layers</span>
        <div className="flex gap-1.5">
          <button
            onClick={onBringToFront}
            disabled={!canReorderLayers}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 text-xs font-semibold rounded-xl text-slate-700 hover:text-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Bring selected elements to the front"
          >
            <ArrowUpRight size={13} className="rotate-[-45deg]" />
            <span>To Front</span>
          </button>
          <button
            onClick={onSendToBack}
            disabled={!canReorderLayers}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 text-xs font-semibold rounded-xl text-slate-700 hover:text-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Send selected elements to the back"
          >
            <ArrowUpRight size={13} className="rotate-[135deg]" />
            <span>To Back</span>
          </button>
        </div>
      </div>

      {/* Alignment & Distribution section */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Align Selection</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onAlignSelected('left')}
            disabled={!canAlign}
            className="p-1.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Align Left"
          >
            <AlignLeft size={14} />
            <span className="mt-0.5">Left</span>
          </button>
          <button
            onClick={() => onAlignSelected('center-h')}
            disabled={!canAlign}
            className="p-1.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Align Horizontal Center"
          >
            <AlignCenter size={14} />
            <span className="mt-0.5">Center</span>
          </button>
          <button
            onClick={() => onAlignSelected('right')}
            disabled={!canAlign}
            className="p-1.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Align Right"
          >
            <AlignRight size={14} />
            <span className="mt-0.5">Right</span>
          </button>
          <button
            onClick={() => onAlignSelected('top')}
            disabled={!canAlign}
            className="p-1.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Align Top"
          >
            <AlignStartVertical size={14} />
            <span className="mt-0.5">Top</span>
          </button>
          <button
            onClick={() => onAlignSelected('center-v')}
            disabled={!canAlign}
            className="p-1.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Align Vertical Middle"
          >
            <div className="flex flex-col items-center gap-[1px]">
              <div className="w-3 h-0.5 bg-slate-400" />
              <div className="w-1.5 h-1.5 bg-slate-600 rounded-sm" />
              <div className="w-3 h-0.5 bg-slate-400" />
            </div>
            <span className="mt-0.5">Middle</span>
          </button>
          <button
            onClick={() => onAlignSelected('bottom')}
            disabled={!canAlign}
            className="p-1.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Align Bottom"
          >
            <AlignEndVertical size={14} />
            <span className="mt-0.5">Bottom</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Auto-Distribute (3+)</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onDistributeSelected('horizontal')}
            disabled={!canDistribute}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Distribute Horizontal Spacing"
          >
            <div className="flex items-center gap-0.5 mr-1">
              <div className="w-0.5 h-3 bg-slate-400" />
              <div className="w-1 h-1.5 bg-indigo-500 rounded-sm" />
              <div className="w-0.5 h-3 bg-slate-400" />
            </div>
            <span>Horizontal</span>
          </button>
          <button
            onClick={() => onDistributeSelected('vertical')}
            disabled={!canDistribute}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 transition-colors cursor-pointer"
            title="Distribute Vertical Spacing"
          >
            <div className="flex flex-col items-center gap-0.5 mr-1">
              <div className="w-3 h-0.5 bg-slate-400" />
              <div className="w-1.5 h-1 bg-indigo-500 rounded-sm" />
              <div className="w-3 h-0.5 bg-slate-400" />
            </div>
            <span>Vertical</span>
          </button>
        </div>
      </div>

      {/* Alignment & Grid Panel */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Canvas Grid</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setGridEnabled(!gridEnabled)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              gridEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle background dot grid"
          >
            <Grid size={13} />
            <span>{gridEnabled ? 'Grid On' : 'Grid Off'}</span>
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              snapToGrid
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle snap-to-grid alignment"
          >
            <Magnet size={13} />
            <span>{snapToGrid ? 'Snap On' : 'Snap Off'}</span>
          </button>
        </div>
      </div>

      {/* Viewport Reset Navigation Panel */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Navigation</span>
        <div className="flex gap-1.5">
          <button
            onClick={onPanToOrigin}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 text-xs font-semibold rounded-xl text-slate-700 hover:text-indigo-600 transition-all cursor-pointer"
            title="Reset view to coordinate origin (0, 0) and 100% zoom"
          >
            <Compass size={13} />
            <span>To Origin</span>
          </button>
          <button
            onClick={onCenterView}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 text-xs font-semibold rounded-xl text-slate-700 hover:text-indigo-600 transition-all cursor-pointer"
            title="Center view on all active elements"
          >
            <Maximize2 size={13} />
            <span>Center View</span>
          </button>
        </div>
      </div>

      {/* Locking Actions Panel */}
      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">Security</span>
        <button
          onClick={onToggleLock}
          disabled={!canToggleLock}
          className={`flex items-center justify-center gap-1.5 w-full px-2.5 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:border-slate-200 disabled:cursor-not-allowed ${
            isSelectionLocked
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-slate-50 border-slate-200/80 hover:bg-indigo-50/50 hover:border-indigo-200 text-slate-700 hover:text-indigo-600'
          }`}
          title="Lock or unlock selected elements"
        >
          {isSelectionLocked ? <Lock size={13} /> : <Unlock size={13} />}
          <span>{isSelectionLocked ? 'Unlock Selected' : 'Lock Selected'}</span>
        </button>
      </div>

      {/* Group Style Properties Panel */}
      {selectedCount > 1 && (
        <div className="flex flex-col gap-2.5 border-t-2 border-indigo-100 bg-indigo-50/40 -mx-3 px-3 py-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900">
              Group Styling ({selectedCount} items)
            </span>
          </div>

          {/* Group Fill Presets */}
          <div>
            <span className="text-[10px] text-indigo-700/80 font-bold mb-1 block px-1">Apply Uniform Fill</span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_FILLS.map((col) => (
                <button
                  key={col.value}
                  onClick={() => onApplyGroupStyle?.({ fill: col.value })}
                  className="w-6 h-6 rounded-md border border-indigo-200/50 hover:scale-110 hover:border-indigo-500 hover:shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: col.value }}
                  title={`Apply ${col.label} to group`}
                />
              ))}
            </div>
          </div>

          {/* Group Stroke Presets */}
          <div>
            <span className="text-[10px] text-indigo-700/80 font-bold mb-1 block px-1">Apply Uniform Border</span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_STROKES.map((col) => (
                <button
                  key={col.value}
                  onClick={() => onApplyGroupStyle?.({ stroke: col.value })}
                  className="w-6 h-6 rounded-md border border-transparent hover:scale-110 hover:border-indigo-500 hover:shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: col.value }}
                  title={`Apply ${col.label} border to group`}
                />
              ))}
            </div>
          </div>

          {/* Group Font Family & Font Size */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <div>
              <span className="text-[10px] text-indigo-700/80 font-bold block mb-1 px-1">Group Font</span>
              <select
                onChange={(e) => onApplyGroupStyle?.({ fontFamily: e.target.value })}
                className="w-full text-xs bg-white border border-indigo-200/60 rounded-lg p-1.5 font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                defaultValue=""
              >
                <option value="" disabled>Select font...</option>
                <option value="sans">System Sans</option>
                <option value="mono">JetBrains Mono</option>
                <option value="serif">Editorial Serif</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-indigo-700/80 font-bold block mb-1 px-1">Group Text Size</span>
              <select
                onChange={(e) => onApplyGroupStyle?.({ fontSize: Number(e.target.value) })}
                className="w-full text-xs bg-white border border-indigo-200/60 rounded-lg p-1.5 font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                defaultValue=""
              >
                <option value="" disabled>Select size...</option>
                <option value="11">Small (11px)</option>
                <option value="13">Normal (13px)</option>
                <option value="15">Medium (15px)</option>
                <option value="18">Large (18px)</option>
                <option value="24">Heading (24px)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Style Configurator Panel */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">Styling</span>
        
        {/* Colors selector */}
        {activeTool !== 'text' && activeTool !== 'connector' && (
          <div>
            <span className="text-[10px] text-slate-500 mb-1 block px-1">Fill Color</span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_FILLS.map((col) => (
                <button
                  key={col.value}
                  onClick={() => handleStyleChange('fill', col.value)}
                  className={`w-6 h-6 rounded-md border transition-all ${
                    elementStyle.fill === col.value
                      ? 'border-indigo-600 scale-110 shadow-sm shadow-indigo-600/20'
                      : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.value }}
                  title={col.label}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="text-[10px] text-slate-500 mb-1 block px-1">Border / Stroke</span>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_STROKES.map((col) => (
              <button
                key={col.value}
                onClick={() => handleStyleChange('stroke', col.value)}
                className={`w-6 h-6 rounded-md border transition-all ${
                  elementStyle.stroke === col.value
                    ? 'border-indigo-600 scale-110 shadow-sm shadow-indigo-600/20'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: col.value }}
                title={col.label}
              />
            ))}
          </div>
        </div>

        {/* Text styling settings */}
        <div className="mt-1 flex flex-col gap-1.5">
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5 px-1">Font Family</span>
            <select
              value={elementStyle.fontFamily || 'sans'}
              onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="sans">System Sans</option>
              <option value="mono">JetBrains Mono</option>
              <option value="serif">Editorial Serif</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5 px-1">Text Size</span>
            <select
              value={elementStyle.fontSize || 13}
              onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value={11}>Small (11px)</option>
              <option value={13}>Normal (13px)</option>
              <option value={15}>Medium (15px)</option>
              <option value={18}>Large (18px)</option>
              <option value={24}>Heading (24px)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
