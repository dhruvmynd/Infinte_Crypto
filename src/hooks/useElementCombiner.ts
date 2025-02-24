import { useState, useRef } from 'react';
import Groq from 'groq-sdk';
import { DraggableItem } from '../types';
import { supabase } from '../lib/supabase';
import { useActivity } from './useActivity';
import { 
  RATE_LIMIT_WINDOW, 
  MAX_REQUESTS, 
  COMBINATION_COOLDOWN, 
  MAX_RETRIES, 
  BASE_DELAY, 
  getEmojiForCombination,
  getTranslationsForWord,
  SupportedLanguage
} from '../constants';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const requestTimes: number[] = [];

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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const updateCombinationCount = async (word: string, element1: string, element2: string) => {
    try {
      console.log('Updating combination count for:', word);
      
      const { data: existing, error: selectError } = await supabase
        .from('element_combinations')
        .select('id, count')
        .eq('name', word)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        console.log('Existing combination found:', existing);
        const { error: updateError } = await supabase
          .from('element_combinations')
          .update({ 
            count: existing.count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
          
        if (updateError) throw updateError;

        // Track the combination activity
        await trackActivity({
          activity_type: 'element_combined',
          details: {
            element_name: word,
            total_combinations: existing.count + 1,
            combined_from: [element1, element2]
          }
        });
      } else {
        console.log('Creating new combination entry');
        const { error: insertError } = await supabase
          .from('element_combinations')
          .insert([{ 
            name: word, 
            count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) throw insertError;

        // Track the new combination discovery
        await trackActivity({
          activity_type: 'combination_discovered',
          details: {
            element_name: word,
            is_new: true,
            combined_from: [element1, element2]
          }
        });
      }
      
      console.log('Successfully updated combination count');
    } catch (error) {
      console.error('Error updating combination count:', error);
      // Don't throw the error - allow the combination to proceed even if tracking fails
    }
  };

  const getFallbackWord = (element1: string, element2: string): { word: string; translations: Record<SupportedLanguage, string> } => {
    const fallbacks: Record<string, Record<string, { word: string; translations: Record<SupportedLanguage, string> }>> = {
      'Water': {
        'Fire': {
          word: 'Steam',
          translations: {
            en: 'Steam',
            es: 'Vapor',
            fr: 'Vapeur',
            de: 'Dampf',
            zh: '蒸汽'
          }
        },
        'Earth': {
          word: 'River',
          translations: {
            en: 'River',
            es: 'Río',
            fr: 'Rivière',
            de: 'Fluss',
            zh: '河流'
          }
        }
      }
    };
    
    const fallback = fallbacks[element1]?.[element2] || fallbacks[element2]?.[element1];
    
    if (fallback) {
      return fallback;
    }

    return {
      word: 'Force',
      translations: {
        en: 'Force',
        es: 'Fuerza',
        fr: 'Force',
        de: 'Kraft',
        zh: '力量'
      }
    };
  };

  const getValidCombination = async (element1: string, element2: string, attempt = 1): Promise<{ word: string; emoji: string; translations: Record<SupportedLanguage, string> }> => {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a creative assistant that combines elements to create new ones. STRICT RULES:
            1. MUST output EXACTLY ONE word
            2. Word MUST be 4-15 letters long
            3. Word MUST be a real English word
            4. Word MUST logically relate to BOTH input elements
            5. NO abbreviations, NO made-up words
            6. Prefer natural phenomena or physical states
            7. Examples of good combinations:
               - Water + Fire = Steam
               - Wind + Earth = Storm
               - Fire + Earth = Magma
               - Water + Wind = Cloud
               - Fire + Wind = Smoke
               - Earth + Water = River
               - Wind + Fire = Blaze
               - Water + Earth = Marsh
            8. NEVER return empty or invalid responses
            9. If unsure, use a common natural phenomenon`
          },
          {
            role: 'user',
            content: `Combine ${element1} and ${element2} into ONE meaningful word (4-15 letters). MUST be a real, logical word.`
          }
        ],
        model: 'llama-3.2-1b-preview',
        temperature: 0.7 + (attempt * 0.1),
        max_tokens: 1,
        top_p: 1,
        stream: false
      });

      const newElement = completion.choices[0]?.message?.content?.trim();
      
      if (newElement && 
          newElement.length >= 6 && 
          newElement.length <= 15 && 
          /^[a-zA-Z]+$/.test(newElement)) {
        
        // Update combination count BEFORE getting emoji and translations
        await updateCombinationCount(newElement, element1, element2);

        const [emoji, translations] = await Promise.all([
          getEmojiForCombination(newElement),
          getTranslationsForWord(newElement)
        ]);

        return { word: newElement, emoji, translations };
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
        return getValidCombination(element1, element2, attempt + 1);
      }

      const fallback = getFallbackWord(element1, element2);
      const emoji = await getEmojiForCombination(fallback.word);

      // Update combination count for fallback word
      await updateCombinationCount(fallback.word, element1, element2);

      return { word: fallback.word, emoji, translations: fallback.translations };
    } catch (error) {
      console.error('Error in combination attempt:', error);
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
        return getValidCombination(element1, element2, attempt + 1);
      }

      const fallback = getFallbackWord(element1, element2);
      const emoji = await getEmojiForCombination(fallback.word);

      // Update combination count for fallback word
      await updateCombinationCount(fallback.word, element1, element2);

      return { word: fallback.word, emoji, translations: fallback.translations };
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