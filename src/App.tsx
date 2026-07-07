import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Layers, Bot, AlertCircle, RefreshCw, FolderKanban, Play, Users, Download, ChevronDown, ChevronUp, X, ArrowRight, Image, FileCode, Search, Palette, Star, Check, FileText, History, Trash2, ArrowLeftRight, LayoutTemplate, Sliders, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import BoardList from './components/BoardList';
import Toolbar from './components/Toolbar';
import SidebarAI from './components/SidebarAI';
import CollaboratorsPanel from './components/CollaboratorsPanel';
import WhiteboardCanvas from './components/WhiteboardCanvas';
import Minimap from './components/Minimap';
import CommandPalette from './components/CommandPalette';
import { BoardElement, ElementType, ElementStyle, Collaborator } from './types';
import { exportBoardToSVG, exportBoardToPNG, exportBoardToPDF } from './utils/exportSvg';

// Generate a persistent clientId for this browser session
const CLIENT_ID = `client-${Math.random().toString(36).substr(2, 9)}`;
const CLIENT_NAME = `User_${CLIENT_ID.slice(-4)}`;
const CLIENT_COLOR = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'][Math.floor(Math.random() * 6)];

export default function App() {
  const [boardId, setBoardId] = useState<string>('demo-board');
  const [boardName, setBoardName] = useState<string>('Brainstorming Board');
  const [elements, setElements] = useState<Record<string, BoardElement>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: CLIENT_ID, name: `${CLIENT_NAME} (You)`, color: CLIENT_COLOR, lastActive: Date.now() }
  ]);
  const [activeTool, setActiveTool] = useState<ElementType | 'select' | 'pan'>('select');
  const [elementStyle, setElementStyle] = useState<ElementStyle>({
    fill: '#e0f2fe',
    stroke: '#0284c7',
    strokeWidth: 2,
    textColor: '#0f172a',
    fontSize: 13,
    fontFamily: 'sans',
  });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [snapStrength, setSnapStrength] = useState<'loose' | 'strict'>('strict');

  // Sync Settings states
  const [saveMode, setSaveMode] = useState<'auto' | 'manual'>('auto');
  const [syncDebounceTiming, setSyncDebounceTiming] = useState<number>(1000); // default 1 second
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showSyncSettings, setShowSyncSettings] = useState<boolean>(false);

  const pendingSyncRef = useRef<{ modified: Record<string, BoardElement>; deletedIds: string[] }>({
    modified: {},
    deletedIds: []
  });
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshot History Stacks (Undo / Redo)
  const [history, setHistory] = useState<Record<string, BoardElement>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, BoardElement>[]>([]);

  // Board list refresh trigger
  const [boardRefreshCounter, setBoardRefreshCounter] = useState(0);
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'error'>('saved');

  // Real-time status / notification
  const [aiStatus, setAiStatus] = useState<{ message?: string; error?: string } | null>(null);

  // Export format selection
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Canvas Theme: 'light' | 'dark' | 'blueprint'
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark' | 'blueprint'>('light');

  // Command Palette open/close state
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Timeline Modal state
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  // Canvas text search states
  const [showCanvasSearch, setShowCanvasSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  interface PresenterSlide {
    id: string;
    title: string;
    panX: number;
    panY: number;
    zoom: number;
  }

  // Presenter Mode States
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [slides, setSlides] = useState<PresenterSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [showPresenterPanel, setShowPresenterPanel] = useState<boolean>(false);
  const [newSlideTitle, setNewSlideTitle] = useState<string>('');

  // Bounding box selection for export
  const [isExportSelecting, setIsExportSelecting] = useState<boolean>(false);
  const [exportBoundingBox, setExportBoundingBox] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`presenter-slides-${boardId}`);
      if (stored) {
        setSlides(JSON.parse(stored));
      } else {
        // Default placeholders for a clean initial slideshow
        setSlides([
          { id: 'slide-1', title: 'Intro Overview', panX: 100, panY: 100, zoom: 0.8 },
          { id: 'slide-2', title: 'Detailed Analysis', panX: -200, panY: -100, zoom: 1.2 }
        ]);
      }
      setCurrentSlideIndex(0);
    } catch (e) {
      console.error(e);
    }
  }, [boardId]);

  const saveSlidesToStorage = (updatedSlides: PresenterSlide[]) => {
    setSlides(updatedSlides);
    localStorage.setItem(`presenter-slides-${boardId}`, JSON.stringify(updatedSlides));
  };

  const handleCaptureSlide = () => {
    const title = newSlideTitle.trim() || `Slide ${slides.length + 1}`;
    const newSlide: PresenterSlide = {
      id: `slide-${Math.random().toString(36).substr(2, 9)}`,
      title,
      panX: pan.x,
      panY: pan.y,
      zoom: zoom
    };
    const updated = [...slides, newSlide];
    saveSlidesToStorage(updated);
    setNewSlideTitle('');
    setCurrentSlideIndex(updated.length - 1);
  };

  const handleGoToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
      const slide = slides[index];
      setPan({ x: slide.panX, y: slide.panY });
      setZoom(slide.zoom);
    }
  };

  const handleDeleteSlide = (slideId: string) => {
    const updated = slides.filter(s => s.id !== slideId);
    saveSlidesToStorage(updated);
    if (currentSlideIndex >= updated.length) {
      setCurrentSlideIndex(Math.max(0, updated.length - 1));
    }
  };

  // Keyboard navigation for Presenter Mode
  useEffect(() => {
    if (!isPresenting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return; // ignore when user is typing in inputs
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoToSlide(Math.max(0, currentSlideIndex - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoToSlide(Math.min(slides.length - 1, currentSlideIndex + 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsPresenting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresenting, currentSlideIndex, slides.length]);

  const handleExportSelection = (format: 'svg' | 'png') => {
    if (!exportBoundingBox) return;
    if (format === 'svg') {
      exportBoardToSVG(boardName, elements, exportBoundingBox);
    } else {
      exportBoardToPNG(boardName, elements, exportBoundingBox);
    }
    // Turn off selection mode
    setIsExportSelecting(false);
    setExportBoundingBox(null);
  };

  // Simulator state variables
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sockets & SSE Connection management
  const sseSourceRef = useRef<EventSource | null>(null);
  const cursorPostThrottleRef = useRef<number>(0);

  // Load Board State from Server
  const loadBoard = async (id: string) => {
    try {
      const res = await fetch(`/api/boards/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBoardId(id);
        setBoardName(data.name);
        setElements(data.elements || {});
        setSelectedIds([]);
        setHistory([data.elements || {}]); // initialize undo stack
        setRedoStack([]);
      }
    } catch (err) {
      console.error('Failed to load board details', err);
    }
  };

  useEffect(() => {
    loadBoard(boardId);
  }, [boardId]);

  // Connect to Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
    }

    const sse = new EventSource(`/api/boards/${boardId}/sync?clientId=${CLIENT_ID}`);
    sseSourceRef.current = sse;

    // Stream listeners
    sse.addEventListener('cursor_moved', (e: any) => {
      const { clientId: senderId, payload } = JSON.parse(e.data);
      if (senderId === CLIENT_ID) return;

      setCollaborators((prev) => {
        const index = prev.findIndex((c) => c.id === senderId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], cursor: payload, lastActive: Date.now() };
          return updated;
        } else {
          // Discover new connected tab/presence
          return [
            ...prev,
            {
              id: senderId,
              name: `Collaborator_${senderId.slice(-4)}`,
              color: ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'][Math.floor(Math.random() * 6)],
              cursor: payload,
              lastActive: Date.now(),
            },
          ];
        }
      });
    });

    sse.addEventListener('elements_modified', (e: any) => {
      const { clientId: senderId, payload } = JSON.parse(e.data);
      if (senderId === CLIENT_ID) return;

      const { modified, deletedIds } = payload;
      setElements((prev) => {
        const next = { ...prev };
        if (modified) {
          Object.keys(modified).forEach((id) => {
            next[id] = modified[id];
          });
        }
        if (deletedIds && Array.isArray(deletedIds)) {
          deletedIds.forEach((id) => {
            delete next[id];
          });
        }
        return next;
      });
    });

    sse.addEventListener('ai_status', (e: any) => {
      const data = JSON.parse(e.data);
      setAiStatus(data);
    });

    sse.addEventListener('presence_leave', (e: any) => {
      const { clientId: leaverId } = JSON.parse(e.data);
      setCollaborators((prev) => prev.filter((c) => c.id !== leaverId));
    });

    return () => {
      sse.close();
    };
  }, [boardId]);

  // Clean up simulated presence when unmounting
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Post dynamic events to server
  const postEvent = async (eventType: string, payload: any) => {
    if (eventType === 'elements_modified') {
      setSyncState('saving');
    }
    try {
      const res = await fetch(`/api/boards/${boardId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          clientId: CLIENT_ID,
          payload,
        }),
      });
      if (res.ok) {
        if (eventType === 'elements_modified') {
          setSyncState('saved');
        }
      } else {
        if (eventType === 'elements_modified') {
          setSyncState('error');
        }
      }
    } catch (err) {
      console.error('Failed to post real-time event to server', err);
      if (eventType === 'elements_modified') {
        setSyncState('error');
      }
    }
  };

  const clearPendingSync = () => {
    pendingSyncRef.current = { modified: {}, deletedIds: [] };
    setPendingCount(0);
  };

  const flushPendingSync = async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const { modified, deletedIds } = pendingSyncRef.current;
    if (Object.keys(modified).length === 0 && deletedIds.length === 0) {
      return;
    }

    const payloadSnapshot = { modified: { ...modified }, deletedIds: [...deletedIds] };
    clearPendingSync();

    await postEvent('elements_modified', payloadSnapshot);
    setBoardRefreshCounter((prev) => prev + 1);
  };

  const queueSyncChange = (modified: Record<string, BoardElement>, deletedIds: string[] = []) => {
    // Accumulate modified
    Object.keys(modified).forEach((id) => {
      pendingSyncRef.current.deletedIds = pendingSyncRef.current.deletedIds.filter(dId => dId !== id);
      pendingSyncRef.current.modified[id] = {
        ...pendingSyncRef.current.modified[id],
        ...modified[id]
      };
    });

    // Accumulate deleted
    deletedIds.forEach((id) => {
      delete pendingSyncRef.current.modified[id];
      if (!pendingSyncRef.current.deletedIds.includes(id)) {
        pendingSyncRef.current.deletedIds.push(id);
      }
    });

    const totalChangesCount = Object.keys(pendingSyncRef.current.modified).length + pendingSyncRef.current.deletedIds.length;
    setPendingCount(totalChangesCount);

    if (saveMode === 'auto') {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      setSyncState('saving');
      syncTimeoutRef.current = setTimeout(() => {
        flushPendingSync();
      }, syncDebounceTiming);
    }
  };

  // Dispatch mouse moves throttled (max 20 updates per second)
  const handleCursorMove = (x: number, y: number) => {
    const now = Date.now();
    if (now - cursorPostThrottleRef.current > 50) {
      cursorPostThrottleRef.current = now;
      postEvent('cursor_moved', { x, y });
    }
  };

  // Modify Board Elements (drag, resize, double-click edits, etc.)
  const handleElementsModified = (modified: Record<string, BoardElement>, deletedIds: string[] = []) => {
    // 1. Update React State optimistically
    setElements((prev) => {
      const next = { ...prev };
      Object.keys(modified).forEach((id) => {
        next[id] = {
          ...next[id],
          ...modified[id],
          version: (next[id]?.version || 0) + 1,
        };
      });
      deletedIds.forEach((id) => {
        delete next[id];
      });

      // Maintain undo stack limit
      setHistory((h) => [...h.slice(-20), next]);
      setRedoStack([]); // reset redo

      return next;
    });

    // 2. Queue or broadcast events to real-time subscribers to handle custom debounce and save modes
    queueSyncChange(modified, deletedIds);
  };

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard controls (Delete / Backspace / Undo / Redo / Group / Ungroup / Canvas Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowCanvasSearch((prev) => !prev);
        return;
      }

      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return; // ignore during text typing
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupSelected();
        } else {
          handleGroupSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, history, redoStack]);

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    
    // Filter out locked elements
    const deletableIds = selectedIds.filter(id => !elements[id]?.locked);
    if (deletableIds.length === 0) return;

    handleElementsModified({}, deletableIds);
    setSelectedIds([]);
  };

  const handleApplyGroupStyle = (styleToApply: Partial<ElementStyle>) => {
    if (selectedIds.length === 0) return;
    const modified: Record<string, BoardElement> = {};
    selectedIds.forEach((id) => {
      const el = elements[id];
      if (el && !el.locked) {
        modified[id] = {
          ...el,
          style: {
            ...el.style,
            ...styleToApply,
          },
          version: (el.version || 1) + 1,
          updatedBy: CLIENT_ID,
        };
      }
    });
    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleToggleLockSelected = () => {
    if (selectedIds.length === 0) return;
    const anyLocked = selectedIds.some(id => elements[id]?.locked);
    const modified: Record<string, BoardElement> = {};
    selectedIds.forEach(id => {
      const el = elements[id];
      if (el) {
        modified[id] = {
          ...el,
          locked: !anyLocked,
        };
      }
    });
    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleBringToFrontSelected = () => {
    if (selectedIds.length === 0) return;
    const allElements = Object.values(elements) as BoardElement[];
    const maxZ = allElements.reduce((max: number, el: BoardElement) => Math.max(max, el.zIndex ?? 0), 0);
    const modified: Record<string, BoardElement> = {};
    selectedIds.forEach((id) => {
      const el = elements[id];
      if (el) {
        modified[id] = {
          ...el,
          zIndex: maxZ + 1,
        };
      }
    });
    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleSendToBackSelected = () => {
    if (selectedIds.length === 0) return;
    const allElements = Object.values(elements) as BoardElement[];
    const minZ = allElements.reduce((min: number, el: BoardElement) => Math.min(min, el.zIndex ?? 0), 0);
    const modified: Record<string, BoardElement> = {};
    selectedIds.forEach((id) => {
      const el = elements[id];
      if (el) {
        modified[id] = {
          ...el,
          zIndex: minZ - 1,
        };
      }
    });
    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return; // need at least initial state

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, current]);
    setElements(previous);

    // Sync state change to other tabs
    const deletedIds = Object.keys(current).filter((id) => !previous[id]);
    const modified = Object.keys(previous).reduce((acc, id) => {
      if (previous[id] !== current[id]) {
        acc[id] = previous[id];
      }
      return acc;
    }, {} as Record<string, BoardElement>);

    queueSyncChange(modified, deletedIds);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, next]);
    setElements(next);

    // Sync forward to database
    queueSyncChange(next, []);
  };

  const handleGroupSelected = () => {
    const validSelection = selectedIds.filter(id => elements[id]?.type !== 'connector');
    if (validSelection.length < 2) return;
    const newGroupId = `group-${Math.random().toString(36).substr(2, 9)}`;
    const modified: Record<string, BoardElement> = {};
    validSelection.forEach(id => {
      const el = elements[id];
      if (el) {
        modified[id] = {
          ...el,
          groupId: newGroupId,
        };
      }
    });
    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleUngroupSelected = () => {
    if (selectedIds.length === 0) return;
    const groupIdsToClear = new Set<string>();
    selectedIds.forEach(id => {
      const el = elements[id];
      if (el && el.groupId) {
        groupIdsToClear.add(el.groupId);
      }
    });

    if (groupIdsToClear.size === 0) return;

    const modified: Record<string, BoardElement> = {};
    (Object.values(elements) as BoardElement[]).forEach(el => {
      if (el.groupId && groupIdsToClear.has(el.groupId)) {
        modified[el.id] = {
          ...el,
          groupId: undefined,
        };
      }
    });

    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleSelectionUpdate = (selected: string[]) => {
    const expanded = new Set<string>();
    selected.forEach(id => {
      expanded.add(id);
      const el = elements[id];
      if (el && el.groupId) {
        (Object.values(elements) as BoardElement[]).forEach(other => {
          if (other.groupId === el.groupId) {
            expanded.add(other.id);
          }
        });
      }
    });
    const finalSelection = Array.from(expanded);
    setSelectedIds(finalSelection);
    postEvent('selection_changed', finalSelection);
  };

  const handlePanToOrigin = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCenterView = () => {
    const allElements = Object.values(elements) as BoardElement[];
    const elementList = allElements.filter((el) => el.type !== 'connector');
    if (elementList.length === 0) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elementList.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });

    const bWidth = maxX - minX || 100;
    const bHeight = maxY - minY || 100;

    const padding = 120;
    const availableWidth = Math.max(200, window.innerWidth - padding * 2);
    const availableHeight = Math.max(200, window.innerHeight - padding * 2);

    const nextZoom = Math.max(0.15, Math.min(2.0, Math.min(availableWidth / bWidth, availableHeight / bHeight)));

    const elementsCenterX = minX + bWidth / 2;
    const elementsCenterY = minY + bHeight / 2;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const nextPanX = screenCenterX - elementsCenterX * nextZoom;
    const nextPanY = screenCenterY - elementsCenterY * nextZoom;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  const handleAutoLayout = () => {
    const list = Object.values(elements) as BoardElement[];
    const nonConnectors = list.filter((el) => el.type !== 'connector' && !el.locked);
    if (nonConnectors.length === 0) return;

    // Determine target nodes to layout
    const hasSelection = selectedIds.length > 0;
    const targetIds = hasSelection 
      ? selectedIds.filter(id => elements[id] && elements[id].type !== 'connector' && !elements[id].locked)
      : nonConnectors.map(n => n.id);

    if (targetIds.length === 0) return;

    const nodeSet = new Set(targetIds);

    // Build DAG adjacency lists
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    targetIds.forEach(id => {
      adj[id] = [];
      inDegree[id] = 0;
    });

    const connectors = list.filter(el => el.type === 'connector');
    connectors.forEach(conn => {
      const { fromId, toId } = conn;
      if (fromId && toId && nodeSet.has(fromId) && nodeSet.has(toId)) {
        adj[fromId].push(toId);
        inDegree[toId] = (inDegree[toId] || 0) + 1;
      }
    });

    // Roots have inDegree = 0
    let roots = targetIds.filter(id => !inDegree[id]);
    if (roots.length === 0) {
      roots = [targetIds[0]];
    }

    // Vertical hierarchy assignment using BFS
    const levels: Record<string, number> = {};
    const queue: string[] = [...roots];
    roots.forEach(r => {
      levels[r] = 0;
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = levels[curr];
      adj[curr].forEach(neighbor => {
        const nextLevel = currLevel + 1;
        if (levels[neighbor] === undefined || levels[neighbor] < nextLevel) {
          levels[neighbor] = nextLevel;
          queue.push(neighbor);
        }
      });
    }

    // Default remaining disconnected components to level 0
    targetIds.forEach(id => {
      if (levels[id] === undefined) {
        levels[id] = 0;
      }
    });

    // Group items by level
    const levelGroups: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, lvl]) => {
      if (!levelGroups[lvl]) {
        levelGroups[lvl] = [];
      }
      levelGroups[lvl].push(id);
    });

    // Align parameters
    const xGap = 200;
    const yGap = 160;

    // Keep layout centered around the average coordinates of the current selection
    let sumX = 0;
    let sumY = 0;
    targetIds.forEach(id => {
      const n = elements[id];
      if (n) {
        sumX += n.x;
        sumY += n.y;
      }
    });
    const centerX = sumX / targetIds.length;
    const centerY = sumY / targetIds.length;

    const modified: Record<string, BoardElement> = {};

    Object.entries(levelGroups).forEach(([lvlStr, ids]) => {
      const lvl = parseInt(lvlStr, 10);
      const levelY = centerY - (Object.keys(levelGroups).length * yGap) / 2 + lvl * yGap;
      const totalLevelWidth = (ids.length - 1) * xGap;
      const startX = centerX - totalLevelWidth / 2;

      ids.forEach((id, idx) => {
        const el = elements[id];
        if (el) {
          modified[id] = {
            ...el,
            x: Math.round(startX + idx * xGap - el.width / 2),
            y: Math.round(levelY - el.height / 2)
          };
        }
      });
    });

    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  const handleApplyTemplate = (templateElements: Record<string, BoardElement>) => {
    setElements(templateElements);
    handleElementsModified(templateElements);

    // Calculate bounding box of loaded non-connectors to focus view
    const list = Object.values(templateElements);
    const nonConnectors = list.filter((el) => el.type !== 'connector');
    if (nonConnectors.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      nonConnectors.forEach((el) => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });

      const bWidth = maxX - minX || 100;
      const bHeight = maxY - minY || 100;
      const padding = 120;
      const availableWidth = Math.max(200, window.innerWidth - padding * 2);
      const availableHeight = Math.max(200, window.innerHeight - padding * 2);

      const nextZoom = Math.max(0.2, Math.min(1.2, Math.min(availableWidth / bWidth, availableHeight / bHeight)));
      const elementsCenterX = minX + bWidth / 2;
      const elementsCenterY = minY + bHeight / 2;
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      const nextPanX = screenCenterX - elementsCenterX * nextZoom;
      const nextPanY = screenCenterY - elementsCenterY * nextZoom;

      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    }
  };

  const handleJumpToElement = (id: string) => {
    const el = elements[id];
    if (!el) return;

    const elementCenterX = el.x + el.width / 2;
    const elementCenterY = el.y + el.height / 2;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const targetZoom = Math.max(0.7, Math.min(1.2, zoom));
    const nextPanX = screenCenterX - elementCenterX * targetZoom;
    const nextPanY = screenCenterY - elementCenterY * targetZoom;

    setZoom(targetZoom);
    setPan({ x: nextPanX, y: nextPanY });
    setSelectedIds([id]);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const matches = (Object.values(elements) as BoardElement[])
      .filter((el: BoardElement) => {
        const textVal = el.text || '';
        return textVal.toLowerCase().includes(query.toLowerCase());
      })
      .map((el: BoardElement) => el.id);

    setSearchMatches(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      handleJumpToElement(matches[0]);
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  const handleSearchNext = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    handleJumpToElement(searchMatches[nextIdx]);
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    handleJumpToElement(searchMatches[prevIdx]);
  };

  // Multi-user / Bots Simulation logic!
  const handleAddSimulatedCollaborator = (name: string, role: 'developer' | 'designer' | 'manager') => {
    const simId = `sim-bot-${role}-${Math.random().toString(36).substr(2, 5)}`;
    const simColors = {
      developer: '#2563eb', // Blue
      designer: '#e11d48',  // Rose
      manager: '#d97706',   // Amber
    };
    const simAvatars = {
      developer: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
      designer: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      manager: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
    };

    const newSim: Collaborator = {
      id: simId,
      name,
      color: simColors[role],
      avatar: simAvatars[role],
      cursor: { x: 300, y: 300 },
      isSimulated: true,
      lastActive: Date.now(),
    };

    // Register simulated bot collaborator
    setCollaborators((prev) => [...prev, newSim]);
    setIsSimulating(true);

    // Boot/Renew the intervals loop
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    simIntervalRef.current = setInterval(() => {
      // Choose a random collaborator to move or draw (prefer simulated bots)
      setCollaborators((prev) => {
        const bots = prev.filter((c) => c.isSimulated);
        if (bots.length === 0) return prev;

        const randomBot = bots[Math.floor(Math.random() * bots.length)];
        const currentCursor = randomBot.cursor || { x: 400, y: 300 };

        // 1. Move cursor smoothly in random vectors
        const dx = (Math.random() - 0.5) * 120;
        const dy = (Math.random() - 0.5) * 120;
        const nextX = Math.max(50, Math.min(1200, currentCursor.x + dx));
        const nextY = Math.max(50, Math.min(800, currentCursor.y + dy));

        // Sync cursor move via event post to Express server as bot
        fetch(`/api/boards/${boardId}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'cursor_moved',
            clientId: randomBot.id,
            payload: { x: nextX, y: nextY },
          }),
        });

        // 2. 15% Chance to perform a helpful whiteboard action
        if (Math.random() < 0.18) {
          const engineeringIdeas = [
            'Let\'s build server-side proxies here!',
            'Need Redis Pub/Sub for scalability.',
            'Store snapshots in Cloud Storage.',
            'Connect Gemini API to summarize logs.',
            'Excellent architecture flow!',
            'Add rate limiter for defense.'
          ];
          const text = engineeringIdeas[Math.floor(Math.random() * engineeringIdeas.length)];
          const id = `sim-sticky-${Math.random().toString(36).substr(2, 5)}`;

          const newSticky: BoardElement = {
            id,
            type: 'sticky',
            x: nextX - 60,
            y: nextY - 60,
            width: 130,
            height: 130,
            text,
            style: {
              fill: randomBot.color === '#e11d48' ? '#ffe4e6' : randomBot.color === '#2563eb' ? '#e0f2fe' : '#fef3c7',
              stroke: randomBot.color,
              textColor: '#0f172a',
              fontSize: 12,
            },
            version: 1,
            updatedBy: randomBot.id,
          };

          // Post elements change to Express server as bot
          fetch(`/api/boards/${boardId}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'elements_modified',
              clientId: randomBot.id,
              payload: { modified: { [id]: newSticky }, deletedIds: [] },
            }),
          });
        }

        // Apply visual coordinate update in state
        return prev.map((c) => (c.id === randomBot.id ? { ...c, cursor: { x: nextX, y: nextY } } : c));
      });
    }, 1500);
  };

  const handleStopSimulatedCollaborators = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setCollaborators((prev) => prev.filter((c) => !c.isSimulated));
    setIsSimulating(false);
  };

  // 1. Spawns pre-configured flowchart shapes at the visual center of the user's viewport
  const handleAddQuickShape = (shapeType: 'process' | 'decision' | 'start-end') => {
    const x = (window.innerWidth / 2 - pan.x) / zoom - 70;
    const y = (window.innerHeight / 2 - pan.y) / zoom - 35;

    const id = `shape-${Math.random().toString(36).substr(2, 9)}`;
    const newElement: BoardElement = {
      id,
      type: 'rectangle',
      x: snapToGrid ? Math.round(x / 24) * 24 : x,
      y: snapToGrid ? Math.round(y / 24) * 24 : y,
      width: shapeType === 'decision' ? 100 : 140,
      height: shapeType === 'decision' ? 100 : 64,
      text: shapeType === 'process' 
        ? 'Process Step' 
        : shapeType === 'decision' 
        ? 'Is Active?' 
        : 'Start / End',
      style: {
        fill: shapeType === 'process' 
          ? '#e0f2fe' 
          : shapeType === 'decision'
          ? '#fef3c7' 
          : '#dcfce7',
        stroke: shapeType === 'process'
          ? '#0284c7' 
          : shapeType === 'decision'
          ? '#d97706' 
          : '#16a34a',
        textColor: shapeType === 'process'
          ? '#0369a1'
          : shapeType === 'decision'
          ? '#b45309'
          : '#15803d',
        fontSize: 13,
        fontFamily: 'sans',
        rotate: shapeType === 'decision' ? 45 : undefined,
        borderRadius: shapeType === 'start-end' ? '9999px' : '6px',
        shapeType,
      },
      version: 1,
      updatedBy: CLIENT_ID,
    };

    handleElementsModified({ [id]: newElement });
    setSelectedIds([id]);
  };

  // 2. Alignment tools: Align Left, Center, Right, Top, Middle, Bottom
  const handleAlignSelected = (alignmentType: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    const nonConnectors = selectedIds.filter(id => elements[id] && elements[id].type !== 'connector' && !elements[id].locked);
    if (nonConnectors.length < 2) return;

    const selectedElements = nonConnectors.map(id => elements[id]);
    const minX = Math.min(...selectedElements.map(el => el.x));
    const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
    const minY = Math.min(...selectedElements.map(el => el.y));
    const maxY = Math.max(...selectedElements.map(el => el.y + el.height));

    const modified: Record<string, BoardElement> = {};

    nonConnectors.forEach(id => {
      const el = elements[id];
      let nextX = el.x;
      let nextY = el.y;

      switch (alignmentType) {
        case 'left':
          nextX = minX;
          break;
        case 'center-h':
          nextX = minX + (maxX - minX) / 2 - el.width / 2;
          break;
        case 'right':
          nextX = maxX - el.width;
          break;
        case 'top':
          nextY = minY;
          break;
        case 'center-v':
          nextY = minY + (maxY - minY) / 2 - el.height / 2;
          break;
        case 'bottom':
          nextY = maxY - el.height;
          break;
      }

      if (nextX !== el.x || nextY !== el.y) {
        modified[id] = {
          ...el,
          x: snapToGrid ? Math.round(nextX / 24) * 24 : nextX,
          y: snapToGrid ? Math.round(nextY / 24) * 24 : nextY,
          version: (el.version || 1) + 1,
          updatedBy: CLIENT_ID,
        };
      }
    });

    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  // 3. Auto-Distribute horizontally or vertically spaced elements
  const handleDistributeSelected = (direction: 'horizontal' | 'vertical') => {
    const nonConnectors = selectedIds.filter(id => elements[id] && elements[id].type !== 'connector' && !elements[id].locked);
    if (nonConnectors.length < 3) return;

    const selectedElements = nonConnectors.map(id => elements[id]);
    const modified: Record<string, BoardElement> = {};

    if (direction === 'horizontal') {
      const sorted = [...selectedElements].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const gapCount = sorted.length - 1;
      const startCenter = first.x + first.width / 2;
      const endCenter = last.x + last.width / 2;
      const step = (endCenter - startCenter) / gapCount;

      sorted.forEach((el, index) => {
        if (index === 0 || index === sorted.length - 1) return;
        const targetCenter = startCenter + step * index;
        const nextX = targetCenter - el.width / 2;
        
        modified[el.id] = {
          ...el,
          x: snapToGrid ? Math.round(nextX / 24) * 24 : nextX,
          version: (el.version || 1) + 1,
          updatedBy: CLIENT_ID,
        };
      });
    } else {
      const sorted = [...selectedElements].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const gapCount = sorted.length - 1;
      const startCenter = first.y + first.height / 2;
      const endCenter = last.y + last.height / 2;
      const step = (endCenter - startCenter) / gapCount;

      sorted.forEach((el, index) => {
        if (index === 0 || index === sorted.length - 1) return;
        const targetCenter = startCenter + step * index;
        const nextY = targetCenter - el.height / 2;

        modified[el.id] = {
          ...el,
          y: snapToGrid ? Math.round(nextY / 24) * 24 : nextY,
          version: (el.version || 1) + 1,
          updatedBy: CLIENT_ID,
        };
      });
    }

    if (Object.keys(modified).length > 0) {
      handleElementsModified(modified);
    }
  };

  return (
    <div className="flex w-screen h-screen bg-slate-50 text-slate-900 select-none overflow-hidden font-sans">
      
      {/* 1. Upper Header Branding bar */}
      <div className="absolute top-4 left-4 right-4 h-14 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg px-4 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/25 animate-pulse">
            <Sparkles size={16} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Collaborative AI Whiteboard</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Active: <strong className="text-slate-700">{boardName}</strong> • {Object.keys(elements).length} nodes
            </p>
          </div>
        </div>

        {/* Global Connection Quality pill & Export SVG button */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Real-time synchronization state feedback */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all duration-300 ${
            syncState === 'saving' 
              ? 'bg-amber-50/75 border-amber-200 text-amber-700 shadow-amber-100/10' 
              : syncState === 'error'
              ? 'bg-rose-50/75 border-rose-200 text-rose-700 shadow-rose-100/10'
              : 'bg-emerald-50/75 border-emerald-200 text-emerald-700 shadow-emerald-100/10'
          }`}>
            {syncState === 'saving' ? (
              <RefreshCw size={12} className="animate-spin text-amber-600" />
            ) : syncState === 'error' ? (
              <AlertCircle size={12} className="text-rose-600 animate-bounce" />
            ) : (
              <svg className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="text-[10px] font-bold tracking-wide uppercase">
              {syncState === 'saving' ? 'Saving...' : syncState === 'error' ? 'Sync Error' : 'All changes saved'}
            </span>
          </div>

          {/* Sync Settings Dropdown and Manual Save Button */}
          {saveMode === 'manual' && pendingCount > 0 && (
            <button
              onClick={() => flushPendingSync()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/20 animate-bounce transition-all cursor-pointer"
              title={`Flush ${pendingCount} pending local changes to database`}
            >
              <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save ({pendingCount})</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowSyncSettings(!showSyncSettings)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                showSyncSettings
                  ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-indigo-600/10'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Configure save modes and sync intervals"
            >
              <Sliders size={13} />
              <span>Sync Settings</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${showSyncSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSyncSettings && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSyncSettings(false)} 
                />
                
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2 select-none">
                    Sync Configuration
                  </div>
                  
                  {/* Save Mode Selector */}
                  <div className="mb-3">
                    <span className="text-[10px] text-slate-500 font-bold mb-1 block">Save Mode</span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => {
                          setSaveMode('auto');
                          // Flush any pending changes immediately upon switching to auto
                          setTimeout(() => flushPendingSync(), 10);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          saveMode === 'auto'
                            ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Automatic
                      </button>
                      <button
                        onClick={() => setSaveMode('manual')}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          saveMode === 'manual'
                            ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {/* Debounce Interval (only for Auto mode) */}
                  {saveMode === 'auto' ? (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                        <span>Sync Debounce Delay</span>
                        <span className="text-indigo-600 font-extrabold">{syncDebounceTiming}ms</span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={5000}
                        step={100}
                        value={syncDebounceTiming}
                        onChange={(e) => setSyncDebounceTiming(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-400 font-medium block mt-1 leading-normal">
                        Delay before auto-broadcasting canvas changes to database.
                      </span>
                    </div>
                  ) : (
                    <div className="mb-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-bold">Manual Save Active</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium mt-1 leading-normal">
                        Your changes are kept locally in-memory. Click the "Save" button to synchronize.
                      </p>
                      {pendingCount > 0 && (
                        <div className="mt-2 flex items-center justify-between text-[10px] font-extrabold text-amber-700 bg-amber-50 rounded-lg p-1">
                          <span>Unsaved: {pendingCount} nodes</span>
                          <button
                            onClick={() => {
                              flushPendingSync();
                              setShowSyncSettings(false);
                            }}
                            className="bg-indigo-600 text-white rounded px-2 py-0.5 text-[9px] hover:bg-indigo-700 cursor-pointer transition-colors"
                          >
                            Save Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Magnetic snap strength toggle */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold mb-1 block">Snap Strength</span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setSnapStrength('strict')}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          snapStrength === 'strict'
                            ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Strict grid-snapping"
                      >
                        Strict
                      </button>
                      <button
                        onClick={() => setSnapStrength('loose')}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          snapStrength === 'loose'
                            ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Magnetic/loose grid-snapping"
                      >
                        Magnetic
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Canvas Theme Selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setCanvasTheme('light')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                canvasTheme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Light background style"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#fdfdfd] border border-slate-300" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setCanvasTheme('dark')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                canvasTheme === 'dark'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Dark background style"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#0f172a] border border-slate-700" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setCanvasTheme('blueprint')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                canvasTheme === 'blueprint'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Blueprint grid style"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#0b2545] border border-blue-800" />
              <span>Blueprint</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="Export full whiteboard"
            >
              <Download size={13} />
              <span>Export</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showExportDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportDropdown(false)} 
                />
                
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200/85 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 select-none">
                    Select Format
                  </div>
                  <button
                    onClick={() => {
                      exportBoardToSVG(boardName, elements);
                      setShowExportDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <FileCode size={13} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="font-bold">Export SVG</span>
                      <span className="text-[9px] text-slate-400 font-normal">Scalable vector graphics</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportBoardToPNG(boardName, elements);
                      setShowExportDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <Image size={13} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="font-bold">Export PNG</span>
                      <span className="text-[9px] text-slate-400 font-normal">2x High-resolution raster</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportBoardToPDF(boardName, elements);
                      setShowExportDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 border-t border-slate-50 transition-colors cursor-pointer"
                  >
                    <FileText size={13} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="font-bold">Export PDF</span>
                      <span className="text-[9px] text-slate-400 font-normal">Multi-page document</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsExportSelecting(true);
                      setExportBoundingBox(null);
                      setShowExportDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer border-t border-slate-100 ${
                      isExportSelecting ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                    }`}
                  >
                    <Maximize2 size={13} className="text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="font-bold">Select Custom Area</span>
                      <span className="text-[9px] text-slate-400 font-normal">Draw bounding box to export</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-[10px] font-bold text-indigo-700 tracking-wider">SOCKET SYNC ACTIVE</span>
          </div>

          <button
            onClick={() => setShowTimelineModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Visualize revision states and restore older versions"
          >
            <History size={13} className="text-slate-500" />
            <span>Timeline</span>
            {history.length > 0 && (
              <span className="flex items-center justify-center bg-indigo-600 text-white rounded-full text-[9px] w-4 h-4 font-black">
                {history.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowPresenterPanel(!showPresenterPanel);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
              showPresenterPanel || isPresenting
                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 font-extrabold shadow-indigo-600/10'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Configure viewports and start interactive slideshow presentations"
          >
            <Play size={13} className={isPresenting ? 'text-white animate-pulse' : 'text-slate-500'} />
            <span>Presenter</span>
          </button>

          <button
            onClick={() => {
              setShowCanvasSearch((prev) => !prev);
              if (showCanvasSearch) {
                setSearchQuery('');
                setSearchMatches([]);
                setCurrentMatchIndex(-1);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
              showCanvasSearch
                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 font-extrabold shadow-indigo-600/10'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Search elements on the whiteboard (Ctrl+F)"
          >
            <Search size={13} className={showCanvasSearch ? 'text-white animate-pulse' : 'text-slate-500'} />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Left panel floating dashboard: Workspaces & listings */}
      <div className="absolute top-22 left-4 bottom-4 w-80 z-10 pointer-events-none flex flex-col gap-4">
        <BoardList
          activeBoardId={boardId}
          onSelectBoard={setBoardId}
          triggerRefresh={boardRefreshCounter}
          onApplyTemplate={handleApplyTemplate}
        />
        <CollaboratorsPanel
          boardId={boardId}
          clientId={CLIENT_ID}
          collaborators={collaborators}
          onAddSimulatedCollaborator={handleAddSimulatedCollaborator}
          onStopSimulatedCollaborators={handleStopSimulatedCollaborators}
          isSimulating={isSimulating}
        />

        {showPresenterPanel && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl p-4 flex flex-col gap-3 pointer-events-auto max-h-[35vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 select-none">
              <div className="flex items-center gap-1.5 text-indigo-600 font-extrabold text-xs">
                <Play size={14} className="fill-indigo-600/10" />
                <span>Presenter Slides Sequence</span>
              </div>
              <button
                onClick={() => setShowPresenterPanel(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* List of existing slides */}
            {slides.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-medium italic py-2 text-center select-none">
                No slides defined yet. Navigate to a region and capture it!
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[16vh] overflow-y-auto pr-1">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150/70 hover:border-indigo-100 group transition-all"
                  >
                    <button
                      onClick={() => handleGoToSlide(idx)}
                      className="flex-1 text-left text-xs font-semibold text-slate-700 hover:text-indigo-600 truncate"
                    >
                      <span className="text-[10px] text-indigo-500 font-extrabold mr-1.5">
                        {idx + 1}.
                      </span>
                      {slide.title}
                    </button>
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete slide"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Capture slide input */}
            <div className="flex items-center gap-1.5 mt-1 border-t border-slate-100 pt-2.5">
              <input
                type="text"
                placeholder="Enter slide name..."
                value={newSlideTitle}
                onChange={(e) => setNewSlideTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCaptureSlide();
                  }
                }}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 font-semibold"
              />
              <button
                onClick={handleCaptureSlide}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                Capture
              </button>
            </div>

            {/* Play Presentation button */}
            {slides.length > 0 && (
              <button
                onClick={() => {
                  setIsPresenting(true);
                  setShowPresenterPanel(false);
                  handleGoToSlide(0);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Play Slideshow</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Center Canvas Drawing Toolbar */}
      <div className="absolute top-22 right-4 z-10 pointer-events-none">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          elementStyle={elementStyle}
          setElementStyle={setElementStyle}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDeleteSelected={handleDeleteSelected}
          hasSelection={selectedIds.length > 0}
          canUndo={history.length > 1}
          canRedo={redoStack.length > 0}
          onGroup={handleGroupSelected}
          onUngroup={handleUngroupSelected}
          canGroup={selectedIds.filter(id => elements[id]?.type !== 'connector').length >= 2}
          canUngroup={selectedIds.some(id => elements[id]?.groupId)}
          gridEnabled={gridEnabled}
          setGridEnabled={setGridEnabled}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          onToggleLock={handleToggleLockSelected}
          isSelectionLocked={selectedIds.length > 0 && selectedIds.some(id => elements[id]?.locked)}
          canToggleLock={selectedIds.length > 0}
          onBringToFront={handleBringToFrontSelected}
          onSendToBack={handleSendToBackSelected}
          canReorderLayers={selectedIds.length > 0}
          onPanToOrigin={handlePanToOrigin}
          onCenterView={handleCenterView}
          onAlignSelected={handleAlignSelected}
          onDistributeSelected={handleDistributeSelected}
          canAlign={selectedIds.filter(id => elements[id] && elements[id].type !== 'connector' && !elements[id].locked).length >= 2}
          canDistribute={selectedIds.filter(id => elements[id] && elements[id].type !== 'connector' && !elements[id].locked).length >= 3}
          onAddQuickShape={handleAddQuickShape}
          selectedCount={selectedIds.length}
          onApplyGroupStyle={handleApplyGroupStyle}
        />
      </div>

      {/* Right panel floating workspace: Gemini AI agents */}
      <div className="absolute top-22 bottom-4 right-52 w-80 z-10 pointer-events-none">
        <SidebarAI
          boardId={boardId}
          clientId={CLIENT_ID}
          selectedElementIds={selectedIds}
          aiStatus={aiStatus}
          setAiStatus={setAiStatus}
          onRefreshBoard={() => loadBoard(boardId)}
        />
      </div>

      {/* 2. Full screen infinite canvas workspace */}
      <div className="flex-1 w-full h-full">
        <WhiteboardCanvas
          boardId={boardId}
          clientId={CLIENT_ID}
          activeTool={activeTool}
          elements={elements}
          selectedIds={selectedIds}
          collaborators={collaborators}
          elementStyle={elementStyle}
          onElementsModified={handleElementsModified}
          onCursorMove={handleCursorMove}
          onSelectionUpdate={handleSelectionUpdate}
          pan={pan}
          setPan={setPan}
          zoom={zoom}
          setZoom={setZoom}
          gridEnabled={gridEnabled}
          snapToGrid={snapToGrid}
          snapStrength={snapStrength}
          theme={canvasTheme}
          isExportSelecting={isExportSelecting}
          exportBoundingBox={exportBoundingBox}
          setExportBoundingBox={setExportBoundingBox}
          onExportSelection={handleExportSelection}
        />
      </div>

      {/* Render interactive viewport Minimap */}
      <Minimap
        elements={elements}
        pan={pan}
        zoom={zoom}
        setPan={setPan}
      />

      {/* Subtle floating keyboard shortcuts tip card */}
      <div className="absolute bottom-4 left-[340px] bg-slate-900/90 backdrop-blur-md text-slate-400 border border-slate-800 rounded-xl px-3 py-1.5 text-[9px] shadow-lg pointer-events-none font-medium flex items-center gap-2">
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Space+Drag</span> Pan
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Scroll</span> Zoom
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Del</span> Delete
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Ctrl+G</span> Group
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Ctrl+Shift+G</span> Ungroup
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Ctrl+Z</span> Undo
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">DblClick</span> Edit Text
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectBoard={setBoardId}
        activeBoardId={boardId}
        setActiveTool={setActiveTool}
        setCanvasTheme={setCanvasTheme}
        setGridEnabled={setGridEnabled}
        setSnapToGrid={setSnapToGrid}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        handlePanToOrigin={handlePanToOrigin}
        handleCenterView={handleCenterView}
        onAutoLayout={handleAutoLayout}
        toggleCanvasSearch={() => setShowCanvasSearch(prev => !prev)}
      />

      {/* Timeline Revision History Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowTimelineModal(false)} 
          />
          
          <div className="relative w-full max-w-5xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-50 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Revision History Timeline</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Scrub through, preview, and restore previous states of the whiteboard elements</p>
                </div>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Timeline Scrubbing Bar */}
            {history.length > 1 && (
              <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>⏪ Baseline Initial</span>
                  <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px] font-black">Scrubber Active</span>
                  <span>Active Live Version ⏩</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={history.length - 1}
                  defaultValue={history.length - 1}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    const stateToRestore = history[idx];
                    if (stateToRestore) {
                      setElements(stateToRestore);
                      postEvent('elements_modified', { modified: stateToRestore, deletedIds: [] });
                      setBoardRefreshCounter((prev) => prev + 1);
                    }
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-ew-resize accent-indigo-600 outline-none"
                />
                <p className="text-[10px] text-center font-semibold text-slate-400">Drag slider above to continuously scrub through time across {history.length} states</p>
              </div>
            )}

            {/* Timeline Body Cards Grid */}
            <div className="flex-1 overflow-y-auto p-6 max-h-[50vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {history.map((histState, idx) => {
                  const isCurrent = idx === history.length - 1;
                  const isBaseline = idx === 0;

                  // Mini render thumbnail calculations inline
                  const renderHistoryThumbnail = (histElements: Record<string, BoardElement>) => {
                    const list = Object.values(histElements).filter(el => el.type !== 'connector');
                    if (list.length === 0) {
                      return (
                        <div className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 font-bold text-[9px] uppercase select-none">
                          <Layers size={14} className="text-slate-300 mb-1" />
                          <span>Empty Workspace</span>
                        </div>
                      );
                    }

                    let minXVal = Infinity;
                    let minYVal = Infinity;
                    let maxXVal = -Infinity;
                    let maxYVal = -Infinity;

                    list.forEach(el => {
                      minXVal = Math.min(minXVal, el.x);
                      minYVal = Math.min(minYVal, el.y);
                      maxXVal = Math.max(maxXVal, el.x + el.width);
                      maxYVal = Math.max(maxYVal, el.y + el.height);
                    });

                    const bWidthVal = maxXVal - minXVal || 1;
                    const bHeightVal = maxYVal - minYVal || 1;

                    const targetWVal = 140;
                    const targetHVal = 90;
                    const scaleVal = Math.min(targetWVal / bWidthVal, targetHVal / bHeightVal, 0.25);

                    const offsetXVal = 10 + (targetWVal - bWidthVal * scaleVal) / 2;
                    const offsetYVal = 10 + (targetHVal - bHeightVal * scaleVal) / 2;

                    return (
                      <div className="w-full h-28 bg-slate-50 rounded-xl border border-slate-200/50 overflow-hidden relative flex items-center justify-center shadow-inner select-none bg-grid-pattern">
                        <svg className="w-full h-full pointer-events-none" viewBox="0 0 160 110">
                          {list.map(el => {
                            const rx = offsetXVal + (el.x - minXVal) * scaleVal;
                            const ry = offsetYVal + (el.y - minYVal) * scaleVal;
                            const rw = el.width * scaleVal;
                            const rh = el.height * scaleVal;

                            const fillVal = el.style?.fill || '#ffffff';
                            const strokeVal = el.style?.stroke || '#475569';

                            if (el.type === 'circle') {
                              return (
                                <circle
                                  key={el.id}
                                  cx={rx + rw / 2}
                                  cy={ry + rh / 2}
                                  r={Math.min(rw, rh) / 2}
                                  fill={fillVal}
                                  stroke={strokeVal}
                                  strokeWidth={1}
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
                                  fill={fillVal}
                                  stroke={strokeVal}
                                  strokeWidth={1}
                                  rx={1}
                                />
                              );
                            } else if (el.type === 'text') {
                              return (
                                <line
                                  key={el.id}
                                  x1={rx}
                                  y1={ry + rh / 2}
                                  x2={rx + rw}
                                  y2={ry + rh / 2}
                                  stroke="#94a3b8"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                />
                              );
                            } else {
                              return (
                                <rect
                                  key={el.id}
                                  x={rx}
                                  y={ry}
                                  width={rw}
                                  height={rh}
                                  fill={fillVal}
                                  stroke={strokeVal}
                                  strokeWidth={1}
                                  rx={1}
                                />
                              );
                            }
                          })}
                        </svg>
                      </div>
                    );
                  };

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setElements(histState);
                        postEvent('elements_modified', { modified: histState, deletedIds: [] });
                        setBoardRefreshCounter((prev) => prev + 1);
                        setShowTimelineModal(false);
                      }}
                      className={`group relative p-3 bg-white border rounded-2xl transition-all cursor-pointer flex flex-col gap-2.5 ${
                        isCurrent 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                          {isBaseline ? '🏁 Base State' : `Revision #${idx}`}
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Active Live
                          </span>
                        )}
                      </div>

                      {renderHistoryThumbnail(histState)}

                      <div className="flex items-center justify-between select-none border-t border-slate-50 pt-2 text-[9px] font-bold text-slate-500">
                        <span>{Object.keys(histState).length} Elements</span>
                        <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                          <span>Restore</span>
                          <ArrowRight size={8} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400 font-semibold select-none">
              <span>Automatic backups trigger on each whiteboard manipulation</span>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-slate-900/10"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Search Box Overlay */}
      {showCanvasSearch && (
        <div className="absolute top-22 right-4 z-30 w-80 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xl rounded-2xl p-3.5 flex flex-col gap-3 animate-in slide-in-from-top-3 duration-200 pointer-events-auto">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Search size={14} className="text-indigo-600" />
              <span>Canvas Elements Search</span>
            </div>
            <button
              onClick={() => {
                setShowCanvasSearch(false);
                setSearchQuery('');
                setSearchMatches([]);
                setCurrentMatchIndex(-1);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search sticky notes & text..."
              className="w-full pl-3 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none placeholder-slate-400 text-slate-800"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchNext();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowCanvasSearch(false);
                  setSearchQuery('');
                  setSearchMatches([]);
                  setCurrentMatchIndex(-1);
                }
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchMatches([]);
                  setCurrentMatchIndex(-1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 select-none">
              <span className="text-[10px] font-bold text-slate-400">
                {searchMatches.length === 0
                  ? 'No matching elements'
                  : `${currentMatchIndex + 1} of ${searchMatches.length} match${searchMatches.length > 1 ? 'es' : ''}`}
              </span>

              {searchMatches.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSearchPrev}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer border border-slate-100"
                    title="Previous match"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={handleSearchNext}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer border border-slate-100"
                    title="Next match (Enter)"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="text-[9px] text-slate-400 font-medium select-none">
            Type query to search and auto-focus elements. Press <strong className="text-slate-500">Enter</strong> to loop through results.
          </div>
        </div>
      )}

      {/* Active Slideshow Presentation HUD overlay */}
      {isPresenting && slides.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-800 shadow-2xl text-white pointer-events-auto animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase select-none">
              PRESENTING MODE
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-1.5 select-none">
            <button
              onClick={() => handleGoToSlide((currentSlideIndex - 1 + slides.length) % slides.length)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer border border-slate-700/50"
              title="Previous slide (Left Arrow)"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="text-xs font-bold px-1.5 min-w-[70px] text-center select-none text-slate-200">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              onClick={() => handleGoToSlide((currentSlideIndex + 1) % slides.length)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer border border-slate-700/50"
              title="Next slide (Right Arrow)"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex flex-col select-none max-w-[200px]">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Current Viewport</span>
            <span className="text-xs font-bold truncate text-slate-100">{slides[currentSlideIndex]?.title}</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <button
            onClick={() => {
              setIsPresenting(false);
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-rose-900/25"
            title="Exit Presentation Mode (Escape)"
          >
            <X size={12} />
            <span>Exit</span>
          </button>
        </div>
      )}
    </div>
  );
}
