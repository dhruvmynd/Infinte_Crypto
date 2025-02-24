import React from 'react';
import { ShoppingBag, Clock, Lightbulb, Sparkles } from 'lucide-react';

interface PowerUpsPanelProps {
  onBuyWords: () => void;
  onGetTokens: () => void;
}

export function PowerUpsPanel({ onBuyWords, onGetTokens }: PowerUpsPanelProps) {
  return (
    <div className="absolute bottom-4 right-4 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Power Ups</h3>
      
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-1">
            <ShoppingBag className="w-6 h-6 text-yellow-500" />
          </div>
          <span className="text-xs text-center">Word Packs</span>
          <span className="text-xs font-bold">3</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-1">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xs text-center">Time</span>
          <span className="text-xs font-bold">2</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-1">
            <Lightbulb className="w-6 h-6 text-purple-500" />
          </div>
          <span className="text-xs text-center">Hint</span>
          <span className="text-xs font-bold">5</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-1">
            <Sparkles className="w-6 h-6 text-pink-500" />
          </div>
          <span className="text-xs text-center">Wild</span>
          <span className="text-xs font-bold">1</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>30 Found</span>
          <span>20 Remaining</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBuyWords}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Buy Words
        </button>
        <button
          onClick={onGetTokens}
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Get Tokens
        </button>
      </div>
    </div>
  );
}