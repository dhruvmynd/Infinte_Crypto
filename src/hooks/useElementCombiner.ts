import { useState, useRef } from 'react';
import Groq from 'groq-sdk';
import { DraggableItem, Rarity } from '../types';
import { supabase } from '../lib/supabase';
import { useActivity } from './useActivity';
import { 
  RATE_LIMIT_WINDOW, 
  MAX_REQUESTS, 
  COMBINATION_COOLDOWN,
  getEmojiForCombination,
  getTranslationsForWord,
  SupportedLanguage,
  getDomain
} from '../constants';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const requestTimes: number[] = [];

// Instant combinations for common element pairs
const INSTANT_COMBINATIONS: Record<string, Record<string, { word: string; emoji: string; translations: Record<SupportedLanguage, string> }>> = {
  'Water': {
    'Fire': {
      word: 'Steam',
      emoji: '♨️',
      translations: {
        en: 'Steam',
        es: 'Vapor',
        fr: 'Vapeur',
        de: 'Dampf',
        zh: '蒸汽'
      }
    },
    'Earth': {
      word: 'Mud',
      emoji: '💧',
      translations: {
        en: 'Mud',
        es: 'Lodo',
        fr: 'Boue',
        de: 'Schlamm',
        zh: '泥'
      }
    },
    'Bitcoin': {
      word: 'Liquidcoin',
      emoji: '💧₿',
      translations: {
        en: 'Liquidcoin',
        es: 'Monedalíquida',
        fr: 'Liquidecoin',
        de: 'Flüssigmünze',
        zh: '流动币'
      }
    }
  },
  'Fire': {
    'Earth': {
      word: 'Magma',
      emoji: '🌋',
      translations: {
        en: 'Magma',
        es: 'Magma',
        fr: 'Magma',
        de: 'Magma',
        zh: '岩浆'
      }
    },
    'Bitcoin': {
      word: 'Burnchain',
      emoji: '🔥₿',
      translations: {
        en: 'Burnchain',
        es: 'Quemacadena',
        fr: 'Brûlechain',
        de: 'Brennkette',
        zh: '燃烧链'
      }
    }
  },
  'Earth': {
    'Bitcoin': {
      word: 'Digicoin',
      emoji: '⛏️',
      translations: {
        en: 'Digicoin',
        es: 'Excavacoin',
        fr: 'Creusecoin',
        de: 'Grabmünze',
        zh: '挖掘币'
      }
    }
  }
};

// Add rarity determination function
const determineRarity = (element1: string, element2: string): Rarity => {
  const domain1 = getDomain(element1);
  const domain2 = getDomain(element2);
  
  if (domain1 === domain2) return 'Common';
  if ((domain1 === 'TECH' && domain2 === 'NATURE') || 
      (domain1 === 'NATURE' && domain2 === 'TECH')) return 'Uncommon';
  if (domain1 === 'MYTHOLOGY' || domain2 === 'MYTHOLOGY') return 'Rare';
  return 'Legendary';
};

// Simple word patterns for fallback generation
const SIMPLE_WORDS = [
  // Nature-related
  'Dew', 'Mist', 'Moss', 'Peat', 'Silt', 'Clay', 'Ash', 'Coal', 'Lava', 'Rock',
  // Tech-related
  'Coin', 'Hash', 'Node', 'Mine', 'Data', 'Code', 'Bit', 'Net', 'Web', 'App',
  // Combinations
  'Blend', 'Fuse', 'Merge', 'Bond', 'Link', 'Join', 'Mix', 'Meld', 'Weld', 'Bind'
];

// Emoji mappings for simple words
const SIMPLE_WORD_EMOJIS: Record<string, string> = {
  'Dew': '💧', 'Mist': '🌫️', 'Moss': '🌿', 'Peat': '🟤', 'Silt': '🟫', 
  'Clay': '🏺', 'Ash': '🔥', 'Coal': '⚫', 'Lava': '🌋', 'Rock': '🪨',
  'Coin': '🪙', 'Hash': '#️⃣', 'Node': '🔄', 'Mine': '⛏️', 'Data': '📊', 
  'Code': '👨‍💻', 'Bit': '💾', 'Net': '🌐', 'Web': '🕸️', 'App': '📱',
  'Blend': '🔄', 'Fuse': '⚡', 'Merge': '🔀', 'Bond': '🔗', 'Link': '🔗', 
  'Join': '🤝', 'Mix': '🔄', 'Meld': '🔄', 'Weld': '🔥', 'Bind': '📎'
};

// Thematic word combinations based on domains
const THEMATIC_COMBINATIONS: Record<string, string[]> = {
  'NATURE_NATURE': ['Biome', 'Gaia', 'Bloom', 'Terrain', 'Oasis', 'Fauna', 'Flora'],
  'TECH_TECH': ['Codec', 'Nexus', 'Pixel', 'Byte', 'Cache', 'Chip', 'Grid'],
  'NATURE_TECH': ['Ecotech', 'Bionet', 'Geobit', 'Terrabyte', 'Aquacode', 'Pyrodata'],
  'NATURE_CULTURE': ['Artscape', 'Songbird', 'Rhythmleaf', 'Flamedance', 'Aquaverse'],
  'TECH_CULTURE': ['Dataart', 'Pixelsong', 'Cryptomedia', 'Bitfilm', 'Netdance'],
  'MYTHOLOGY_NATURE': ['Spiritwood', 'Soulwater', 'Dragonfire', 'Titanearth', 'Mythriver'],
  'MYTHOLOGY_TECH': ['Spellcode', 'Mythbit', 'Magicnet', 'Souldata', 'Legendgrid'],
  'SCIENCE_NATURE': ['Atomleaf', 'Molequa', 'Fusionfire', 'Energearth', 'Bioflux'],
  'SCIENCE_TECH': ['Quantumbit', 'Dataflux', 'Atomcode', 'Molenet', 'Labgrid'],
  'ELEMENTAL_TECH': ['Firebit', 'Aquacode', 'Terranet', 'Winddata', 'Frostbyte'],
  'ELEMENTAL_NATURE': ['Blazeleaf', 'Aquaflora', 'Terramoss', 'Windwood', 'Frostbloom'],
  'ELEMENTAL_ELEMENTAL': ['Pyroflow', 'Hydroblaze', 'Geostorm', 'Aeroflame', 'Cryoburn']
};

// Function to generate a fallback word and emoji
const generateFallbackWord = (element1: string, element2: string): { word: string; emoji: string } => {
  // Determine domains for thematic combinations
  const domain1 = getDomain(element1);
  const domain2 = getDomain(element2);
  const domainKey = `${domain1}_${domain2}`;
  const reverseDomainKey = `${domain2}_${domain1}`;
  
  // Try to get a thematic word based on domains
  const thematicWords = THEMATIC_COMBINATIONS[domainKey] || THEMATIC_COMBINATIONS[reverseDomainKey];
  
  if (thematicWords && thematicWords.length > 0) {
    const word = thematicWords[Math.floor(Math.random() * thematicWords.length)];
    return { 
      word, 
      emoji: getRelevantEmoji(domain1, domain2)
    };
  }
  
  // If no thematic word is found, use a simple word
  const word = SIMPLE_WORDS[Math.floor(Math.random() * SIMPLE_WORDS.length)];
  return { 
    word, 
    emoji: SIMPLE_WORD_EMOJIS[word] || getRelevantEmoji(domain1, domain2)
  };
};

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

        // Safely track activity, catching any errors
        try {
          await trackActivity({
            activity_type: 'element_combined',
            details: {
              element_name: word,
              total_combinations: existing.count + 1,
              combined_from: [element1, element2]
            }
          });
        } catch (activityError) {
          console.log('Activity tracking error (non-critical):', activityError);
          // Continue execution even if activity tracking fails
        }
      } else {
        const { error: insertError } = await supabase
          .from('element_combinations')
          .insert([{ 
            name: word, 
            count: 1,
            created_at: new Date(). toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) throw insertError;

        // Safely track activity, catching any errors
        try {
          await trackActivity({
            activity_type: 'combination_discovered',
            details: {
              element_name: word,
              is_new: true,
              combined_from: [element1, element2]
            }
          });
        } catch (activityError) {
          console.log('Activity tracking error (non-critical):', activityError);
          // Continue execution even if activity tracking fails
        }
      }
    } catch (error) {
      console.log('Error updating combination count (non-critical):', error);
      // Continue execution even if database operations fail
    }
  };

  const getValidCombination = async (element1: string, element2: string): Promise<{ word: string; emoji: string; translations: Record<SupportedLanguage, string>; rarity: Rarity; domain: string }> => {
    try {
      // Check instant combinations first
      const instant1 = INSTANT_COMBINATIONS[element1]?.[element2];
      const instant2 = INSTANT_COMBINATIONS[element2]?.[element1];
      const instant = instant1 || instant2;

      if (instant) {
        // Use a non-blocking approach for database operations
        updateCombinationCount(instant.word, element1, element2).catch(err => {
          console.log('Non-critical database error:', err);
        });
        
        return {
          word: instant.word,
          emoji: instant.emoji,
          translations: instant.translations,
          rarity: determineRarity(element1, element2),
          domain: `${getDomain(element1)}_${getDomain(element2)}`
        };
      }

      // Determine domains for emoji selection
      const domain1 = getDomain(element1);
      const domain2 = getDomain(element2);

      // Try to get a word from the AI
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a creative word generator for "Infinite Ideas.ai", a discovery game where players combine words to create new ones. The game spans ALL domains of human knowledge and culture.
            CORE MECHANICS:
            1. Output exactly ONE word (3-15 letters) when two words are combined.
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
              content: `Create ONE unique word (3-15 letters) combining ${element1} and ${element2}. ONLY return the word, nothing else. Prefer shorter, memorable words when possible.`
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_tokens: 10,
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
            newElement.length >= 3 && 
            newElement.length <= 15 && 
            /^[a-zA-Z]+$/.test(newElement)) {
          
          // Use a non-blocking approach for database operations
          updateCombinationCount(newElement, element1, element2).catch(err => {
            console.log('Non-critical database error:', err);
          });
    
          const [emoji, translations] = await Promise.all([
            getEmojiForCombination(newElement),
            getTranslationsForWord(newElement)
          ]);
    
          return {
            word: newElement,
            emoji,
            translations,
            rarity: determineRarity(element1, element2),
            domain: `${domain1}_${domain2}`
          };
        }
      } catch (aiError) {
        console.log('AI generation error, using fallback:', aiError);
        // Continue to fallback if AI generation fails
      }

      // Use fallback word generation
      const { word: fallbackWord, emoji } = generateFallbackWord(element1, element2);
      const translations = await getTranslationsForWord(fallbackWord);

      // Use a non-blocking approach for database operations
      updateCombinationCount(fallbackWord, element1, element2).catch(err => {
        console.log('Non-critical database error:', err);
      });

      return {
        word: fallbackWord,
        emoji,
        translations,
        rarity: determineRarity(element1, element2),
        domain: `${domain1}_${domain2}`
      };
    } catch (error) {
      console.log('Error in combination attempt, using simple fallback:', error);
        
      // Use simplest possible fallback that won't fail
      const domain1 = getDomain(element1);
      const domain2 = getDomain(element2);
      const fallbackWord = SIMPLE_WORDS[Math.floor(Math.random() * SIMPLE_WORDS.length)];
      const emoji = SIMPLE_WORD_EMOJIS[fallbackWord] || getRelevantEmoji(domain1, domain2);
      
      try {
        const translations = await getTranslationsForWord(fallbackWord);

        return {
          word: fallbackWord,
          emoji,
          translations,
          rarity: 'Common',
          domain: 'UNKNOWN_UNKNOWN'
        };
      } catch (finalError) {
        // Absolute last resort fallback that can't fail
        return {
          word: 'Blend',
          emoji: '🔄',
          translations: {
            en: 'Blend',
            es: 'Mezcla',
            fr: 'Mélange',
            de: 'Mischung',
            zh: '混合'
          },
          rarity: 'Common',
          domain: 'UNKNOWN_UNKNOWN'
        };
      }
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