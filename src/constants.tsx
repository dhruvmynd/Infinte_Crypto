import Groq from 'groq-sdk';
import { DraggableItem } from './types';

export const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
export const MAX_REQUESTS = 25; // Keep some buffer below the 30 RPM limit
export const COMBINATION_COOLDOWN = 2000; // 2 seconds cooldown between combinations
export const COMBINATION_DISTANCE = 40; // Distance threshold for combining elements
export const MAX_RETRIES = 5;
export const BASE_DELAY = 500; // Base delay in milliseconds

export const baseElements: DraggableItem[] = [
  // Original elements
  { id: 'water', name: 'Water', icon: '💧', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'fire', name: 'Fire', icon: '🔥', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'wind', name: 'Wind', icon: '💨', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'earth', name: 'Earth', icon: '🌍', position: null, connectedPoints: [], isBaseElement: true },
  
  // Crypto elements
  { id: 'bitcoin', name: 'Bitcoin', icon: '₿', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'ethereum', name: 'Ethereum', icon: 'Ξ', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'wallet', name: 'Wallet', icon: '👛', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'exchange', name: 'Exchange', icon: '🔄', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'token', name: 'Token', icon: '🪙', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'defi', name: 'DeFi', icon: '🏦', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'mining', name: 'Mining', icon: '⛏️', position: null, connectedPoints: [], isBaseElement: true },
  { id: 'blockchain', name: 'Blockchain', icon: '🔗', position: null, connectedPoints: [], isBaseElement: true }
];

// Common combinations with predefined emojis for faster response
export const combinationEmojis: Record<string, string> = {
  // Original combinations
  'Steam': '♨️',
  'River': '🌊',
  'Cloud': '☁️',
  'Magma': '🌋',
  'Smoke': '💨',
  'Storm': '⛈️',
  'Rain': '🌧️',
  'Lightning': '⚡',
  'Tornado': '🌪️',
  'Volcano': '🌋',
  'Ocean': '🌊',
  'Mountain': '⛰️',
  'Forest': '🌲',
  'Desert': '🏜️',
  'Ice': '🧊',
  'Snow': '❄️',
  'Fog': '🌫️',
  'Rainbow': '🌈',
  'Meteor': '☄️',
  'Aurora': '🌌',
  'Blaze': '🔥',
  'Marsh': '🥀',
  'Wave': '🌊',
  'Breeze': '🍃',
  'Flame': '🔥',
  'Dust': '💨',
  'Mist': '🌫️',
  'Frost': '❄️',
  'Thunder': '⛈️',
  'Avalanche': '🏔️',
  'Earthquake': '🌋',
  'Tsunami': '🌊',
  'Cyclone': '🌀',
  'Hurricane': '🌀',
  'Geyser': '♨️',
  
  // Crypto-related combinations
  'Cryptocurrency': '🪙',
  'Altcoin': '🌟',
  'Stablecoin': '🎯',
  'NFT': '🎨',
  'Smart Contract': '📜',
  'Gas Fee': '⛽',
  'Airdrop': '🪂',
  'Bull Market': '🐂',
  'Bear Market': '🐻',
  'Whale': '🐋',
  'Moon': '🌕',
  'Dex': '💱',
  'Yield Farm': '🌾',
  'Liquidity Pool': '🌊',
  'Staking': '📍',
  'Governance': '⚖️',
  'Hash Rate': '🔢',
  'Private Key': '🔑',
  'Seed Phrase': '🌱',
  'Cold Storage': '❄️',
  'Hot Wallet': '🔥',
  'Node': '📡',
  'Fork': '🍴',
  'ICO': '🚀',
  'HODL': '💎',
  'Pump': '📈',
  'Dump': '📉',
  'Mining Rig': '⚡',
  'Block': '🧊',
  'Mempool': '💾',
  'Validator': '✅',
  'Oracle': '🔮',
  'Bridge': '🌉',
  'Layer 2': '⚡',
  'Sidechain': '⛓️'
};

// Cache for generated emojis
const emojiCache: Record<string, string> = {};

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function getEmojiForCombination(word: string): Promise<string> {
  // Return predefined emoji if available
  if (combinationEmojis[word]) {
    return combinationEmojis[word];
  }

  // Return cached emoji if available
  if (emojiCache[word]) {
    return emojiCache[word];
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an emoji expert that selects the most appropriate single emoji for concepts. 
          STRICT RULES:
          1. MUST return EXACTLY ONE emoji character
          2. NO text, NO explanations
          3. Choose emoji that best represents the concept visually
          4. Prefer nature, element, and crypto-related emojis when applicable
          5. Consider the visual metaphor and symbolism
          6. If unsure, use related phenomena or symbols`
        },
        {
          role: 'user',
          content: `Select ONE emoji that best represents: ${word}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1,
      top_p: 1,
      stream: false
    });

    const emoji = completion.choices[0]?.message?.content?.trim() || '💫';
    
    // Cache the result
    emojiCache[word] = emoji;
    
    return emoji;
  } catch (error) {
    console.error('Error generating emoji:', error);
    return '💫'; // Fallback to sparkles if generation fails
  }
}