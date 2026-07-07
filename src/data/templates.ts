import { BoardElement } from '../types';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon identifier name
  category: 'Agile' | 'Engineering' | 'Product';
  elements: Record<string, BoardElement>;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'retro',
    name: 'Retrospective (Sprint Retro)',
    description: 'Structure sprint reviews with distinct columns for achievements, pain points, and concrete action items.',
    icon: 'MessageSquare',
    category: 'Agile',
    elements: {
      'col-1-header': {
        id: 'col-1-header',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 260,
        height: 60,
        text: '🚀 WHAT WENT WELL',
        style: {
          fill: '#ecfdf5',
          stroke: '#10b981',
          textColor: '#047857',
          fontSize: 14,
          fontFamily: 'sans',
          borderRadius: '12px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-1a': {
        id: 'sticky-1a',
        type: 'sticky',
        x: 100,
        y: 180,
        width: 120,
        height: 120,
        text: 'Great teamwork during the sprint! #success',
        style: {
          fill: '#f0fdf4',
          stroke: '#10b981',
          textColor: '#14532d',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-1b': {
        id: 'sticky-1b',
        type: 'sticky',
        x: 240,
        y: 180,
        width: 120,
        height: 120,
        text: 'The daily standups were fast and extremely focused.',
        style: {
          fill: '#f0fdf4',
          stroke: '#10b981',
          textColor: '#14532d',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-1c': {
        id: 'sticky-1c',
        type: 'sticky',
        x: 100,
        y: 320,
        width: 120,
        height: 120,
        text: 'Completed all core features 2 days ahead of schedule.',
        style: {
          fill: '#f0fdf4',
          stroke: '#10b981',
          textColor: '#14532d',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'col-2-header': {
        id: 'col-2-header',
        type: 'rectangle',
        x: 400,
        y: 100,
        width: 260,
        height: 60,
        text: '⚠️ WHAT CAN BE IMPROVED',
        style: {
          fill: '#fef2f2',
          stroke: '#ef4444',
          textColor: '#b91c1c',
          fontSize: 14,
          fontFamily: 'sans',
          borderRadius: '12px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-2a': {
        id: 'sticky-2a',
        type: 'sticky',
        x: 400,
        y: 180,
        width: 120,
        height: 120,
        text: 'PR reviews took longer than 24 hours. #bottleneck',
        style: {
          fill: '#fef2f2',
          stroke: '#f87171',
          textColor: '#7f1d1d',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-2b': {
        id: 'sticky-2b',
        type: 'sticky',
        x: 540,
        y: 180,
        width: 120,
        height: 120,
        text: 'Ambiguity around external payment provider settings.',
        style: {
          fill: '#fef2f2',
          stroke: '#f87171',
          textColor: '#7f1d1d',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'col-3-header': {
        id: 'col-3-header',
        type: 'rectangle',
        x: 700,
        y: 100,
        width: 260,
        height: 60,
        text: '🎯 ACTION ITEMS',
        style: {
          fill: '#eff6ff',
          stroke: '#3b82f6',
          textColor: '#1d4ed8',
          fontSize: 14,
          fontFamily: 'sans',
          borderRadius: '12px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-3a': {
        id: 'sticky-3a',
        type: 'sticky',
        x: 700,
        y: 180,
        width: 260,
        height: 100,
        text: 'Establish a standard 4-hour SLA response limit for PR reviews.',
        style: {
          fill: '#eff6ff',
          stroke: '#60a5fa',
          textColor: '#1e3a8a',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'sticky-3b': {
        id: 'sticky-3b',
        type: 'sticky',
        x: 700,
        y: 300,
        width: 260,
        height: 100,
        text: 'Generate OpenAPI schemas before building endpoints to eliminate team ambiguity.',
        style: {
          fill: '#eff6ff',
          stroke: '#60a5fa',
          textColor: '#1e3a8a',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      }
    }
  },
  {
    id: 'storymap',
    name: 'User Story Mapping',
    description: 'Map out the user journey horizontally across activity backbones, split vertical lanes by Releases or MVP stages.',
    icon: 'Layers',
    category: 'Product',
    elements: {
      'label-backbone': {
        id: 'label-backbone',
        type: 'text',
        x: 100,
        y: 50,
        width: 200,
        height: 30,
        text: '👤 USER JOURNEY BACKBONE',
        style: {
          textColor: '#475569',
          fontSize: 14,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'act-1': {
        id: 'act-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 220,
        height: 60,
        text: 'Browse Catalog & Search',
        style: {
          fill: '#e0f2fe',
          stroke: '#0284c7',
          textColor: '#0369a1',
          fontSize: 13,
          fontFamily: 'sans',
          borderRadius: '8px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'act-2': {
        id: 'act-2',
        type: 'rectangle',
        x: 360,
        y: 100,
        width: 220,
        height: 60,
        text: 'Manage Shopping Cart',
        style: {
          fill: '#e0f2fe',
          stroke: '#0284c7',
          textColor: '#0369a1',
          fontSize: 13,
          fontFamily: 'sans',
          borderRadius: '8px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'act-3': {
        id: 'act-3',
        type: 'rectangle',
        x: 620,
        y: 100,
        width: 220,
        height: 60,
        text: 'Checkout & Settlement',
        style: {
          fill: '#e0f2fe',
          stroke: '#0284c7',
          textColor: '#0369a1',
          fontSize: 13,
          fontFamily: 'sans',
          borderRadius: '8px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'task-1a': {
        id: 'task-1a',
        type: 'rectangle',
        x: 100,
        y: 180,
        width: 220,
        height: 50,
        text: 'Search items by text queries',
        style: {
          fill: '#f3e8ff',
          stroke: '#7e22ce',
          textColor: '#6b21a8',
          fontSize: 12,
          fontFamily: 'sans',
          borderRadius: '6px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'task-1b': {
        id: 'task-1b',
        type: 'rectangle',
        x: 100,
        y: 240,
        width: 220,
        height: 50,
        text: 'Filter catalog by category facets',
        style: {
          fill: '#f3e8ff',
          stroke: '#7e22ce',
          textColor: '#6b21a8',
          fontSize: 12,
          fontFamily: 'sans',
          borderRadius: '6px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'task-2a': {
        id: 'task-2a',
        type: 'rectangle',
        x: 360,
        y: 180,
        width: 220,
        height: 50,
        text: 'Adjust cart quantities and save items',
        style: {
          fill: '#f3e8ff',
          stroke: '#7e22ce',
          textColor: '#6b21a8',
          fontSize: 12,
          fontFamily: 'sans',
          borderRadius: '6px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'task-3a': {
        id: 'task-3a',
        type: 'rectangle',
        x: 620,
        y: 180,
        width: 220,
        height: 50,
        text: 'Enter delivery & billing addresses',
        style: {
          fill: '#f3e8ff',
          stroke: '#7e22ce',
          textColor: '#6b21a8',
          fontSize: 12,
          fontFamily: 'sans',
          borderRadius: '6px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'task-3b': {
        id: 'task-3b',
        type: 'rectangle',
        x: 620,
        y: 240,
        width: 220,
        height: 50,
        text: 'Authorize payments securely',
        style: {
          fill: '#f3e8ff',
          stroke: '#7e22ce',
          textColor: '#6b21a8',
          fontSize: 12,
          fontFamily: 'sans',
          borderRadius: '6px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'label-mvp': {
        id: 'label-mvp',
        type: 'text',
        x: -80,
        y: 330,
        width: 150,
        height: 30,
        text: '🚀 RELEASE 1: MVP',
        style: {
          textColor: '#4f46e5',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'story-1a': {
        id: 'story-1a',
        type: 'sticky',
        x: 100,
        y: 330,
        width: 100,
        height: 100,
        text: 'Standard keyword match #mvp',
        style: {
          fill: '#fef3c7',
          stroke: '#d97706',
          textColor: '#78350f',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'story-2a': {
        id: 'story-2a',
        type: 'sticky',
        x: 360,
        y: 330,
        width: 100,
        height: 100,
        text: 'Add, update & clear list items #mvp',
        style: {
          fill: '#fef3c7',
          stroke: '#d97706',
          textColor: '#78350f',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'story-3a': {
        id: 'story-3a',
        type: 'sticky',
        x: 620,
        y: 330,
        width: 100,
        height: 100,
        text: 'Single payment gateway (Stripe) #mvp',
        style: {
          fill: '#fef3c7',
          stroke: '#d97706',
          textColor: '#78350f',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'label-v2': {
        id: 'label-v2',
        type: 'text',
        x: -80,
        y: 460,
        width: 150,
        height: 30,
        text: '✨ RELEASE 2: GROWTH',
        style: {
          textColor: '#ea580c',
          fontSize: 12,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'story-1b': {
        id: 'story-1b',
        type: 'sticky',
        x: 100,
        y: 460,
        width: 100,
        height: 100,
        text: 'Fuzzy logic search suggestions',
        style: {
          fill: '#ffedd5',
          stroke: '#ea580c',
          textColor: '#7c2d12',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'story-2b': {
        id: 'story-2b',
        type: 'sticky',
        x: 360,
        y: 460,
        width: 100,
        height: 100,
        text: 'Save products for later checkouts',
        style: {
          fill: '#ffedd5',
          stroke: '#ea580c',
          textColor: '#7c2d12',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      'story-3b': {
        id: 'story-3b',
        type: 'sticky',
        x: 620,
        y: 460,
        width: 100,
        height: 100,
        text: 'Add alternative: PayPal checkout',
        style: {
          fill: '#ffedd5',
          stroke: '#ea580c',
          textColor: '#7c2d12',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      }
    }
  },
  {
    id: 'sysarch',
    name: 'System Architecture',
    description: 'A robust cloud system map showcasing a Client UI communicating through a secure API gateway to auth and microservices.',
    icon: 'Cpu',
    category: 'Engineering',
    elements: {
      'arch-client': {
        id: 'arch-client',
        type: 'rectangle',
        x: 50,
        y: 200,
        width: 140,
        height: 70,
        text: '📱 Client UI\n(React SPA Web)',
        style: {
          fill: '#f0fdfa',
          stroke: '#0d9488',
          textColor: '#0f766e',
          fontSize: 12,
          fontFamily: 'sans',
          borderRadius: '10px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'arch-gateway': {
        id: 'arch-gateway',
        type: 'rectangle',
        x: 270,
        y: 200,
        width: 140,
        height: 70,
        text: '⚡ API Gateway\n(Express/Reverse Proxy)',
        style: {
          fill: '#fffbeb',
          stroke: '#d97706',
          textColor: '#92400e',
          fontSize: 11,
          fontFamily: 'sans',
          borderRadius: '10px',
          shapeType: 'process'
        },
        version: 1,
        updatedBy: 'template'
      },
      'arch-auth': {
        id: 'arch-auth',
        type: 'rectangle',
        x: 490,
        y: 100,
        width: 140,
        height: 70,
        text: '🔒 Auth Microservice\n(OAuth / JWT Validate)',
        style: {
          fill: '#f0fdf4',
          stroke: '#16a34a',
          textColor: '#15803d',
          fontSize: 11,
          fontFamily: 'sans',
          borderRadius: '9999px',
          shapeType: 'start-end'
        },
        version: 1,
        updatedBy: 'template'
      },
      'arch-data': {
        id: 'arch-data',
        type: 'rectangle',
        x: 490,
        y: 300,
        width: 140,
        height: 70,
        text: '⚙️ Core Engine\n(Business API Logical)',
        style: {
          fill: '#f5f3ff',
          stroke: '#7c3aed',
          textColor: '#5b21b6',
          fontSize: 11,
          fontFamily: 'sans',
          borderRadius: '10px'
        },
        version: 1,
        updatedBy: 'template'
      },
      'arch-db': {
        id: 'arch-db',
        type: 'circle',
        x: 710,
        y: 285,
        width: 100,
        height: 100,
        text: '🗄️ PostgreSQL\nDatabase Cluster',
        style: {
          fill: '#fff1f2',
          stroke: '#f43f5e',
          textColor: '#9f1239',
          fontSize: 11,
          fontFamily: 'sans'
        },
        version: 1,
        updatedBy: 'template'
      },
      // Connectors
      'conn-1': {
        id: 'conn-1',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        text: 'HTTPS Requests',
        fromId: 'arch-client',
        toId: 'arch-gateway',
        style: {
          stroke: '#64748b',
          strokeWidth: 2
        },
        version: 1,
        updatedBy: 'template'
      },
      'conn-2': {
        id: 'conn-2',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        text: 'Validate Token',
        fromId: 'arch-gateway',
        toId: 'arch-auth',
        style: {
          stroke: '#64748b',
          strokeWidth: 2,
          strokeDasharray: '4,4'
        },
        version: 1,
        updatedBy: 'template'
      },
      'conn-3': {
        id: 'conn-3',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        text: 'Proxy Routes',
        fromId: 'arch-gateway',
        toId: 'arch-data',
        style: {
          stroke: '#64748b',
          strokeWidth: 2
        },
        version: 1,
        updatedBy: 'template'
      },
      'conn-4': {
        id: 'conn-4',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        text: 'SQL Queries',
        fromId: 'arch-data',
        toId: 'arch-db',
        style: {
          stroke: '#64748b',
          strokeWidth: 2
        },
        version: 1,
        updatedBy: 'template'
      }
    }
  }
];
