import { useState, useRef } from 'react';
import Groq from 'groq-sdk';
import { DraggableItem } from '../types';
import { supabase } from '../lib/supabase';
import { useActivity } from './useActivity';
import { 
  RATE_LIMIT_WINDOW, 
  MAX_REQUESTS, 
  COMBINATION_COOLDOWN,
  getEmojiForCombination,
  getTranslationsForWord,
  SupportedLanguage
} from '../constants';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const requestTimes: number[] = [];

// Instant combinations for common element pairs
const INSTANT_COMBINATIONS: Record<string, Record<string, { word: string; translations: Record<SupportedLanguage, string> }>> = {
  'Water': {
    'Fire': {
      word: 'Steamforge',
      translations: {
        en: 'Steamforge',
        es: 'Forjavapor',
        fr: 'Forgevapeur',
        de: 'Dampfschmiede',
        zh: '蒸汽锻造'
      }
    },
    'Earth': {
      word: 'Mudweaver',
      translations: {
        en: 'Mudweaver',
        es: 'Tejelodo',
        fr: 'Tisseboue',
        de: 'Schlammweber',
        zh: '泥土编织'
      }
    },
    'Bitcoin': {
      word: 'Cryptoflow',
      translations: {
        en: 'Cryptoflow',
        es: 'Criptoflux',
        fr: 'Cryptoflux',
        de: 'Kryptofluss',
        zh: '加密流'
      }
    }
  },
  'Fire': {
    'Earth': {
      word: 'Magmacore',
      translations: {
        en: 'Magmacore',
        es: 'Nucleomagma',
        fr: 'Coeurmagma',
        de: 'Magmakern',
        zh: '岩浆核心'
      }
    },
    'Bitcoin': {
      word: 'Blazecoin',
      translations: {
        en: 'Blazecoin',
        es: 'Llamacoin',
        fr: 'Braisecoin',
        de: 'Flammenmünze',
        zh: '烈焰币'
      }
    }
  },
  'Earth': {
    'Bitcoin': {
      word: 'Geominer',
      translations: {
        en: 'Geominer',
        es: 'Geominero',
        fr: 'Géomineur',
        de: 'Geoschürfer',
        zh: '地矿者'
      }
    }
  }
};

// Word patterns for fallback generation
const PATTERNS = [
  { prefix: 'crypto', suffixes: ['verse', 'nexus', 'forge', 'pulse'] },
  { prefix: 'hydro', suffixes: ['nexus', 'forge', 'pulse', 'weave'] },
  { prefix: 'pyro', suffixes: ['forge', 'pulse', 'nexus', 'storm'] },
  { prefix: 'geo', suffixes: ['forge', 'pulse', 'nexus', 'core'] },
  { prefix: 'quantum', suffixes: ['forge', 'flux', 'weave', 'core'] },
  { prefix: 'cyber', suffixes: ['forge', 'pulse', 'nexus', 'core'] },
  { prefix: 'techno', suffixes: ['forge', 'pulse', 'weave', 'flux'] },
  { prefix: 'meta', suffixes: ['verse', 'forge', 'pulse', 'core'] }
];

export function useElementCombiner() {
  const [combining, setCombining] = useState(false);
  const [combiningPosition, setCombiningPosition] = useState<{ x: number, y: number } | null>(null);
  const combinationInProgressRef = useRef(false);
  const lastCombinationTimeRef = useRef<number>(0);
  const { trackActivity } = useActivity();

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    while (requestTimes.length > 0 && requestTimes[0] < now - RATE_LIMIT_WINDOW) {
      requestTimes.shift();
    }
    if (requestTimes.length < MAX_REQUESTS) {
      requestTimes.push(now);
      return true;
    }
    return false;
  };

  const updateCombinationCount = async (word: string, element1: string, element2: string) => {
    try {
      const { data: existing, error: selectError } = await supabase
        .from('element_combinations')
        .select('id, count')
        .eq('name', word)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('element_combinations')
          .update({ 
            count: existing.count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
          
        if (updateError) throw updateError;

        await trackActivity({
          activity_type: 'element_combined',
          details: {
            element_name: word,
            total_combinations: existing.count + 1,
            combined_from: [element1, element2]
          }
        });
      } else {
        const { error: insertError } = await supabase
          .from('element_combinations')
          .insert([{ 
            name: word, 
            count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) throw insertError;

        await trackActivity({
          activity_type: 'combination_discovered',
          details: {
            element_name: word,
            is_new: true,
            combined_from: [element1, element2]
          }
        });
      }
    } catch (error) {
      console.error('Error updating combination count:', error);
    }
  };

  const generateFallbackWord = (element1: string, element2: string): string => {
    const isEnergyRelated = element1.includes('Fire') || element2.includes('Fire');
    const isWaterRelated = element1.includes('Water') || element2.includes('Water');
    const isCryptoRelated = element1.includes('Bitcoin') || element2.includes('Bitcoin');
    const isEarthRelated = element1.includes('Earth') || element2.includes('Earth');

    let pattern;
    if (isEnergyRelated) {
      pattern = PATTERNS.find(p => p.prefix === 'pyro') || PATTERNS.find(p => p.prefix === 'quantum');
    } else if (isWaterRelated) {
      pattern = PATTERNS.find(p => p.prefix === 'hydro');
    } else if (isCryptoRelated) {
      pattern = PATTERNS.find(p => p.prefix === 'crypto') || PATTERNS.find(p => p.prefix === 'cyber');
    } else if (isEarthRelated) {
      pattern = PATTERNS.find(p => p.prefix === 'geo');
    } else {
      pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    }

    const suffix = pattern.suffixes[Math.floor(Math.random() * pattern.suffixes.length)];
    return pattern.prefix + suffix;
  };

  const getValidCombination = async (element1: string, element2: string): Promise<{ word: string; emoji: string; translations: Record<SupportedLanguage, string> }> => {
    try {
      // Check instant combinations first
      const instant1 = INSTANT_COMBINATIONS[element1]?.[element2];
      const instant2 = INSTANT_COMBINATIONS[element2]?.[element1];
      const instant = instant1 || instant2;

      if (instant) {
        await updateCombinationCount(instant.word, element1, element2);
        const emoji = await getEmojiForCombination(instant.word);
        return { word: instant.word, emoji, translations: instant.translations };
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a creative word generator for "Infinite Ideas.ai", a discovery game where players combine words to create new ones. The game spans ALL domains of human knowledge and culture.
          CORE MECHANICS:
          1. Output exactly ONE word (6-15 letters) when two words are combined.
          2. The resulting word must have a logical or thematic connection to the input words.
          3. Order doesn't matter (water + fire = fire + water).
          4. Same word cannot be combined with itself.
          EXPANSIVE WORD UNIVERSE:
          This game encompasses ALL domains of language including but not limited to:
          - Pop culture (TV shows, movies, video games, celebrities)
          - Music (genres, artists, instruments, songs)
          - Food and cuisine from all cultures
          - Countries, cities, and geographic locations
          - Sports and fitness concepts
          - Animals, plants, and natural phenomena
          - Historical periods and figures
          - Technology and innovation
          - Art, literature, and creative expression
          - Education and academic fields
          - Internet culture and memes
          - Scientific concepts (though not exclusively scientific)
          - Words from all eras of English and cultural slang
          COMBINATION PHILOSOPHY:
          - Words can combine based on literal meanings (water + flour = dough)
          - Cultural associations (crown + music = queen)
          - Thematic connections (sword + story = legend)
          - Visual similarities (circle + stick = lollipop)
          - Conceptual relationships (mystery + building = labyrinth)
          - Wordplay and linguistic connections are encouraged
          DISCOVERY PROGRESSION:
          - Start with basic elements but quickly branch into diverse domains
          - Allow cross-domain combinations (e.g., bitcoin + animal = dogecoin)
          - Enable pop culture references (e.g., sword + ring = excalibur)
          - Support combinations from different eras (e.g., ancient + digital = retrogame)
          RARITY SYSTEM:
          1. Common: Straightforward combinations
          2. Uncommon: Cross-domain combinations
          3. Rare: Multi-step combinations requiring several precursors
          4. Legendary: Highly specific cultural references or complex chains
          The goal is to create a rich universe of discoveries that represents the entirety of human knowledge and culture, making players feel rewarded for their creativity and cultural knowledge.`
          },
          {
            role: 'user',
            content: `Create ONE unique word (6-15 letters) combining ${element1} and ${element2}. ONLY return the word, nothing else.`
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.9, // Increased from 0.7 to encourage more creativity
        max_tokens: 10, // Increased from 5 to allow for longer words
        top_p: 1,
        stream: false
      });

      let newElement = completion.choices[0]?.message?.content?.trim();
      
      // Clean up the response
      if (newElement) {
        // Remove any punctuation or extra text
        newElement = newElement.replace(/[^a-zA-Z]/g, '');
        // Ensure first letter is capitalized
        newElement = newElement.charAt(0).toUpperCase() + newElement.slice(1).toLowerCase();
      }
      
      if (newElement && 
          newElement.length >= 6 && 
          newElement.length <= 15 && 
          /^[a-zA-Z]+$/.test(newElement)) {
        
        await updateCombinationCount(newElement, element1, element2);

        const [emoji, translations] = await Promise.all([
          getEmojiForCombination(newElement),
          getTranslationsForWord(newElement)
        ]);

        return { word: newElement, emoji, translations };
      }

      // Use fallback word generation
      const fallbackWord = generateFallbackWord(element1, element2);
      
      const [emoji, translations] = await Promise.all([
        getEmojiForCombination(fallbackWord),
        getTranslationsForWord(fallbackWord)
      ]);

      await updateCombinationCount(fallbackWord, element1, element2);

      return { word: fallbackWord, emoji, translations };
    } catch (error) {
      console.error('Error in combination attempt:', error);
      
      // Use fallback word generation
      const fallbackWord = generateFallbackWord(element1, element2);
      
      const [emoji, translations] = await Promise.all([
        getEmojiForCombination(fallbackWord),
        getTranslationsForWord(fallbackWord)
      ]);

      await updateCombinationCount(fallbackWord, element1, element2);

      return { word: fallbackWord, emoji, translations };
    }
  };

  const canCombine = (element1: DraggableItem, element2: DraggableItem): boolean => {
    const now = Date.now();
    if (element1.lastCombined && now - element1.lastCombined < COMBINATION_COOLDOWN) return false;
    if (element2.lastCombined && now - element2.lastCombined < COMBINATION_COOLDOWN) return false;
    if (now - lastCombinationTimeRef.current < COMBINATION_COOLDOWN) return false;
    return true;
  };

  return {
    combining,
    combiningPosition,
    setCombining,
    setCombiningPosition,
    combinationInProgressRef,
    lastCombinationTimeRef,
    checkRateLimit,
    canCombine,
    getValidCombination
  };
}