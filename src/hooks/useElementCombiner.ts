import { useState, useRef } from 'react';
import Groq from 'groq-sdk';
import { DraggableItem } from '../types';
import { RATE_LIMIT_WINDOW, MAX_REQUESTS, COMBINATION_COOLDOWN, MAX_RETRIES, BASE_DELAY, getEmojiForCombination } from '../constants';

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

  const getFallbackWord = (element1: string, element2: string): string => {
    const fallbacks: Record<string, Record<string, string>> = {
      'Water': {
        'Fire': 'Steam',
        'Earth': 'River',
        'Wind': 'Cloud'
      },
      'Fire': {
        'Water': 'Steam',
        'Earth': 'Magma',
        'Wind': 'Smoke'
      },
      'Earth': {
        'Water': 'River',
        'Fire': 'Magma',
        'Wind': 'Storm'
      },
      'Wind': {
        'Water': 'Cloud',
        'Fire': 'Smoke',
        'Earth': 'Storm'
      }
    };

    return fallbacks[element1]?.[element2] || 
           fallbacks[element2]?.[element1] || 
           'Force';
  };

  const getValidCombination = async (element1: string, element2: string, attempt = 1): Promise<{ word: string; emoji: string }> => {
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
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7 + (attempt * 0.1),
        max_tokens: 1,
        top_p: 1,
        stream: false
      });

      const newElement = completion.choices[0]?.message?.content?.trim();
      
      if (newElement && 
          newElement.length >= 4 && 
          newElement.length <= 15 && 
          /^[a-zA-Z]+$/.test(newElement)) {
        const emoji = await getEmojiForCombination(newElement);
        return { word: newElement, emoji };
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
        return getValidCombination(element1, element2, attempt + 1);
      }

      return { word: getFallbackWord(element1, element2), emoji: '💫' };
    } catch (error) {
      console.error('Error in combination attempt:', error);
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
        return getValidCombination(element1, element2, attempt + 1);
      }
      return { word: getFallbackWord(element1, element2), emoji: '💫' };
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