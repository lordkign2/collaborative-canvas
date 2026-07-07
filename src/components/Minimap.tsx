import React, { useRef, useEffect, useState } from 'react';
import { BoardElement } from '../types';

interface MinimapProps {
  elements: Record<string, BoardElement>;
  pan: { x: number; y: number };
  zoom: number;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export default function Minimap({ elements, pan, zoom, setPan }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update viewport size on window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const MAP_WIDTH = 200;
  const MAP_HEIGHT = 130;

  // Compute boundaries of all elements + current viewport
  const elementList = Object.values(elements).filter((el) => el.type !== 'connector');

  const viewportLeft = -pan.x / zoom;
  const viewportTop = -pan.y / zoom;
  const viewportWidth = viewportSize.width / zoom;
  const viewportHeight = viewportSize.height / zoom;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;

  let minX = viewportLeft;
  let minY = viewportTop;
  let maxX = viewportRight;
  let maxY = viewportBottom;

  if (elementList.length > 0) {
    elementList.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });
  }

  // Add margin around the bounds
  const padding = 150;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  // Scaling factor to fit bounds into the mini-map viewport
  const scale = Math.min(MAP_WIDTH / totalWidth, MAP_HEIGHT / totalHeight);

  // Center the content on the mini-map
  const renderedWidth = totalWidth * scale;
  const renderedHeight = totalHeight * scale;
  const offsetX = (MAP_WIDTH - renderedWidth) / 2;
  const offsetY = (MAP_HEIGHT - renderedHeight) / 2;

  // Helper to convert canvas coordinates to mini-map coordinates
  const toMiniX = (cx: number) => offsetX + (cx - minX) * scale;
  const toMiniY = (cy: number) => offsetY + (cy - minY) * scale;

  // Drag on mini-map to pan
  const handleMapAction = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    // Convert back to canvas coordinate center
    const canvasCenterX = minX + (mx - offsetX) / scale;
    const canvasCenterY = minY + (my - offsetY) / scale;

    // Re-center the viewport at this location
    const newViewportLeft = canvasCenterX - viewportWidth / 2;
    const newViewportTop = canvasCenterY - viewportHeight / 2;

    setPan({
      x: -newViewportLeft * zoom,
      y: -newViewportTop * zoom,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleMapAction(e.clientX, e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleMapAction(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl p-2.5 z-20 pointer-events-auto flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mini-Map</span>
        <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        className="relative bg-slate-50 border border-slate-100 rounded-xl overflow-hidden cursor-crosshair select-none"
      >
        {/* Render scaled-down elements */}
        {elementList.map((el) => {
          const rx = toMiniX(el.x);
          const ry = toMiniY(el.y);
          const rw = el.width * scale;
          const rh = el.height * scale;

          return (
            <div
              key={el.id}
              className="absolute rounded-sm opacity-60 transition-colors"
              style={{
                left: rx,
                top: ry,
                width: Math.max(2, rw),
                height: Math.max(2, rh),
                backgroundColor: el.style.stroke || '#cbd5e1',
                border: '0.5px solid rgba(255, 255, 255, 0.4)',
              }}
            />
          );
        })}

        {/* Render Viewport bounds overlay */}
        <div
          className="absolute border-2 border-indigo-500 bg-indigo-500/10 rounded-md pointer-events-none transition-[left,top,width,height] duration-75"
          style={{
            left: toMiniX(viewportLeft),
            top: toMiniY(viewportTop),
            width: viewportWidth * scale,
            height: viewportHeight * scale,
          }}
        />
      </div>
    </div>
  );
}
