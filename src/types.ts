export type ElementType = 'rectangle' | 'circle' | 'sticky' | 'text' | 'connector' | 'comment';

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: 'sans' | 'mono' | 'serif';
  opacity?: number;
  rotate?: number;
  borderRadius?: string;
  shapeType?: 'process' | 'decision' | 'start-end';
}

export interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: ElementStyle;
  // For connectors:
  fromId?: string;
  toId?: string;
  // Metadata:
  version: number;
  updatedBy?: string;
  groupId?: string; // Optional identifier to group elements together
  locked?: boolean; // Optional flag to lock elements
  zIndex?: number; // Optional flag for layer ordering (bring to front / send to back)
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: { x: number; y: number } | null;
  selectedIds?: string[];
  lastActive: number;
  isSimulated?: boolean;
}

export interface Board {
  id: string;
  name: string;
  elements: Record<string, BoardElement>;
  version: number;
}

export interface SyncMessage {
  type: 'init' | 'cursor' | 'element_change' | 'presence_join' | 'presence_leave' | 'ai_status' | 'ai_complete';
  boardId: string;
  senderId: string;
  payload: any;
}
