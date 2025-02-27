import React, { useState } from 'react';
import { ShoppingBag, Clock, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { usePurchases } from '../hooks/usePurchases';
import { useTokens } from '../hooks/useTokens';
import { Toast } from './Toast';

interface PowerUpsPanelProps {
  onBuyWords: () => void;
  onGetTokens: () => void;
}

export function PowerUpsPanel({ onBuyWords, onGetTokens }: PowerUpsPanelProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'words' | 'tokens'>('words');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  
  const { totals } = usePurchases();
  const { tokenBalance, useTokens, hasEnoughTokens } = useTokens();

  const handleBuyWords = () => {
    setCheckoutType('words');
    setIsCheckoutOpen(true);
    onBuyWords();
  };

  const handleGetTokens = () => {
    setCheckoutType('tokens');
    setIsCheckoutOpen(true);
    onGetTokens();
  };

  const handleUseHint = () => {
    const hintCost = 10; // 10 tokens for a hint
    
    if (!hasEnoughTokens(hintCost)) {
      setToast({
        message: `Not enough tokens! You need ${hintCost} tokens to use a hint.`,
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    // Use tokens and show success message if successful
    if (useTokens(hintCost)) {
      setToast({
        message: `Hint used! ${hintCost} tokens deducted.`,
        type: 'success'
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Power Ups</h3>
      
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-1">
            <ShoppingBag className="w-6 h-6 text-yellow-500" />
          </div>
          <span className="text-xs text-center">Word Packs</span>
          <span className="text-xs font-bold">
            {totals.isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              totals.words
            )}
          </span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-1">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xs text-center">Time</span>
          <span className="text-xs font-bold">2</span>
        </div>
        
        <div 
          className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleUseHint}
        >
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
          <span className="text-xs text-center">Tokens</span>
          <span className="text-xs font-bold">
            {tokenBalance}
          </span>
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
          onClick={handleBuyWords}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Buy Words
        </button>
        <button
          onClick={handleGetTokens}
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Get Tokens
        </button>
      </div>
      
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        type={checkoutType}
      />
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}