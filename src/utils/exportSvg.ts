import { BoardElement } from '../types';
import { jsPDF } from 'jspdf';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function getSVGContent(
  boardName: string, 
  elements: Record<string, BoardElement>,
  viewBoxOverride?: { x: number; y: number; w: number; h: number; }
): string {
  const list = Object.values(elements);
  if (list.length === 0) {
    return '';
  }

  // 1. Calculate bounding box of all non-connector elements
  const nonConnectors = list.filter((el) => el.type !== 'connector');
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (nonConnectors.length > 0) {
    nonConnectors.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });
  } else {
    // Fallback bounding box if only connectors exist
    minX = 100;
    minY = 100;
    maxX = 900;
    maxY = 700;
  }

  const pad = 40;
  const width = viewBoxOverride ? viewBoxOverride.w : (maxX - minX);
  const height = viewBoxOverride ? viewBoxOverride.h : (maxY - minY);
  const finalMinX = viewBoxOverride ? viewBoxOverride.x : minX;
  const finalMinY = viewBoxOverride ? viewBoxOverride.y : minY;
  const viewBox = viewBoxOverride 
    ? `${viewBoxOverride.x} ${viewBoxOverride.y} ${viewBoxOverride.w} ${viewBoxOverride.h}`
    : `${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`;

  // 2. Build the SVG Content
  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width + pad * 2}" height="${height + pad * 2}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&amp;family=JetBrains+Mono:wght@400;700&amp;family=Playfair+Display:wght@400;700&amp;display=swap');
    .font-sans { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', Courier, monospace; }
    .font-serif { font-family: 'Playfair Display', Georgia, serif; }
    .connector-text { font-size: 10px; font-weight: bold; fill: #475569; }
    .element-text { font-weight: 600; text-anchor: middle; }
    .label-text { font-weight: bold; text-anchor: start; }
    .comment-title { font-weight: 800; font-size: 10px; fill: #1e293b; }
    .comment-meta { font-size: 8px; fill: #94a3b8; }
    .comment-content { font-size: 10px; font-weight: 500; fill: #334155; }
  </style>

  <defs>
    <!-- Arrowhead marker definition -->
    <marker
       id="arrowhead"
       markerWidth="8"
       markerHeight="6"
       refX="6"
       refY="3"
       orient="auto"
    >
      <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
    </marker>
    <!-- Soft shadow for cards & sticky notes -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Solid clean off-white background canvas -->
  <rect x="${finalMinX - pad * 2}" y="${finalMinY - pad * 2}" width="${width + pad * 4}" height="${height + pad * 4}" fill="#fdfdfd" />
`;

  // 3. Render Connector Connections
  list.forEach((el) => {
    if (el.type !== 'connector') return;
    const fromEl = elements[el.fromId || ''];
    const toEl = elements[el.toId || ''];
    if (!fromEl || !toEl) return;

    // Calculate start/end points mirroring the whiteboard calculations
    const x1 = fromEl.x + fromEl.width / 2;
    const y1 = fromEl.y + fromEl.height / 2;
    const x2 = toEl.x + toEl.width / 2;
    const y2 = toEl.y + toEl.height / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;

    const ux = dx / length;
    const uy = dy / length;
    const toMargin = 15;

    const sx = x1 + ux * (fromEl.width / 2);
    const sy = y1 + uy * (fromEl.height / 2);
    const ex = x2 - ux * (toEl.width / 2 + toMargin);
    const ey = y2 - uy * (toEl.height / 2 + toMargin);

    const mx = x1 + dx * 0.5;
    const my = y1 + dy * 0.5;

    svgContent += `  <!-- Connection: ${el.id} -->\n`;
    svgContent += `  <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${el.style.stroke || '#64748b'}" stroke-width="${el.style.strokeWidth || 2}" stroke-dasharray="${el.style.strokeDasharray || ''}" marker-end="url(#arrowhead)" />\n`;

    if (el.text) {
      svgContent += `  <g transform="translate(${mx}, ${my})">\n`;
      svgContent += `    <rect x="-45" y="-10" width="90" height="20" fill="#ffffff" rx="4" stroke="#e2e8f0" stroke-width="1" />\n`;
      svgContent += `    <text text-anchor="middle" y="4" class="font-sans connector-text">${escapeXml(el.text)}</text>\n`;
      svgContent += `  </g>\n`;
    }
  });

  // 4. Render Board Elements (Shapes, Sticky Notes, Text labels, Comments)
  list.forEach((el) => {
    if (el.type === 'connector') return;

    svgContent += `  <!-- Node: ${el.id} (${el.type}) -->\n`;
    const fill = el.style.fill || '#ffffff';
    const stroke = el.type === 'text' ? 'none' : el.style.stroke || '#cbd5e1';
    const strokeWidth = el.type === 'text' ? 0 : 1.5;

    // Choose class based on font preference
    let fontClass = 'font-sans';
    if (el.style.fontFamily === 'mono') fontClass = 'font-mono';
    else if (el.style.fontFamily === 'serif') fontClass = 'font-serif';

    // Renders shape border backgrounds
    if (el.type === 'circle') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const r = Math.min(el.width, el.height) / 2;
      svgContent += `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
    } else if (el.type === 'sticky') {
      svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="2" filter="url(#shadow)" />\n`;
    } else if (el.type === 'rectangle') {
      svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="10" filter="url(#shadow)" />\n`;
    } else if ((el.type as any) === 'comment') {
      let commentData: any = null;
      try {
        commentData = JSON.parse(el.text);
      } catch (e) {
        commentData = {
          author: 'User',
          color: el.style.stroke || '#6366f1',
          timestamp: 'Just now',
          content: el.text,
          resolved: false
        };
      }

      const commentStroke = commentData.resolved ? '#10b981' : commentData.color || el.style.stroke || '#6366f1';
      const commentFill = commentData.resolved ? '#f0fdf4' : '#ffffff';

      svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${commentFill}" stroke="${commentStroke}" stroke-width="2" rx="16" filter="url(#shadow)" />\n`;
      svgContent += `  <circle cx="${el.x + 20}" cy="${el.y + 20}" r="4" fill="${commentStroke}" />\n`;
      svgContent += `  <text x="${el.x + 30}" y="${el.y + 23}" class="font-sans comment-title">${escapeXml(commentData.author)}</text>\n`;
      if (commentData.resolved) {
        svgContent += `  <text x="${el.x + el.width - 65}" y="${el.y + 23}" class="font-sans comment-meta" font-weight="bold" fill="#10b981">RESOLVED ✓</text>\n`;
      } else {
        svgContent += `  <text x="${el.x + el.width - 60}" y="${el.y + 23}" class="font-sans comment-meta">${escapeXml(commentData.timestamp)}</text>\n`;
      }
      // Content body wrapped
      const textX = el.x + 18;
      const textY = el.y + 44;
      svgContent += `  <text x="${textX}" y="${textY}" class="font-sans comment-content" font-size="10">\n`;
      // Render first 3-4 lines of main comment elegantly
      const lines: string[] = (commentData.content || '').split('\n');
      lines.slice(0, 4).forEach((line: string, idx: number) => {
        svgContent += `    <tspan x="${textX}" dy="${idx === 0 ? 0 : 13}px">${escapeXml(line)}</tspan>\n`;
      });
      svgContent += `  </text>\n`;

      // Render indicator of reply count if any
      const repliesCount = (commentData.replies || []).length;
      if (repliesCount > 0) {
        svgContent += `  <rect x="${el.x + 18}" y="${el.y + el.height - 28}" width="60" height="15" fill="#f1f5f9" rx="4" />\n`;
        svgContent += `  <text x="${el.x + 24}" y="${el.y + el.height - 18}" class="font-sans" font-size="8" font-weight="bold" fill="#475569">${repliesCount} repl${repliesCount === 1 ? 'y' : 'ies'}</text>\n`;
      }
      return; // Skip normal text rendering for comments
    }

    // Render Text
    if (el.text) {
      const lines = el.text.split('\n');
      const fontSize = el.style.fontSize || 13;
      const lineHeight = fontSize * 1.35;
      const textYStart = el.type === 'text'
        ? el.y + fontSize
        : el.y + el.height / 2 - ((lines.length - 1) * lineHeight) / 2 + 4; // micro-offset to center vertically

      const cx = el.type === 'text' ? el.x : el.x + el.width / 2;
      const textClass = el.type === 'text' ? 'label-text' : 'element-text';

      svgContent += `  <text x="${cx}" y="${textYStart}" class="${fontClass} ${textClass}" font-size="${fontSize}" fill="${el.style.textColor || '#0f172a'}">\n`;
      lines.forEach((line, idx) => {
        const dy = idx === 0 ? 0 : lineHeight;
        svgContent += `    <tspan x="${cx}" dy="${dy}px">${escapeXml(line)}</tspan>\n`;
      });
      svgContent += `  </text>\n`;
    }
  });

  svgContent += `</svg>\n`;
  return svgContent;
}

export function exportBoardToSVG(
  boardName: string, 
  elements: Record<string, BoardElement>,
  boundingBox?: { x: number; y: number; width: number; height: number; }
) {
  const viewBoxOverride = boundingBox ? {
    x: boundingBox.x,
    y: boundingBox.y,
    w: boundingBox.width,
    h: boundingBox.height
  } : undefined;
  
  const svgContent = getSVGContent(boardName, elements, viewBoxOverride);
  if (!svgContent) {
    alert('The board is empty. Add some elements before exporting.');
    return;
  }

  // Trigger download of the SVG
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${boardName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBoardToPNG(
  boardName: string, 
  elements: Record<string, BoardElement>,
  boundingBox?: { x: number; y: number; width: number; height: number; }
) {
  const viewBoxOverride = boundingBox ? {
    x: boundingBox.x,
    y: boundingBox.y,
    w: boundingBox.width,
    h: boundingBox.height
  } : undefined;

  const svgContent = getSVGContent(boardName, elements, viewBoxOverride);
  if (!svgContent) {
    alert('The board is empty. Add some elements before exporting.');
    return;
  }

  // Calculate width and height from the bounding box or the default extent
  let width = 0;
  let height = 0;
  const pad = 40;

  if (boundingBox) {
    width = boundingBox.width;
    height = boundingBox.height;
  } else {
    const list = Object.values(elements);
    const nonConnectors = list.filter((el) => el.type !== 'connector');
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    if (nonConnectors.length > 0) {
      nonConnectors.forEach((el) => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });
    } else {
      minX = 100;
      minY = 100;
      maxX = 900;
      maxY = 700;
    }
    width = maxX - minX + pad * 2;
    height = maxY - minY + pad * 2;
  }

  // Render at 2x scale for high-resolution PNG
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    alert('Failed to initialize canvas context');
    return;
  }

  // Pre-fill background
  ctx.fillStyle = '#fdfdfd';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${boardName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error drawing SVG to canvas for PNG download', e);
      alert('Failed to generate PNG image download. This browser may have blocked standard XML-to-Canvas exports. Try SVG export instead.');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  img.onerror = (e) => {
    console.error('Error loading SVG image for PNG generation', e);
    alert('Failed to generate PNG export due to browser security restrictions. Please use SVG export.');
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

export function exportBoardToPDF(boardName: string, elements: Record<string, BoardElement>) {
  const list = Object.values(elements);
  const nonConnectors = list.filter((el) => el.type !== 'connector');
  if (list.length === 0 || nonConnectors.length === 0) {
    alert('The board is empty. Add some elements before exporting.');
    return;
  }

  // Calculate bounding box
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

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  // Slices of standard pages
  const SHEET_WIDTH = 1120;
  const SHEET_HEIGHT = 790;

  const cols = Math.max(1, Math.ceil(totalWidth / SHEET_WIDTH));
  const rows = Math.max(1, Math.ceil(totalHeight / SHEET_HEIGHT));

  interface SheetSlice {
    col: number;
    row: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  const sheets: SheetSlice[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = minX + c * SHEET_WIDTH;
      const sy = minY + r * SHEET_HEIGHT;
      // Filter out totally empty grid sheets
      const hasContent = nonConnectors.some(
        (el) =>
          el.x >= sx - 40 &&
          el.x < sx + SHEET_WIDTH + 40 &&
          el.y >= sy - 40 &&
          el.y < sy + SHEET_HEIGHT + 40
      );
      if (hasContent || (cols === 1 && rows === 1)) {
        sheets.push({
          col: c,
          row: r,
          x: sx - 40,
          y: sy - 40,
          w: SHEET_WIDTH + 80,
          h: SHEET_HEIGHT + 80
        });
      }
    }
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'letter'
  });

  let currentPageIndex = 0;

  const renderSheet = (idx: number) => {
    if (idx >= sheets.length) {
      pdf.save(`${boardName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.pdf`);
      return;
    }

    const sheet = sheets[idx];
    const svgContent = getSVGContent(boardName, elements, {
      x: sheet.x,
      y: sheet.y,
      w: sheet.w,
      h: sheet.h
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = 792 * scale;
    canvas.height = 612 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas context failed to initialize');
      return;
    }

    ctx.fillStyle = '#fdfdfd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const imgData = canvas.toDataURL('image/png');
        if (currentPageIndex > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 0, 0, 792, 612);
        currentPageIndex++;
      } catch (err) {
        console.error('Failed to render PDF page slice', err);
      } finally {
        URL.revokeObjectURL(url);
        renderSheet(idx + 1);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image slice', idx);
      URL.revokeObjectURL(url);
      renderSheet(idx + 1);
    };

    img.src = url;
  };

  renderSheet(0);
}

