import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory Board Storage
interface BoardElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: any;
  fromId?: string;
  toId?: string;
  version: number;
  updatedBy?: string;
}

interface Board {
  id: string;
  name: string;
  elements: Record<string, BoardElement>;
  version: number;
  updatedAt: string;
}

const boards: Record<string, Board> = {
  'demo-board': {
    id: 'demo-board',
    name: 'Main Brainstorming Board',
    version: 1,
    updatedAt: new Date().toISOString(),
    elements: {
      'rect-1': {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 180,
        height: 80,
        text: 'User Interface (React Web App)',
        style: { fill: '#eef2ff', stroke: '#6366f1', textColor: '#1e1b4b', fontSize: 14 },
        version: 1,
      },
      'rect-2': {
        id: 'rect-2',
        type: 'rectangle',
        x: 400,
        y: 100,
        width: 180,
        height: 80,
        text: 'Express API Server (Node.js)',
        style: { fill: '#ecfdf5', stroke: '#10b981', textColor: '#064e3b', fontSize: 14 },
        version: 1,
      },
      'conn-1': {
        id: 'conn-1',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        text: 'HTTP API Requests',
        style: { stroke: '#475569', strokeWidth: 2, textColor: '#475569', fontSize: 12 },
        fromId: 'rect-1',
        toId: 'rect-2',
        version: 1,
      },
      'sticky-1': {
        id: 'sticky-1',
        type: 'sticky',
        x: 120,
        y: 250,
        width: 140,
        height: 140,
        text: 'Feature idea:\nLet users invite team members with unique share links!',
        style: { fill: '#fef3c7', stroke: '#d97706', textColor: '#78350f', fontSize: 13 },
        version: 1,
      }
    },
  },
};

// SSE Client subscriptions for live boards
interface SSEClient {
  id: string;
  res: any;
}
const sseSubscriptions: Record<string, SSEClient[]> = {};

// Helper to broadcast events to all clients connected to a board
function broadcastToBoard(boardId: string, senderId: string, event: string, data: any) {
  const clients = sseSubscriptions[boardId] || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  clients.forEach((client) => {
    // Send to everyone except the sender to avoid echo (unless it's an AI event)
    if (client.id !== senderId || event.startsWith('ai_')) {
      client.res.write(payload);
    }
  });
}

// REST APIs
app.get('/api/boards', (req, res) => {
  const list = Object.values(boards).map((b) => ({
    id: b.id,
    name: b.name,
    version: b.version,
    updatedAt: b.updatedAt,
    elementCount: Object.keys(b.elements).length,
  }));
  res.json(list);
});

app.post('/api/boards', (req, res) => {
  const { name } = req.body;
  const id = `board-${Math.random().toString(36).substr(2, 9)}`;
  const newBoard: Board = {
    id,
    name: name || 'Untitled Whiteboard',
    version: 1,
    updatedAt: new Date().toISOString(),
    elements: {},
  };
  boards[id] = newBoard;
  res.status(201).json(newBoard);
});

app.get('/api/boards/:id', (req, res) => {
  const board = boards[req.params.id];
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

app.post('/api/boards/:id/duplicate', (req, res) => {
  const parent = boards[req.params.id];
  if (!parent) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const id = `board-${Math.random().toString(36).substr(2, 9)}`;
  const duplicated: Board = {
    id,
    name: `${parent.name} (Copy)`,
    version: 1,
    updatedAt: new Date().toISOString(),
    elements: JSON.parse(JSON.stringify(parent.elements)),
  };
  boards[id] = duplicated;
  res.status(201).json(duplicated);
});

// SSE Multiplayer Gateway
app.get('/api/boards/:id/sync', (req, res) => {
  const boardId = req.params.id;
  const clientId = req.query.clientId as string;
  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId parameter' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Register subscription
  if (!sseSubscriptions[boardId]) {
    sseSubscriptions[boardId] = [];
  }
  sseSubscriptions[boardId].push({ id: clientId, res });

  // Clean up on disconnect
  req.on('close', () => {
    sseSubscriptions[boardId] = sseSubscriptions[boardId].filter((c) => c.id !== clientId);
    // Broadcast user left
    broadcastToBoard(boardId, clientId, 'presence_leave', { clientId });
  });

  // Keep-alive interval
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Broadcast Real-Time Actions (cursors, element modification, etc.)
app.post('/api/boards/:id/events', (req, res) => {
  const boardId = req.params.id;
  const { eventType, clientId, payload } = req.body;

  if (!boards[boardId]) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const board = boards[boardId];

  // Save changes if modifying elements
  if (eventType === 'elements_modified') {
    const { modified, deletedIds } = payload;
    
    if (modified) {
      Object.values(modified).forEach((el: any) => {
        board.elements[el.id] = {
          ...board.elements[el.id],
          ...el,
          version: (board.elements[el.id]?.version || 0) + 1,
          updatedBy: clientId,
        };
      });
    }

    if (deletedIds && Array.isArray(deletedIds)) {
      deletedIds.forEach((id: string) => {
        delete board.elements[id];
      });
    }

    board.version += 1;
    board.updatedAt = new Date().toISOString();
  }

  // Broadcast to other collaborators on this board
  broadcastToBoard(boardId, clientId, eventType, { clientId, payload });
  res.json({ success: true, version: board.version });
});

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// AI: Generate Diagram Endpoint
app.post('/api/boards/:id/ai/generate', async (req, res) => {
  const boardId = req.params.id;
  const { prompt, clientId } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const board = boards[boardId];
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  try {
    const ai = getGeminiClient();

    // Stream status update to client
    broadcastToBoard(boardId, clientId, 'ai_status', { message: 'Analyzing prompt and drawing nodes...' });

    const systemPrompt = `You are a professional software architect and UI diagram designer.
Generate a structured diagram representation based on the user's prompt. 
The canvas coordinates are centered around (200, 200). Draw nodes with logical positioning.
- Use rectangles for standard components, services, or pages (width ~180, height ~80).
- Use circles for users, actors, databases, or API nodes (width ~100, height ~100).
- Use sticky notes for general brainstorm ideas or annotations (width ~130, height ~130).
- Maintain a proper hierarchy or horizontal flow. X coordinates should step from left to right (e.g. 100, 350, 600, etc.) and Y coordinates should align nicely (e.g. 150, 150, 150).
- style parameters: fill (hex format, light pleasant colors e.g. #fef3c7, #e0f2fe, #f3e8ff, #dcfce7, #f3f4f6), stroke (matching border color e.g. #d97706, #0284c7, #7c3aed, #16a34a, #4b5563), textColor, fontSize.

You must return a valid JSON array matching this exact schema:
{
  "elements": [
    {
      "type": "rectangle" | "circle" | "sticky" | "text",
      "text": "Label / description",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "style": { "fill": "hex", "stroke": "hex", "textColor": "hex", "fontSize": number }
    }
  ],
  "connections": [
    {
      "fromIndex": number, // index in elements array
      "toIndex": number, // index in elements array
      "text": "Relationship description (optional)"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Create a clean diagram for: "${prompt}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  text: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  style: {
                    type: Type.OBJECT,
                    properties: {
                      fill: { type: Type.STRING },
                      stroke: { type: Type.STRING },
                      textColor: { type: Type.STRING },
                      fontSize: { type: Type.NUMBER },
                    },
                  },
                },
                required: ['type', 'text', 'x', 'y', 'width', 'height'],
              },
            },
            connections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fromIndex: { type: Type.INTEGER },
                  toIndex: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                },
                required: ['fromIndex', 'toIndex'],
              },
            },
          },
          required: ['elements', 'connections'],
        },
      },
    });

    const output = JSON.parse(response.text || '{}');
    const newElements: Record<string, BoardElement> = {};

    // Transform index-based layout to ID-based layout
    const elementIds = (output.elements || []).map(() => `ai-${Math.random().toString(36).substr(2, 9)}`);

    (output.elements || []).forEach((el: any, i: number) => {
      const id = elementIds[i];
      newElements[id] = {
        id,
        type: el.type,
        x: el.x || 200,
        y: el.y || 200,
        width: el.width || 150,
        height: el.height || 80,
        text: el.text || '',
        style: el.style || { fill: '#ffffff', stroke: '#475569', textColor: '#0f172a', fontSize: 13 },
        version: 1,
      };
    });

    (output.connections || []).forEach((conn: any) => {
      const fromId = elementIds[conn.fromIndex];
      const toId = elementIds[conn.toIndex];
      if (fromId && toId) {
        const id = `ai-conn-${Math.random().toString(36).substr(2, 9)}`;
        newElements[id] = {
          id,
          type: 'connector',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          text: conn.text || '',
          style: { stroke: '#64748b', strokeWidth: 2, textColor: '#475569', fontSize: 12 },
          fromId,
          toId,
          version: 1,
        };
      }
    });

    // Save to server board store
    Object.assign(board.elements, newElements);
    board.version += 1;
    board.updatedAt = new Date().toISOString();

    broadcastToBoard(boardId, clientId, 'ai_status', { message: 'Finished drawing elements!' });
    broadcastToBoard(boardId, clientId, 'elements_modified', { clientId: 'gemini-ai', payload: { modified: newElements, deletedIds: [] } });

    res.json({ success: true, addedCount: Object.keys(newElements).length });
  } catch (error: any) {
    console.error('AI generation error:', error);
    broadcastToBoard(boardId, clientId, 'ai_status', { error: error.message || 'AI processing failed' });
    res.status(500).json({ error: error.message || 'Failed to generate diagram with AI.' });
  }
});

// AI: Summarize Board Content
app.post('/api/boards/:id/ai/summarize', async (req, res) => {
  const boardId = req.params.id;
  const { elementIds } = req.body;

  const board = boards[boardId];
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  // Filter elements to compile context
  const targetElements = elementIds && Array.isArray(elementIds) && elementIds.length > 0
    ? elementIds.map(id => board.elements[id]).filter(Boolean)
    : Object.values(board.elements);

  if (targetElements.length === 0) {
    return res.status(400).json({ error: 'No elements to summarize on this board' });
  }

  const boardContext = targetElements.map(el => {
    return `[${el.type.toUpperCase()}] Text: "${el.text.replace(/\n/g, ' ')}"`;
  }).join('\n');

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are an expert project manager and scribe.
Analyze the whiteboard items provided as context. They represent sticky notes, rectangle shapes, and connectors from an active collaborative canvas.
Produce an extremely high-quality, professional markdown summary of the discussions, core components, action items, key decisions, and open concerns.
Keep the layout beautiful and professional with bullet points, dividers, and headers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Whiteboard Board Name: "${board.name}"\nCanvas Elements:\n${boardContext}\n\nSummarize this board structure clearly.`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('AI summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate board summary.' });
  }
});

// AI: Review System Architecture
app.post('/api/boards/:id/ai/review', async (req, res) => {
  const boardId = req.params.id;

  const board = boards[boardId];
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const elementsList = Object.values(board.elements);
  const flowContext = elementsList.map(el => {
    if (el.type === 'connector' && el.fromId && el.toId) {
      const fromEl = board.elements[el.fromId];
      const toEl = board.elements[el.toId];
      return `Connection: "${fromEl ? fromEl.text : 'Unknown'}" --[${el.text}]--> "${toEl ? toEl.text : 'Unknown'}"`;
    }
    return `Node: "${el.text}" (${el.type})`;
  }).join('\n');

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are a distinguished Principal Software Engineer and System Architect.
Examine the system components and flow connections from the whiteboard workspace.
Check for architectural bottlenecks, single points of failure, missing modules (like caching, rate limiting, queues), security vulnerabilities, and deployment or data consistency challenges.
Write a structured architecture audit in markdown format:
1. Executive Summary
2. Missing Critical Components & Architecture Suggestions
3. Scaling and Performance Review
4. Security & Idempotency Audit`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Whiteboard Architecture Structure:\n${flowContext}\n\nPlease perform an architecture review on this system design.`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({ review: response.text });
  } catch (error: any) {
    console.error('AI architecture review error:', error);
    res.status(500).json({ error: error.message || 'Failed to critique architecture.' });
  }
});

// AI: Cluster and Organize Board Elements with Spatial Frame Borders (Auto-Organize)
app.post('/api/boards/:id/ai/organize', async (req, res) => {
  const boardId = req.params.id;
  const { clientId } = req.body;

  const board = boards[boardId];
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  // Get all non-connector, non-frame elements
  const items = Object.values(board.elements).filter(
    el => el.type !== 'connector' && !el.id.startsWith('frame-') && !el.id.startsWith('cluster-label-')
  );

  if (items.length === 0) {
    return res.status(400).json({ error: 'Please add some elements (Sticky Notes, Shapes, Labels) to organize.' });
  }

  const itemsContext = items.map((el) => {
    return `ID: "${el.id}" - Type: "${el.type}" - Position: (x: ${Math.round(el.x)}, y: ${Math.round(el.y)}) - Text: "${el.text.replace(/\n/g, ' ')}"`;
  }).join('\n');

  try {
    const ai = getGeminiClient();
    broadcastToBoard(boardId, clientId, 'ai_status', { message: 'Analyzing elements for proximity and semantic meaning...' });

    const systemPrompt = `You are a high-end canvas workspace organization expert.
Group the scattered whiteboard elements into logical semantic clusters based on BOTH their spatial coordinates (spatial proximity) and textual content (shared semantic meaning).
For each cluster:
- Create a clear, high-level theme or category title.
- Pick a distinct professional aesthetic stroke color for its frame border (choose from: "#6366f1" (indigo), "#10b981" (emerald), "#f59e0b" (amber), "#ef4444" (rose), "#8b5cf6" (purple), "#06b6d4" (cyan)).
- Return a list of all element IDs grouped in this cluster.
- Do not include connectors in the elementIds list. Just group the existing shape/text/sticky elements.

Return a valid JSON output matching this exact schema:
{
  "clusters": [
    {
      "title": "Category Name",
      "color": "hex_color",
      "elementIds": ["id1", "id2"]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Whiteboard elements to organize:\n${itemsContext}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clusters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  color: { type: Type.STRING },
                  elementIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'color', 'elementIds'],
              },
            },
          },
          required: ['clusters'],
        },
      },
    });

    const output = JSON.parse(response.text || '{}');
    const modified: Record<string, any> = {};
    const deletedIds: string[] = [];

    // Delete existing frame borders and category labels to avoid double-nesting
    Object.keys(board.elements).forEach(id => {
      if (id.startsWith('frame-') || id.startsWith('cluster-label-')) {
        delete board.elements[id];
        deletedIds.push(id);
      }
    });

    let clusterIndex = 0;
    (output.clusters || []).forEach((cluster: any) => {
      const clusterElementIds = (cluster.elementIds || []).filter((id: string) => board.elements[id]);
      if (clusterElementIds.length === 0) return;

      // Layout elements of this cluster horizontally/grid spaced starting at X offset
      // Spacing: each cluster has an offset of X to separate them clearly on the board
      const startX = clusterIndex * 550 + 100;
      const startY = 150;
      
      const laidOutElements: any[] = [];
      clusterElementIds.forEach((id: string, idx: number) => {
        const original = board.elements[id];
        if (original) {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const newX = startX + col * 200;
          const newY = startY + row * 160;

          const updated = {
            ...original,
            x: newX,
            y: newY,
            version: (original.version || 1) + 1,
          };
          
          modified[id] = updated;
          laidOutElements.push(updated);
        }
      });

      if (laidOutElements.length > 0) {
        // Calculate the bounding box of the grouped elements
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        laidOutElements.forEach(el => {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + el.width);
          maxY = Math.max(maxY, el.y + el.height);
        });

        // Add padding and create a gorgeous frame element surrounding the cluster
        const frameId = `frame-${clusterIndex}-${Math.random().toString(36).substr(2, 5)}`;
        
        modified[frameId] = {
          id: frameId,
          type: 'rectangle',
          x: minX - 35,
          y: minY - 55, // extra padding at top for the group title label
          width: (maxX - minX) + 70,
          height: (maxY - minY) + 85,
          text: `📁 ${cluster.title.toUpperCase()}`,
          style: {
            fill: `${cluster.color}05`, // 2% opacity translucent fill
            stroke: cluster.color,
            strokeWidth: 3,
            textColor: cluster.color,
            fontSize: 12,
            fontFamily: 'sans'
          },
          zIndex: -10, // Render behind everything else
          version: 1,
        };
      }

      clusterIndex++;
    });

    // Save modified elements to server board store
    Object.keys(modified).forEach(id => {
      board.elements[id] = {
        ...board.elements[id],
        ...modified[id],
      };
    });
    board.version += 1;
    board.updatedAt = new Date().toISOString();

    broadcastToBoard(boardId, clientId, 'ai_status', { message: 'Auto-organization complete!' });
    broadcastToBoard(boardId, clientId, 'elements_modified', { clientId: 'gemini-ai', payload: { modified, deletedIds } });

    res.json({ success: true, groupsCount: clusterIndex });
  } catch (error: any) {
    console.error('AI Auto-Organize error:', error);
    broadcastToBoard(boardId, clientId, 'ai_status', { error: error.message || 'Failed to auto-organize board' });
    res.status(500).json({ error: error.message || 'Failed to auto-organize notes.' });
  }
});


// Dev & Production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Whiteboard backend running on port ${PORT}`);
  });
}

startServer();
