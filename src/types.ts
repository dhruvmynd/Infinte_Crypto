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
  rarity?: Rarity;
  domain?: string;
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';

export interface WordFormationResult {
  word: string;
  emoji: string;
  rarity: Rarity;
  domain: string;
  translations: Record<string, string>;
}

export interface CombinationPattern {
  prefixes: string[];
  suffixes: string[];
  examples: Record<string, string>;
}

// Stripe related types
declare global {
  interface Window {
    Stripe?: (apiKey: string) => {
      redirectToCheckout: (options: { sessionId: string }) => Promise<{ error?: { message: string } }>;
      elements: () => any;
      createPaymentMethod: (options: any) => Promise<any>;
    };
  }
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  error?: {
    message: string;
  };
}

export interface WordPackPurchase {
  id: string;
  user_id: string;
  pack_id: string;
  amount: number;
  price: number;
  status: 'pending' | 'completed' | 'cancelled';
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}