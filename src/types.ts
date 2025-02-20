import { ReactNode } from 'react';
import { SupportedLanguage } from './constants';

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
  translations?: Partial<Record<SupportedLanguage, string>>;
  icon: ReactNode | string;
  position: { x: number; y: number } | null;
  connectedPoints: Point[];
  lastCombined?: number;
  isBaseElement?: boolean;
  combinedFrom?: string[]; // Track the elements used to create this combination
}