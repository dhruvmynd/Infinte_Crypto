import { ReactNode } from 'react';

export interface Point {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastUpdate: number;
}

export interface DraggableItem {
  id: string;
  name: string;
  icon: ReactNode | string;
  position: { x: number; y: number } | null;
  connectedPoints: Point[];
  lastCombined?: number;
  isBaseElement?: boolean;
  combinedFrom?: string[]; // Track the elements used to create this combination
}