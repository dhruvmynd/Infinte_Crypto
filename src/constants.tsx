import Groq from 'groq-sdk';
import { DraggableItem } from './types';

export const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
export const MAX_REQUESTS = 25; // Keep some buffer below the 30 RPM limit
export const COMBINATION_COOLDOWN = 2000; // 2 seconds cooldown between combinations
export const COMBINATION_DISTANCE = 40; // Distance threshold for combining elements
export const MAX_RETRIES = 5;
export const BASE_DELAY = 500; // Base delay in milliseconds

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const baseElements: DraggableItem[] = [
  // Original elements with multilingual names
  { 
    id: 'water', 
    name: 'Water', 
    translations: {
      es: 'Agua',
      fr: 'Eau',
      de: 'Wasser',
      zh: '水'
    },
    icon: '💧', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'fire', 
    name: 'Fire',
    translations: {
      es: 'Fuego',
      fr: 'Feu',
      de: 'Feuer',
      zh: '火'
    },
    icon: '🔥', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'wind', 
    name: 'Wind',
    translations: {
      es: 'Viento',
      fr: 'Vent',
      de: 'Wind',
      zh: '风'
    },
    icon: '💨', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'earth', 
    name: 'Earth',
    translations: {
      es: 'Tierra',
      fr: 'Terre',
      de: 'Erde',
      zh: '土'
    },
    icon: '🌍', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  
  // Crypto elements with translations
  { 
    id: 'bitcoin', 
    name: 'Bitcoin',
    translations: {
      es: 'Bitcoin',
      fr: 'Bitcoin',
      de: 'Bitcoin',
      zh: '比特币'
    },
    icon: '₿', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'ethereum', 
    name: 'Ethereum',
    translations: {
      es: 'Ethereum',
      fr: 'Ethereum',
      de: 'Ethereum',
      zh: '以太坊'
    },
    icon: 'Ξ', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'wallet', 
    name: 'Wallet',
    translations: {
      es: 'Cartera',
      fr: 'Portefeuille',
      de: 'Geldbörse',
      zh: '钱包'
    },
    icon: '👛', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'exchange', 
    name: 'Exchange',
    translations: {
      es: 'Intercambio',
      fr: 'Échange',
      de: 'Börse',
      zh: '交易所'
    },
    icon: '🔄', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'token', 
    name: 'Token',
    translations: {
      es: 'Token',
      fr: 'Jeton',
      de: 'Token',
      zh: '代币'
    },
    icon: '🪙', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'defi', 
    name: 'DeFi',
    translations: {
      es: 'DeFi',
      fr: 'DeFi',
      de: 'DeFi',
      zh: '去中心化金融'
    },
    icon: '🏦', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'mining', 
    name: 'Mining',
    translations: {
      es: 'Minería',
      fr: 'Minage',
      de: 'Mining',
      zh: '挖矿'
    },
    icon: '⛏️', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  },
  { 
    id: 'blockchain', 
    name: 'Blockchain',
    translations: {
      es: 'Blockchain',
      fr: 'Blockchain',
      de: 'Blockchain',
      zh: '区块链'
    },
    icon: '🔗', 
    position: null, 
    connectedPoints: [], 
    isBaseElement: true 
  }
];

// Common combinations with predefined emojis and translations
export const combinationEmojis: Record<string, { emoji: string; translations: Record<SupportedLanguage, string> }> = {
  'Steam': {
    emoji: '♨️',
    translations: {
      en: 'Steam',
      es: 'Vapor',
      fr: 'Vapeur',
      de: 'Dampf',
      zh: '蒸汽'
    }
  },
  'River': {
    emoji: '🌊',
    translations: {
      en: 'River',
      es: 'Río',
      fr: 'Rivière',
      de: 'Fluss',
      zh: '河流'
    }
  },
  'Cloud': {
    emoji: '☁️',
    translations: {
      en: 'Cloud',
      es: 'Nube',
      fr: 'Nuage',
      de: 'Wolke',
      zh: '云'
    }
  },
  // Add more combinations as needed...
};

// Cache for generated translations and emojis
const translationCache: Record<string, Record<SupportedLanguage, string>> = {};
const emojiCache: Record<string, string> = {};

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function getTranslationsForWord(word: string): Promise<Record<SupportedLanguage, string>> {
  // Return cached translations if available
  if (translationCache[word]) {
    return translationCache[word];
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a multilingual translator. Translate the given word into the following languages: Spanish (es), French (fr), German (de), and Chinese (zh). 
          STRICT RULES:
          1. MUST return a JSON object with language codes as keys
          2. Keep translations concise - single words when possible
          3. Maintain the meaning and context
          4. For Chinese, use simplified characters
          5. Format: {"es": "word", "fr": "word", "de": "word", "zh": "word"}`
        },
        {
          role: 'user',
          content: `Translate: ${word}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      stream: false
    });

    const translationsStr = completion.choices[0]?.message?.content?.trim() || '{}';
    const translations = JSON.parse(translationsStr) as Partial<Record<SupportedLanguage, string>>;
    
    // Ensure all languages are present
    const fullTranslations: Record<SupportedLanguage, string> = {
      en: word,
      es: translations.es || word,
      fr: translations.fr || word,
      de: translations.de || word,
      zh: translations.zh || word
    };
    
    // Cache the translations
    translationCache[word] = fullTranslations;
    
    return fullTranslations;
  } catch (error) {
    console.error('Error generating translations:', error);
    // Return original word for all languages if translation fails
    return {
      en: word,
      es: word,
      fr: word,
      de: word,
      zh: word
    };
  }
}

export async function getEmojiForCombination(word: string): Promise<string> {
  // Return predefined emoji if available
  if (combinationEmojis[word]) {
    return combinationEmojis[word].emoji;
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