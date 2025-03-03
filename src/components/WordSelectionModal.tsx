import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Check, Loader2 } from 'lucide-react';
import { useStripeCheckout } from '../lib/stripe';
import { useProfile } from '../hooks/useProfile';
import { DraggableItem } from '../types';
import { Toast } from './Toast';
import { StripeCheckoutModal } from './StripeCheckoutModal';

interface WordSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DraggableItem[];
}

export function WordSelectionModal({ isOpen, onClose, items }: WordSelectionModalProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const { profile } = useProfile();
  const { checkout } = useStripeCheckout();

  // Filter out base elements and get only generated elements
  const generatedElements = items.filter(item => !item.isBaseElement && item.combinedFrom?.length >= 2);

  // Reset selected words when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWords([]);
      setShowStripeModal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleWordSelection = (wordName: string) => {
    if (selectedWords.includes(wordName)) {
      setSelectedWords(prev => prev.filter(word => word !== wordName));
    } else {
      setSelectedWords(prev => [...prev, wordName]);
    }
  };

  const totalPrice = (selectedWords.length * 1.99).toFixed(2);

  const handleCheckout = async () => {
    if (selectedWords.length === 0) {
      setToast({
        message: 'Please select at least one word to purchase',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (!profile?.id) {
      setToast({
        message: 'You must be logged in to make a purchase',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setLoading(true);
    setToast({
      message: 'Processing your purchase...',
      type: 'loading'
    });

    try {
      // Create a custom pack ID based on the number of words
      const customPackId = `custom_${selectedWords.length}_words`;
      
      // Show the Stripe checkout modal instead of redirecting
      setShowStripeModal(true);
      setToast(null);
      
    } catch (error) {
      console.error('Checkout error:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to process checkout',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[80vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Words to Purchase
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            {generatedElements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  You haven't generated any words yet. Combine elements to create words that you can purchase.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {generatedElements.map((element) => (
                  <div
                    key={element.id}
                    onClick={() => !loading && toggleWordSelection(element.name)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedWords.includes(element.name)
                        ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-400'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                        {typeof element.icon === 'string' ? element.icon : '💫'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{element.name}</p>
                        {element.rarity && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Rarity: {element.rarity}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {selectedWords.includes(element.name) ? (
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border border-gray-300 dark:border-gray-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selected: <span className="font-bold">{selectedWords.length}</span> words
                </p>
                <p className="text-lg font-bold">
                  Total: <span className="text-green-600 dark:text-green-400">${totalPrice}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  $1.99 per word
                </p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading || selectedWords.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>Checkout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
      
      {/* Stripe Checkout Modal */}
      {showStripeModal && (
        <StripeCheckoutModal
          isOpen={showStripeModal}
          onClose={() => {
            setShowStripeModal(false);
            onClose();
          }}
          packId={`custom_${selectedWords.length}_words`}
          packType="custom_words"
          amount={selectedWords.length}
          price={parseFloat(totalPrice)}
          title={`${selectedWords.length} Custom Words`}
          selectedWords={selectedWords}
        />
      )}
    </>
  );
}