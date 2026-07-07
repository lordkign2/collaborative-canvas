import React, { useRef, useState, useEffect } from 'react';
import { Lock, Download, X } from 'lucide-react';
import { BoardElement, ElementType, ElementStyle, Collaborator } from '../types';

// Helper to format URLs and research text into beautiful structured lists and bold headers inside stickies
export const parseSmartStickyContent = (text: string): string => {
  let formatted = text.trim();
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  
  if (urlRegex.test(formatted) && formatted.length < 500) {
    const urls = formatted.match(urlRegex);
    if (urls && urls.length > 0) {
      const parts = formatted.split(urlRegex).map(p => p?.trim()).filter(Boolean);
      let list = `🔗 SOURCE LINKS:\n`;
      urls.forEach((url, i) => {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace('www.', '');
          const label = parts[i] || domain || 'Reference';
          list += `• **${label.toUpperCase()}**\n  ${url}\n`;
        } catch {
          list += `• ${url}\n`;
        }
      });
      return list;
    }
  }

  const lines = formatted.split('\n');
  if (lines.length > 1) {
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // Headings: lines that are short, in all caps or look like sections
      if (trimmed.length > 3 && trimmed.length < 40 && !trimmed.startsWith('-') && !trimmed.startsWith('*') && !trimmed.startsWith('#') && (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':'))) {
        return `### **${trimmed.replace(/:$/, '')}**`;
      }
      
      // List items
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        const content = trimmed.replace(/^[-*•]\s*/, '').trim();
        if (content.includes(':')) {
          const [key, ...rest] = content.split(':');
          return `• **${key.trim()}**: ${rest.join(':').trim()}`;
        }
        return `• ${content}`;
      }

      const listMatch = trimmed.match(/^(\d+\.|\-|•)\s*(.*)/);
      if (listMatch) {
        const content = listMatch[2].trim();
        if (content.includes(':')) {
          const [key, ...rest] = content.split(':');
          return `• **${key.trim()}**: ${rest.join(':').trim()}`;
        }
        return `• ${content}`;
      }

      if (trimmed.includes(':') && !trimmed.startsWith('http')) {
        const [key, ...rest] = trimmed.split(':');
        if (key.length < 30) {
          return `• **${key.trim()}**: ${rest.join(':').trim()}`;
        }
      }

      return trimmed;
    });

    return formattedLines.filter(Boolean).join('\n');
  }

  return text;
};

// Formatted rich text renderer supporting headers, bullets, and bold markers specifically for sticky note component
export const renderFormattedText = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    let element = line;
    let className = "my-0.5 min-h-[1.2em]";
    let isHeader = false;

    if (line.startsWith('### ') || line.startsWith('## ')) {
      element = line.replace(/^(###|##)\s*/, '');
      className += " font-extrabold text-[115%] text-amber-950 tracking-tight mt-1.5 mb-1 text-left w-full";
      isHeader = true;
    }

    let isBullet = false;
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      element = line.replace(/^([•\-*])\s*/, '').trim();
      className += " pl-3 flex items-start gap-1 text-left w-full text-xs font-semibold text-amber-900";
      isBullet = true;
    }

    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(element)) !== null) {
      if (match.index > lastIndex) {
        parts.push(element.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-extrabold text-amber-950">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < element.length) {
      parts.push(element.substring(lastIndex));
    }

    const content = parts.length > 0 ? parts : element;

    if (isBullet) {
      return (
        <div key={i} className={className}>
          <span className="text-amber-600 mr-1 select-none flex-shrink-0">•</span>
          <span className="flex-1">{content}</span>
        </div>
      );
    }

    if (isHeader) {
      return (
        <h4 key={i} className={className}>
          {content}
        </h4>
      );
    }

    return (
      <p key={i} className={`${className} text-left w-full text-xs font-medium text-amber-900`}>
        {content}
      </p>
    );
  });
};

interface WhiteboardCanvasProps {
  boardId: string;
  clientId: string;
  activeTool: ElementType | 'select' | 'pan';
  elements: Record<string, BoardElement>;
  selectedIds: string[];
  collaborators: Collaborator[];
  elementStyle: ElementStyle;
  onElementsModified: (modified: Record<string, BoardElement>, deletedIds?: string[]) => void;
  onCursorMove: (x: number, y: number) => void;
  onSelectionUpdate: (selectedIds: string[]) => void;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  gridEnabled: boolean;
  snapToGrid: boolean;
  snapStrength?: 'loose' | 'strict';
  theme?: 'light' | 'dark' | 'blueprint';
  isExportSelecting?: boolean;
  exportBoundingBox?: { x: number; y: number; width: number; height: number; } | null;
  setExportBoundingBox?: (box: { x: number; y: number; width: number; height: number; } | null) => void;
  onExportSelection?: (format: 'svg' | 'png') => void;
}

export default function WhiteboardCanvas({
  boardId,
  clientId,
  activeTool,
  elements,
  selectedIds,
  collaborators,
  elementStyle,
  onElementsModified,
  onCursorMove,
  onSelectionUpdate,
  pan,
  setPan,
  zoom,
  setZoom,
  gridEnabled,
  snapToGrid,
  snapStrength = 'strict',
  theme = 'light',
  isExportSelecting = false,
  exportBoundingBox = null,
  setExportBoundingBox = () => {},
  onExportSelection = () => {},
}: WhiteboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // elementId
  const [isDrawingConnector, setIsDrawingConnector] = useState<{ fromId: string; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  
  // Selection box / marquee state
  const [selectionMarquee, setSelectionMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Smart snapping guides state
  const [activeXGuides, setActiveXGuides] = useState<number[]>([]);
  const [activeYGuides, setActiveYGuides] = useState<number[]>([]);

  // Drag offsets
  const dragStartOffset = useRef<Record<string, { x: number; y: number }>>({});
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Direct Inline Text Editor state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Comments reply inputs map
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // Spacebar panning state
  const [spacePressed, setSpacePressed] = useState(false);
  const [isDraggingExportBox, setIsDraggingExportBox] = useState(false);

  // Monitor space pressed for pan tool shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Screen-to-Canvas coord converters
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Zoom on wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = 1.1;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Center coordinates for zoom centering
    const canvasMouseX = (mouseX - pan.x) / zoom;
    const canvasMouseY = (mouseY - pan.y) / zoom;

    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    newZoom = Math.max(0.15, Math.min(3.0, newZoom));

    const newPanX = mouseX - canvasMouseX * newZoom;
    const newPanY = mouseY - canvasMouseY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    // Check if clicking inside input or textarea to avoid preventing defaults
    if (editingElementId && (e.target as HTMLElement).closest('.inline-text-editor')) {
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (isExportSelecting) {
      setExportBoundingBox({
        x,
        y,
        width: 0,
        height: 0
      });
      dragStartOffset.current['export-box'] = { x, y };
      setIsDraggingExportBox(true);
      return;
    }

    // 1. Panning Tool Mode (Space key held or Hand tool active)
    if (spacePressed || activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      return;
    }

    // 2. Select / Modify Mode
    if (activeTool === 'select') {
      const clickedTarget = getElementAtCoords(x, y);

      if (clickedTarget) {
        // Double click logic for fast editing
        if (e.detail === 2 && clickedTarget.type !== 'connector') {
          setEditingElementId(clickedTarget.id);
          setEditingText(clickedTarget.text);
          return;
        }

        // Close text editor on other elements if open
        if (editingElementId && editingElementId !== clickedTarget.id) {
          saveEditingText();
        }

        // If clicked target is not already selected, select it
        if (!selectedIds.includes(clickedTarget.id)) {
          if (e.shiftKey) {
            onSelectionUpdate([...selectedIds, clickedTarget.id]);
          } else {
            onSelectionUpdate([clickedTarget.id]);
          }
        }

        // Initialize Drag Offsets
        const targetsToDrag = selectedIds.includes(clickedTarget.id) ? selectedIds : [clickedTarget.id];
        const hasUnlockedTargets = targetsToDrag.some(id => !elements[id]?.locked);
        if (hasUnlockedTargets) {
          dragStartOffset.current = {};
          targetsToDrag.forEach(id => {
            const el = elements[id];
            if (el && !el.locked) {
              dragStartOffset.current[id] = {
                x: el.x - x,
                y: el.y - y
              };
            }
          });

          setIsDragging(true);
        }
      } else {
        // Clicked on empty space: Close editor and clear selection
        if (editingElementId) saveEditingText();
        onSelectionUpdate([]);

        // Start marquee marquee selection
        setSelectionMarquee({
          startX: x,
          startY: y,
          currentX: x,
          currentY: y
        });
      }
      return;
    }

    // 3. Drawing connector
    if (activeTool === 'connector') {
      const startNode = getElementAtCoords(x, y);
      if (startNode && startNode.type !== 'connector') {
        const cx = startNode.x + startNode.width / 2;
        const cy = startNode.y + startNode.height / 2;
        setIsDrawingConnector({
          fromId: startNode.id,
          startX: cx,
          startY: cy,
          currentX: cx,
          currentY: cy
        });
      }
      return;
    }

    // 4. Shape / Sticky / Label Creation Mode
    if (['rectangle', 'circle', 'sticky', 'text', 'comment'].includes(activeTool)) {
      if (editingElementId) saveEditingText();

      const width = (activeTool as any) === 'comment' ? 260 : (activeTool as any) === 'sticky' ? 130 : (activeTool as any) === 'text' ? 120 : 160;
      const height = (activeTool as any) === 'comment' ? 280 : (activeTool as any) === 'sticky' ? 130 : (activeTool as any) === 'text' ? 40 : 80;
      
      const newElId = `el-${Math.random().toString(36).substr(2, 9)}`;

      // Apply style presets
      let defaultFill = elementStyle.fill || '#eef2ff';
      let defaultStroke = elementStyle.stroke || '#6366f1';
      let defaultTextColor = elementStyle.textColor || '#1e1b4b';

      if ((activeTool as any) === 'sticky') {
        defaultFill = elementStyle.fill === '#ffffff' ? '#fef3c7' : elementStyle.fill || '#fef3c7'; // default yellow stickies
        defaultStroke = elementStyle.stroke || '#d97706';
        defaultTextColor = '#78350f';
      } else if ((activeTool as any) === 'text') {
        defaultFill = 'transparent';
        defaultStroke = 'transparent';
        defaultTextColor = elementStyle.textColor || '#0f172a';
      } else if ((activeTool as any) === 'comment') {
        const localCollaborator = collaborators.find(c => c.id === clientId);
        const authorName = localCollaborator ? localCollaborator.name.replace(' (You)', '') : 'User';
        const authorColor = localCollaborator ? localCollaborator.color : '#6366f1';
        
        defaultFill = '#ffffff';
        defaultStroke = authorColor;
        defaultTextColor = '#0f172a';

        const commentData = {
          author: authorName,
          color: authorColor,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: 'Add feedback comment...',
          replies: [],
          resolved: false
        };

        const newEl: BoardElement = {
          id: newElId,
          type: 'comment' as any,
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          text: JSON.stringify(commentData),
          style: {
            ...elementStyle,
            fill: defaultFill,
            stroke: defaultStroke,
            textColor: defaultTextColor,
            fontSize: 12,
            fontFamily: 'sans'
          },
          version: 1
        };

        onElementsModified({ [newElId]: newEl });
        onSelectionUpdate([newElId]);
        return;
      }

      const newEl: BoardElement = {
        id: newElId,
        type: activeTool as ElementType,
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
        text: activeTool === 'sticky' ? 'Sticky Note idea' : activeTool === 'text' ? 'Text label' : 'Double click to edit',
        style: {
          ...elementStyle,
          fill: defaultFill,
          stroke: defaultStroke,
          textColor: defaultTextColor,
          fontSize: elementStyle.fontSize || 13,
          fontFamily: elementStyle.fontFamily || 'sans'
        },
        version: 1
      };

      onElementsModified({ [newElId]: newEl });
      onSelectionUpdate([newElId]);
      
      // Open inline text editor immediately for sticky/text labels
      setEditingElementId(newElId);
      setEditingText(newEl.text);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Report cursor position for multiplayer syncing
    const { x: cx, y: cy } = getCanvasCoords(e.clientX, e.clientY);
    onCursorMove(cx, cy);

    if (isDraggingExportBox) {
      const start = dragStartOffset.current['export-box'];
      if (start) {
        const minX = Math.min(start.x, cx);
        const minY = Math.min(start.y, cy);
        const maxX = Math.max(start.x, cx);
        const maxY = Math.max(start.y, cy);
        setExportBoundingBox({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        });
      }
      return;
    }

    // 1. Hand panning
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 2. Dragging elements
    if (isDragging && !isResizing) {
      const updatedElements: Record<string, BoardElement> = {};
      
      let deltaX = 0;
      let deltaY = 0;
      let xGuidesList: number[] = [];
      let yGuidesList: number[] = [];

      if (selectedIds.length > 0) {
        const leadId = selectedIds[0];
        const leadEl = elements[leadId];
        const leadOffset = dragStartOffset.current[leadId];
        if (leadEl && leadOffset) {
          const rawLeadX = cx + leadOffset.x;
          const rawLeadY = cy + leadOffset.y;

          // Grid snapping fallback
          let snappedLeadX = rawLeadX;
          let snappedLeadY = rawLeadY;
          let xSnapFound = false;
          let ySnapFound = false;

          if (snapToGrid) {
            const strictX = Math.round(rawLeadX / 24) * 24;
            const strictY = Math.round(rawLeadY / 24) * 24;
            if (snapStrength === 'strict') {
              snappedLeadX = strictX;
              snappedLeadY = strictY;
            } else {
              // Loose snapping: Snap to grid line only if within 8px
              snappedLeadX = Math.abs(rawLeadX - strictX) < 8 ? strictX : rawLeadX;
              snappedLeadY = Math.abs(rawLeadY - strictY) < 8 ? strictY : rawLeadY;
            }
          } else {
            snappedLeadX = Math.round(rawLeadX / 5) * 5;
            snappedLeadY = Math.round(rawLeadY / 5) * 5;

            const otherElements = Object.values(elements).filter(
              (o) => !selectedIds.includes(o.id) && o.type !== 'connector'
            );

            const snapThreshold = 10;

            // X alignments (Left, Center, Right)
            let minXDiff = snapThreshold;
            const anchorLeft = rawLeadX;
            const anchorCenterX = rawLeadX + leadEl.width / 2;
            const anchorRight = rawLeadX + leadEl.width;

            for (const other of otherElements) {
              const otherLeft = other.x;
              const otherCenterX = other.x + other.width / 2;
              const otherRight = other.x + other.width;

              // LL (Left alignment with Left)
              if (Math.abs(anchorLeft - otherLeft) < minXDiff) {
                minXDiff = Math.abs(anchorLeft - otherLeft);
                snappedLeadX = otherLeft;
                xGuidesList = [otherLeft];
                xSnapFound = true;
              }
              // LC (Left alignment with Center)
              if (Math.abs(anchorLeft - otherCenterX) < minXDiff) {
                minXDiff = Math.abs(anchorLeft - otherCenterX);
                snappedLeadX = otherCenterX;
                xGuidesList = [otherCenterX];
                xSnapFound = true;
              }
              // LR (Left alignment with Right)
              if (Math.abs(anchorLeft - otherRight) < minXDiff) {
                minXDiff = Math.abs(anchorLeft - otherRight);
                snappedLeadX = otherRight;
                xGuidesList = [otherRight];
                xSnapFound = true;
              }

              // CL (Center alignment with Left)
              if (Math.abs(anchorCenterX - otherLeft) < minXDiff) {
                minXDiff = Math.abs(anchorCenterX - otherLeft);
                snappedLeadX = otherLeft - leadEl.width / 2;
                xGuidesList = [otherLeft];
                xSnapFound = true;
              }
              // CC (Center alignment with Center)
              if (Math.abs(anchorCenterX - otherCenterX) < minXDiff) {
                minXDiff = Math.abs(anchorCenterX - otherCenterX);
                snappedLeadX = otherCenterX - leadEl.width / 2;
                xGuidesList = [otherCenterX];
                xSnapFound = true;
              }
              // CR (Center alignment with Right)
              if (Math.abs(anchorCenterX - otherRight) < minXDiff) {
                minXDiff = Math.abs(anchorCenterX - otherRight);
                snappedLeadX = otherRight - leadEl.width / 2;
                xGuidesList = [otherRight];
                xSnapFound = true;
              }

              // RL (Right alignment with Left)
              if (Math.abs(anchorRight - otherLeft) < minXDiff) {
                minXDiff = Math.abs(anchorRight - otherLeft);
                snappedLeadX = otherLeft - leadEl.width;
                xGuidesList = [otherLeft];
                xSnapFound = true;
              }
              // RC (Right alignment with Center)
              if (Math.abs(anchorRight - otherCenterX) < minXDiff) {
                minXDiff = Math.abs(anchorRight - otherCenterX);
                snappedLeadX = otherCenterX - leadEl.width;
                xGuidesList = [otherCenterX];
                xSnapFound = true;
              }
              // RR (Right alignment with Right)
              if (Math.abs(anchorRight - otherRight) < minXDiff) {
                minXDiff = Math.abs(anchorRight - otherRight);
                snappedLeadX = otherRight - leadEl.width;
                xGuidesList = [otherRight];
                xSnapFound = true;
              }
            }

            // Y alignments (Top, Center, Bottom)
            let minYDiff = snapThreshold;
            const anchorTop = rawLeadY;
            const anchorCenterY = rawLeadY + leadEl.height / 2;
            const anchorBottom = rawLeadY + leadEl.height;

            for (const other of otherElements) {
              const otherTop = other.y;
              const otherCenterY = other.y + other.height / 2;
              const otherBottom = other.y + other.height;

              // TT (Top with Top)
              if (Math.abs(anchorTop - otherTop) < minYDiff) {
                minYDiff = Math.abs(anchorTop - otherTop);
                snappedLeadY = otherTop;
                yGuidesList = [otherTop];
                ySnapFound = true;
              }
              // TC (Top with Center)
              if (Math.abs(anchorTop - otherCenterY) < minYDiff) {
                minYDiff = Math.abs(anchorTop - otherCenterY);
                snappedLeadY = otherCenterY;
                yGuidesList = [otherCenterY];
                ySnapFound = true;
              }
              // TB (Top with Bottom)
              if (Math.abs(anchorTop - otherBottom) < minYDiff) {
                minYDiff = Math.abs(anchorTop - otherBottom);
                snappedLeadY = otherBottom;
                yGuidesList = [otherBottom];
                ySnapFound = true;
              }

              // CT (Center with Top)
              if (Math.abs(anchorCenterY - otherTop) < minYDiff) {
                minYDiff = Math.abs(anchorCenterY - otherTop);
                snappedLeadY = otherTop - leadEl.height / 2;
                yGuidesList = [otherTop];
                ySnapFound = true;
              }
              // CC (Center with Center)
              if (Math.abs(anchorCenterY - otherCenterY) < minYDiff) {
                minYDiff = Math.abs(anchorCenterY - otherCenterY);
                snappedLeadY = otherCenterY - leadEl.height / 2;
                yGuidesList = [otherCenterY];
                ySnapFound = true;
              }
              // CB (Center with Bottom)
              if (Math.abs(anchorCenterY - otherBottom) < minYDiff) {
                minYDiff = Math.abs(anchorCenterY - otherBottom);
                snappedLeadY = otherBottom - leadEl.height / 2;
                yGuidesList = [otherBottom];
                ySnapFound = true;
              }

              // BT (Bottom with Top)
              if (Math.abs(anchorBottom - otherTop) < minYDiff) {
                minYDiff = Math.abs(anchorBottom - otherTop);
                snappedLeadY = otherTop - leadEl.height;
                yGuidesList = [otherTop];
                ySnapFound = true;
              }
              // BC (Bottom with Center)
              if (Math.abs(anchorBottom - otherCenterY) < minYDiff) {
                minYDiff = Math.abs(anchorBottom - otherCenterY);
                snappedLeadY = otherCenterY - leadEl.height;
                yGuidesList = [otherCenterY];
                ySnapFound = true;
              }
              // BB (Bottom with Bottom)
              if (Math.abs(anchorBottom - otherBottom) < minYDiff) {
                minYDiff = Math.abs(anchorBottom - otherBottom);
                snappedLeadY = otherBottom - leadEl.height;
                yGuidesList = [otherBottom];
                ySnapFound = true;
              }
            }
          }

          deltaX = snappedLeadX - leadEl.x;
          deltaY = snappedLeadY - leadEl.y;

          setActiveXGuides(xSnapFound ? xGuidesList : []);
          setActiveYGuides(ySnapFound ? yGuidesList : []);
        }

        selectedIds.forEach((id) => {
          const el = elements[id];
          if (el && !el.locked) {
            updatedElements[id] = {
              ...el,
              x: el.x + deltaX,
              y: el.y + deltaY,
            };
          }
        });
      }

      if (Object.keys(updatedElements).length > 0) {
        onElementsModified(updatedElements);
      }
      return;
    }

    // 3. Resizing element
    if (isResizing) {
      const el = elements[isResizing];
      if (el && !el.locked) {
        const rawWidth = cx - el.x;
        const rawHeight = cy - el.y;

        let snappedWidth = rawWidth;
        let snappedHeight = rawHeight;
        let xSnapFound = false;
        let ySnapFound = false;
        let xGuidesList: number[] = [];
        let yGuidesList: number[] = [];

        if (snapToGrid) {
          const strictW = Math.round(rawWidth / 24) * 24;
          const strictH = Math.round(rawHeight / 24) * 24;
          if (snapStrength === 'strict') {
            snappedWidth = strictW;
            snappedHeight = strictH;
          } else {
            // Loose snapping: Snap to grid line only if within 8px
            snappedWidth = Math.abs(rawWidth - strictW) < 8 ? strictW : rawWidth;
            snappedHeight = Math.abs(rawHeight - strictH) < 8 ? strictH : rawHeight;
          }
        } else {
          snappedWidth = Math.round(rawWidth / 5) * 5;
          snappedHeight = Math.round(rawHeight / 5) * 5;

          const otherElements = Object.values(elements).filter(
            (o) => o.id !== isResizing && o.type !== 'connector'
          );

          const snapThreshold = 10;

          // snapped right edge `el.x + rawWidth`
          let minXDiff = snapThreshold;
          const currentRight = el.x + rawWidth;
          for (const other of otherElements) {
            const otherLeft = other.x;
            const otherCenterX = other.x + other.width / 2;
            const otherRight = other.x + other.width;

            if (Math.abs(currentRight - otherLeft) < minXDiff) {
              minXDiff = Math.abs(currentRight - otherLeft);
              snappedWidth = otherLeft - el.x;
              xGuidesList = [otherLeft];
              xSnapFound = true;
            }
            if (Math.abs(currentRight - otherCenterX) < minXDiff) {
              minXDiff = Math.abs(currentRight - otherCenterX);
              snappedWidth = otherCenterX - el.x;
              xGuidesList = [otherCenterX];
              xSnapFound = true;
            }
            if (Math.abs(currentRight - otherRight) < minXDiff) {
              minXDiff = Math.abs(currentRight - otherRight);
              snappedWidth = otherRight - el.x;
              xGuidesList = [otherRight];
              xSnapFound = true;
            }
          }

          // snapped bottom edge `el.y + rawHeight`
          let minYDiff = snapThreshold;
          const currentBottom = el.y + rawHeight;
          for (const other of otherElements) {
            const otherTop = other.y;
            const otherCenterY = other.y + other.height / 2;
            const otherBottom = other.y + other.height;

            if (Math.abs(currentBottom - otherTop) < minYDiff) {
              minYDiff = Math.abs(currentBottom - otherTop);
              snappedHeight = otherTop - el.y;
              yGuidesList = [otherTop];
              ySnapFound = true;
            }
            if (Math.abs(currentBottom - otherCenterY) < minYDiff) {
              minYDiff = Math.abs(currentBottom - otherCenterY);
              snappedHeight = otherCenterY - el.y;
              yGuidesList = [otherCenterY];
              ySnapFound = true;
            }
            if (Math.abs(currentBottom - otherBottom) < minYDiff) {
              minYDiff = Math.abs(currentBottom - otherBottom);
              snappedHeight = otherBottom - el.y;
              yGuidesList = [otherBottom];
              ySnapFound = true;
            }
          }
        }

        setActiveXGuides(xSnapFound ? xGuidesList : []);
        setActiveYGuides(ySnapFound ? yGuidesList : []);

        onElementsModified({
          [isResizing]: {
            ...el,
            width: Math.max(40, snappedWidth),
            height: Math.max(30, snappedHeight)
          }
        });
      }
      return;
    }

    // 4. Drawing Connection Line
    if (isDrawingConnector) {
      setIsDrawingConnector(prev => prev ? {
        ...prev,
        currentX: cx,
        currentY: cy
      } : null);
      return;
    }

    // 5. Drawing Marquee frame
    if (selectionMarquee) {
      setSelectionMarquee(prev => prev ? {
        ...prev,
        currentX: cx,
        currentY: cy
      } : null);
      return;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    setIsDragging(false);
    setIsResizing(null);
    setActiveXGuides([]);
    setActiveYGuides([]);

    if (isDraggingExportBox) {
      setIsDraggingExportBox(false);
      return;
    }

    // Complete Connection creation
    if (isDrawingConnector) {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const endNode = getElementAtCoords(x, y);

      if (endNode && endNode.id !== isDrawingConnector.fromId && endNode.type !== 'connector') {
        const id = `conn-${Math.random().toString(36).substr(2, 9)}`;
        const newConn: BoardElement = {
          id,
          type: 'connector',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          text: 'Relation',
          style: {
            stroke: elementStyle.stroke || '#64748b',
            strokeWidth: 2,
            textColor: '#475569',
            fontSize: 12,
            fontFamily: elementStyle.fontFamily || 'sans'
          },
          fromId: isDrawingConnector.fromId,
          toId: endNode.id,
          version: 1
        };
        onElementsModified({ [id]: newConn });
        onSelectionUpdate([id]);
      }
      setIsDrawingConnector(null);
    }

    // Evaluate Marquee selection contents
    if (selectionMarquee) {
      const x1 = Math.min(selectionMarquee.startX, selectionMarquee.currentX);
      const y1 = Math.min(selectionMarquee.startY, selectionMarquee.currentY);
      const x2 = Math.max(selectionMarquee.startX, selectionMarquee.currentX);
      const y2 = Math.max(selectionMarquee.startY, selectionMarquee.currentY);

      // Select elements inside bounds
      const matchedIds: string[] = [];
      Object.values(elements).forEach(el => {
        if (el.type === 'connector') return; // skip connectors
        const elCx = el.x + el.width / 2;
        const elCy = el.y + el.height / 2;
        if (elCx >= x1 && elCx <= x2 && elCy >= y1 && elCy <= y2) {
          matchedIds.push(el.id);
        }
      });

      onSelectionUpdate(matchedIds);
      setSelectionMarquee(null);
    }
  };

  // Helper to fetch element at location
  const getElementAtCoords = (x: number, y: number): BoardElement | null => {
    const list = Object.values(elements);
    // Search backward to fetch top elements first
    for (let i = list.length - 1; i >= 0; i--) {
      const el = list[i];
      if (el.type === 'connector') continue; // connectors handled differently
      if (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      ) {
        return el;
      }
    }
    return null;
  };

  const saveEditingText = () => {
    if (!editingElementId) return;
    const el = elements[editingElementId];
    if (el) {
      const parsedText = el.type === 'sticky' ? parseSmartStickyContent(editingText) : editingText;
      onElementsModified({
        [editingElementId]: {
          ...el,
          text: parsedText,
        }
      });
    }
    setEditingElementId(null);
    setEditingText('');
  };

  // Connection calculations (pointing exactly edge-to-edge)
  const calculateConnectorPoints = (conn: BoardElement) => {
    const fromEl = elements[conn.fromId || ''];
    const toEl = elements[conn.toId || ''];
    if (!fromEl || !toEl) return null;

    // Center coordinates
    const x1 = fromEl.x + fromEl.width / 2;
    const y1 = fromEl.y + fromEl.height / 2;
    const x2 = toEl.x + toEl.width / 2;
    const y2 = toEl.y + toEl.height / 2;

    // Vector direction
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);

    if (length === 0) return { x1, y1, x2, y2, mx: x1, my: y1 };

    const ux = dx / length;
    const uy = dy / length;

    // Determine intersection margins to avoid clipping inside target shapes
    const fromMargin = 12;
    const toMargin = 15;

    const startX = x1 + (fromEl.width / 2) * Math.sign(ux);
    const startY = y1 + (fromEl.height / 2) * Math.sign(uy);

    // Compute direct intersection or midpoints
    return {
      x1: x1 + ux * (fromEl.width / 2),
      y1: y1 + uy * (fromEl.height / 2),
      x2: x2 - ux * (toEl.width / 2 + toMargin),
      y2: y2 - uy * (toEl.height / 2 + toMargin),
      mx: x1 + dx * 0.5,
      my: y1 + dy * 0.5
    };
  };

  const sortedElements = React.useMemo(() => {
    return Object.values(elements).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  }, [elements]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        backgroundColor: theme === 'blueprint' ? '#0b2545' : theme === 'dark' ? '#0f172a' : '#fdfdfd'
      }}
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-300 ${
        spacePressed || activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Absolute Infinite Dot Grid Container */}
      {gridEnabled && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            backgroundImage: theme === 'blueprint'
              ? 'linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
              : theme === 'dark'
              ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px)'
              : 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        />
      )}

      {/* SVG rendering surface for board objects, links, and highlights */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={theme === 'light' ? '#64748b' : '#94a3b8'} />
          </marker>
        </defs>

        {/* Render Connection Connectors */}
        {sortedElements.map((el) => {
          if (el.type !== 'connector') return null;
          const points = calculateConnectorPoints(el);
          if (!points) return null;

          const isSelected = selectedIds.includes(el.id);

          return (
            <g key={el.id} className="pointer-events-auto cursor-pointer">
              {/* Thick transparent interactive area for easier selection hover */}
              <line
                x1={points.x1}
                y1={points.y1}
                x2={points.x2}
                y2={points.y2}
                stroke="transparent"
                strokeWidth={14}
                className="pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectionUpdate([el.id]);
                }}
              />
              <line
                x1={points.x1}
                y1={points.y1}
                x2={points.x2}
                y2={points.y2}
                stroke={isSelected ? '#6366f1' : el.style.stroke || (theme === 'light' ? '#64748b' : '#94a3b8')}
                strokeWidth={el.style.strokeWidth || 2}
                strokeDasharray={el.style.strokeDasharray}
                markerEnd="url(#arrowhead)"
              />
              {/* Optional connector text label */}
              {el.text && (
                <g transform={`translate(${points.mx}, ${points.my})`}>
                  <rect
                    x={-45}
                    y={-10}
                    width={90}
                    height={20}
                    fill="#ffffff"
                    rx={4}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="middle"
                    y={4}
                    fontSize={el.style.fontSize || 10}
                    fontFamily={el.style.fontFamily === 'mono' ? 'JetBrains Mono' : 'Inter'}
                    fill="#475569"
                    fontWeight="bold"
                  >
                    {el.text}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render smart snapping guides */}
        {activeXGuides.map((xVal, idx) => (
          <line
            key={`guide-x-${idx}`}
            x1={xVal}
            y1={-10000}
            x2={xVal}
            y2={10000}
            stroke="#ef4444"
            strokeWidth={1.5 / zoom}
            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
          />
        ))}
        {activeYGuides.map((yVal, idx) => (
          <line
            key={`guide-y-${idx}`}
            x1={-10000}
            y1={yVal}
            x2={10000}
            y2={yVal}
            stroke="#ef4444"
            strokeWidth={1.5 / zoom}
            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
          />
        ))}
      </svg>

      {/* Render HTML elements (rectangles, sticky notes, overlay UI, indicators) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {sortedElements.map((el) => {
          if (el.type === 'connector') return null;

          const isSelected = selectedIds.includes(el.id);
          const isEditing = editingElementId === el.id;

          // Compute style classes based on tool type
          let fontClass = 'font-sans';
          if (el.style.fontFamily === 'mono') fontClass = 'font-mono';
          else if (el.style.fontFamily === 'serif') fontClass = 'font-serif';

          if (el.type === 'comment') {
            let commentData: any = null;
            try {
              commentData = JSON.parse(el.text);
            } catch (e) {
              commentData = {
                author: 'User',
                color: el.style.stroke || '#6366f1',
                timestamp: 'Just now',
                content: el.text,
                replies: [],
                resolved: false
              };
            }

            const localCollaborator = collaborators.find(c => c.id === clientId);
            const currentAuthorName = localCollaborator ? localCollaborator.name.replace(' (You)', '') : 'User';
            const currentAuthorColor = localCollaborator ? localCollaborator.color : '#6366f1';

            const handleAddReply = (e: React.FormEvent, replyText: string) => {
              e.preventDefault();
              if (!replyText.trim()) return;

              const newReply = {
                author: currentAuthorName,
                color: currentAuthorColor,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: replyText.trim()
              };

              const updatedData = {
                ...commentData,
                replies: [...(commentData.replies || []), newReply]
              };

              onElementsModified({
                [el.id]: {
                  ...el,
                  text: JSON.stringify(updatedData)
                }
              });

              setReplyInputs(prev => ({ ...prev, [el.id]: '' }));
            };

            const handleToggleResolved = (e: React.MouseEvent) => {
              e.stopPropagation();
              const updatedData = {
                ...commentData,
                resolved: !commentData.resolved
              };

              onElementsModified({
                [el.id]: {
                  ...el,
                  text: JSON.stringify(updatedData)
                }
              });
            };

            const handleEditMainContent = (newText: string) => {
              const updatedData = {
                ...commentData,
                content: newText
              };
              onElementsModified({
                [el.id]: {
                  ...el,
                  text: JSON.stringify(updatedData)
                }
              });
            };

            const handleToggleReaction = (emoji: string) => {
              const currentReactions = commentData.reactions || {};
              const usersWhoReacted = currentReactions[emoji] || [];
              
              let newUsers: string[];
              if (usersWhoReacted.includes(currentAuthorName)) {
                newUsers = usersWhoReacted.filter((u: string) => u !== currentAuthorName);
              } else {
                newUsers = [...usersWhoReacted, currentAuthorName];
              }

              const updatedReactions = {
                ...currentReactions,
                [emoji]: newUsers
              };

              if (newUsers.length === 0) {
                delete updatedReactions[emoji];
              }

              const updatedData = {
                ...commentData,
                reactions: updatedReactions
              };

              onElementsModified({
                [el.id]: {
                  ...el,
                  text: JSON.stringify(updatedData)
                }
              });
            };

            return (
              <div
                key={el.id}
                className={`absolute p-4 flex flex-col bg-white border rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 pointer-events-auto ${
                  commentData.resolved 
                    ? 'border-emerald-500 bg-emerald-50/10 opacity-70' 
                    : isSelected 
                    ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-indigo-600/5' 
                    : 'border-slate-200/90'
                }`}
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  fontFamily: 'sans-serif'
                }}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('input') || target.closest('button') || target.closest('.comment-thread-scroll')) {
                    e.stopPropagation();
                  }
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 select-none">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: commentData.color || '#6366f1' }} 
                    />
                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[100px]">
                      {commentData.author}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {commentData.timestamp}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleToggleResolved(e)}
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all border cursor-pointer ${
                      commentData.resolved
                        ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {commentData.resolved ? '✓ Resolved' : 'Resolve'}
                  </button>
                </div>

                {/* Main Comment Text */}
                <div className="text-slate-800 text-xs font-semibold leading-relaxed mb-2 flex-shrink-0">
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => {
                        handleEditMainContent(editingText);
                        setEditingElementId(null);
                      }}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded p-1.5 outline-none resize-none focus:border-indigo-500 text-slate-800"
                    />
                  ) : (
                    <div 
                      className="hover:bg-slate-50 p-1 rounded cursor-pointer transition-colors break-words"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (el.locked) return;
                        setEditingElementId(el.id);
                        setEditingText(commentData.content);
                      }}
                      title="Double click to edit comment text"
                    >
                      {commentData.content}
                    </div>
                  )}
                </div>

                {/* Reactions Section */}
                <div className="flex flex-wrap items-center gap-1 mb-2 select-none">
                  {Object.entries(commentData.reactions || {}).map(([emoji, users]: [string, any]) => {
                    const hasReacted = Array.isArray(users) && users.includes(currentAuthorName);
                    return (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(emoji);
                        }}
                        className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-lg border transition-all cursor-pointer ${
                          hasReacted
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold shadow-sm'
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                        }`}
                        title={`Reacted by: ${Array.isArray(users) ? users.join(', ') : ''}`}
                      >
                        <span>{emoji}</span>
                        <span className="text-[9px] text-slate-500 font-bold">{Array.isArray(users) ? users.length : 0}</span>
                      </button>
                    );
                  })}

                  <div className="relative group/react">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border border-dashed border-slate-200 flex items-center justify-center"
                      title="Add reaction"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    <div className="absolute left-0 bottom-full mb-1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg rounded-xl p-1 flex gap-1 hidden group-hover/react:flex z-40 animate-in fade-in slide-in-from-bottom-1 duration-150 pointer-events-auto">
                      {['👍', '❤️', '🎉', '🚀', '💡'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(emoji);
                          }}
                          className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded-md text-xs cursor-pointer hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Replies list */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 mb-2 scrollbar-thin comment-thread-scroll">
                  {(commentData.replies || []).map((rep: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold text-slate-500 select-none">
                        <span 
                          className="w-1 h-1 rounded-full" 
                          style={{ backgroundColor: rep.color || '#cbd5e1' }} 
                        />
                        <span className="text-slate-700 font-extrabold">{rep.author}</span>
                        <span className="font-normal text-slate-400">{rep.timestamp}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium break-all leading-normal">
                        {rep.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form 
                  onSubmit={(e) => {
                    handleAddReply(e, replyInputs[el.id] || '');
                  }}
                  className="mt-auto pt-2 border-t border-slate-100 flex gap-1.5 flex-shrink-0"
                >
                  <input
                    type="text"
                    value={replyInputs[el.id] || ''}
                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [el.id]: e.target.value }))}
                    placeholder="Reply..."
                    className="flex-1 min-w-0 text-[11px] bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 text-slate-700 font-medium"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex-shrink-0"
                  >
                    Reply
                  </button>
                </form>

                {/* Selection Border highlight outline */}
                {isSelected && (
                  <div className="absolute -inset-[3px] border-[2px] border-dashed border-indigo-600 pointer-events-none rounded-[18px]" />
                )}

                {/* Bottom Right Resize Handle node */}
                {isSelected && !el.locked && (
                  <div
                    className="absolute bottom-[-5px] right-[-5px] w-3.5 h-3.5 bg-indigo-600 border border-white rounded-full cursor-se-resize z-10 resize-handle"
                    title="Drag to resize"
                  />
                )}
              </div>
            );
          }

          return (
            <div
              key={el.id}
              className={`absolute flex items-center justify-center transition-shadow pointer-events-auto ${
                activeTool === 'select' ? 'cursor-move' : ''
              } ${
                el.type === 'sticky' ? 'shadow-md shadow-amber-900/5 rotate-[-0.5deg]' : ''
              }`}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                backgroundColor: el.style.fill || '#ffffff',
                border: el.type === 'text' ? 'none' : `1.5px solid ${isSelected ? '#4f46e5' : el.style.stroke || '#cbd5e1'}`,
                borderRadius: el.type === 'circle' ? '50%' : el.type === 'sticky' ? '2px' : el.style.borderRadius || '10px',
                padding: el.type === 'text' ? '0' : '10px',
                transform: el.style.rotate ? `rotate(${el.style.rotate}deg)` : undefined,
              }}
              onMouseDown={(e) => {
                // Ignore drags inside inline-text-editor
                if (isEditing) return;
                
                // Allow resizing handle triggers explicitly
                const target = e.target as HTMLElement;
                if (target.classList.contains('resize-handle') && !el.locked) {
                  e.stopPropagation();
                  setIsResizing(el.id);
                  return;
                }
              }}
            >
              {/* Lock Badge visual indicator */}
              {el.locked && (
                <div 
                  className="absolute top-2 right-2 text-amber-600 bg-amber-50/95 border border-amber-200/60 rounded-md p-1 shadow-sm pointer-events-none z-10" 
                  title="This element is locked"
                >
                  <Lock size={12} className="stroke-[2.5px]" />
                </div>
              )}

              {/* Direct Inline Text Editor Overlay */}
              {isEditing ? (
                <div className="absolute inset-0 w-full h-full p-2 bg-white/95 rounded-lg z-20 flex inline-text-editor">
                  <textarea
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={saveEditingText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEditingText();
                      }
                    }}
                    className={`w-full h-full bg-transparent border-none outline-none resize-none p-1 text-slate-800 text-xs font-semibold leading-normal ${fontClass}`}
                  />
                </div>
              ) : (
                <div
                  className={`w-full text-center break-words leading-relaxed select-none ${fontClass} ${
                    el.type === 'text' ? 'text-left' : ''
                  }`}
                  style={{
                    color: (!el.style.textColor || el.style.textColor === '#0f172a' || el.style.textColor === '#1e1b4b')
                      ? (theme === 'light' ? (el.style.textColor || '#0f172a') : '#f8fafc')
                      : el.style.textColor,
                    fontSize: `${el.style.fontSize || 13}px`,
                    fontWeight: el.type === 'text' ? 'bold' : '600',
                    transform: el.style.rotate ? `rotate(${-el.style.rotate}deg)` : undefined,
                  }}
                  onDoubleClick={() => {
                    if (el.locked) return; // ignore editing when locked
                    setEditingElementId(el.id);
                    setEditingText(el.text);
                  }}
                >
                  {el.type === 'sticky' ? (
                    <div className="flex flex-col items-start gap-1 w-full h-full overflow-y-auto pr-1 text-left select-text">
                      {renderFormattedText(el.text)}
                    </div>
                  ) : (
                    el.text.split('\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))
                  )}
                </div>
              )}

              {/* Selection Border highlight outline */}
              {isSelected && !isEditing && (
                <div
                  className={`absolute -inset-[3px] border-[2px] border-dashed ${el.locked ? 'border-amber-500' : 'border-indigo-600'} pointer-events-none`}
                  style={{
                    borderRadius: el.type === 'circle' ? '50%' : el.type === 'sticky' ? '2px' : el.style.borderRadius || '12px',
                  }}
                />
              )}

              {/* Bottom Right Resize Handle node */}
              {isSelected && !isEditing && el.type !== 'circle' && !el.locked && (
                <div
                  className="absolute bottom-[-5px] right-[-5px] w-3.5 h-3.5 bg-indigo-600 border border-white rounded-full cursor-se-resize z-10 resize-handle"
                  title="Drag to resize"
                />
              )}
            </div>
          );
        })}

        {/* Render Live Connector Preview while drawing */}
        {isDrawingConnector && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={isDrawingConnector.startX}
              y1={isDrawingConnector.startY}
              x2={isDrawingConnector.currentX}
              y2={isDrawingConnector.currentY}
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </svg>
        )}

        {/* Selection Marquee Frame overlay */}
        {selectionMarquee && (
          <div
            className="absolute border border-indigo-500 bg-indigo-500/10 rounded-sm pointer-events-none"
            style={{
              left: Math.min(selectionMarquee.startX, selectionMarquee.currentX),
              top: Math.min(selectionMarquee.startY, selectionMarquee.currentY),
              width: Math.abs(selectionMarquee.currentX - selectionMarquee.startX),
              height: Math.abs(selectionMarquee.currentY - selectionMarquee.startY),
            }}
          />
        )}

        {/* Real-time Multiplayer Cursors layer */}
        {collaborators.map((user) => {
          if (!user.cursor || user.id === clientId) return null;
          return (
            <div
              key={user.id}
              className="absolute pointer-events-none transition-all duration-75 z-50 flex flex-col items-start"
              style={{
                left: user.cursor.x,
                top: user.cursor.y,
              }}
            >
              {/* Pointer Arrow SVG */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.5 3V17.5L9.5 12.5L16.5 16.5L4.5 3Z"
                  fill={user.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinejoin="miter"
                />
              </svg>
              {/* Hover Name Badge */}
              <div
                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md select-none mt-1 ml-3"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>
            </div>
          );
        })}

        {/* Export Bounding Box Overlay */}
        {isExportSelecting && exportBoundingBox && exportBoundingBox.width > 0 && (
          <div
            className="absolute border-2 border-dashed border-indigo-600 bg-indigo-500/5 shadow-lg rounded-md pointer-events-auto z-40"
            style={{
              left: exportBoundingBox.x,
              top: exportBoundingBox.y,
              width: exportBoundingBox.width,
              height: exportBoundingBox.height,
            }}
          >
            {/* Action pills at the top right of the bounding box */}
            <div className="absolute -top-10 right-0 flex items-center gap-2 pointer-events-auto select-none z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExportSelection('svg');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <Download size={11} />
                <span>SVG</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExportSelection('png');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <Download size={11} />
                <span>PNG</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExportBoundingBox(null);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-900 text-slate-200 rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
            
            {/* Bounding box label at top-left */}
            <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm select-none">
              Export Bounding Box (Drag on empty area to redraw)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
