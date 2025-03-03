import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Check, Loader2, CreditCard, Lock } from 'lucide-react';
import { useStripeCheckout } from '../lib/stripe';
import { useProfile } from '../hooks/useProfile';
import { DraggableItem } from '../types';
import { Toast } from './Toast';

interface WordSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DraggableItem[];
}

interface StripeCardElement {
  mount: (element: HTMLElement) => void;
  unmount: () => void;
  on: (event: string, callback: (event: any) => void) => void;
  update: (options: any) => void;
}

export function WordSelectionModal({ isOpen, onClose, items }: WordSelectionModalProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  
  const { profile } = useProfile();
  const { checkout } = useStripeCheckout();
  
  // Refs for Stripe elements
  const cardElementRef = React.useRef<HTMLDivElement>(null);
  const stripeCardRef = React.useRef<StripeCardElement | null>(null);
  const stripeRef = React.useRef<any>(null);
  const stripeElementsRef = React.useRef<any>(null);

  // Filter out base elements and get only generated elements
  const generatedElements = items.filter(item => !item.isBaseElement && item.combinedFrom?.length >= 2);

  // Reset selected words when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWords([]);
      setShowCheckout(false);
      setCardComplete(false);
      setProcessing(false);
      setPaymentError(null);
      setEmail('');
      
      // Initialize Stripe if it's not already initialized
      if (!stripeRef.current && window.Stripe) {
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (stripeKey) {
          stripeRef.current = window.Stripe(stripeKey);
        }
      }
    } else {
      // Clean up Stripe elements when modal closes
      if (stripeCardRef.current) {
        stripeCardRef.current.unmount();
        stripeCardRef.current = null;
      }
      if (stripeElementsRef.current) {
        stripeElementsRef.current = null;
      }
    }
  }, [isOpen]);

  // Initialize Stripe elements when showing checkout
  useEffect(() => {
    if (showCheckout && cardElementRef.current && stripeRef.current && !stripeCardRef.current) {
      // Create Elements instance
      stripeElementsRef.current = stripeRef.current.elements();
      
      // Create Card element
      stripeCardRef.current = stripeElementsRef.current.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#32325d',
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
          },
        },
      });
      
      // Mount Card element
      stripeCardRef.current.mount(cardElementRef.current);
      
      // Listen for changes
      stripeCardRef.current.on('change', (event: any) => {
        setCardComplete(event.complete);
        if (event.error) {
          setPaymentError(event.error.message);
        } else {
          setPaymentError(null);
        }
      });
    }
    
    return () => {
      // Clean up on unmount
      if (!showCheckout && stripeCardRef.current) {
        stripeCardRef.current.unmount();
        stripeCardRef.current = null;
      }
    };
  }, [showCheckout]);

  if (!isOpen) return null;

  const toggleWordSelection = (wordName: string) => {
    if (selectedWords.includes(wordName)) {
      setSelectedWords(prev => prev.filter(word => word !== wordName));
    } else {
      setSelectedWords(prev => [...prev, wordName]);
    }
  };

  const totalPrice = (selectedWords.length * 1.99).toFixed(2);

  const handleProceedToCheckout = () => {
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

    setShowCheckout(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripeRef.current || !stripeElementsRef.current || !stripeCardRef.current) {
      setPaymentError('Stripe has not been properly initialized');
      return;
    }
    
    if (!cardComplete) {
      setPaymentError('Please complete your card information');
      return;
    }
    
    if (!email) {
      setPaymentError('Please enter your email address');
      return;
    }
    
    setProcessing(true);
    setPaymentError(null);
    
    try {
      // Create a custom pack ID based on the number of words
      const customPackId = `custom_${selectedWords.length}_words`;
      
      // Create a payment method
      const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
        type: 'card',
        card: stripeCardRef.current,
        billing_details: {
          email: email,
        },
      });
      
      if (error) {
        setPaymentError(error.message);
        setProcessing(false);
        return;
      }
      
      // Pass the payment method ID to your server
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          amount: parseFloat(totalPrice) * 100, // Convert to cents
          email: email,
          packId: customPackId,
          packType: 'custom_words',
          userId: profile.id,
          selectedWords: selectedWords,
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        setPaymentError(result.error);
        setProcessing(false);
        return;
      }
      
      // Show success message
      setToast({
        message: 'Payment successful! Your words have been added to your account.',
        type: 'success'
      });
      
      // Close modal after a delay
      setTimeout(() => {
        onClose();
        setToast(null);
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError(err instanceof Error ? err.message : 'An error occurred during payment processing');
      setProcessing(false);
    }
  };

  // Fallback to redirect checkout if Stripe.js is not available
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
      
      // Pass the selected words as metadata
      await checkout(customPackId, 'custom_words', selectedWords);
      
      // Note: The user will be redirected to Stripe by the checkout function
    } catch (error) {
      console.error('Checkout error:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to process checkout',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      setLoading(false);
    }
  };

  const renderWordSelectionView = () => (
    <>
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
            onClick={handleProceedToCheckout}
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
                <CreditCard size={18} />
                <span>Proceed to Checkout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );

  const renderCheckoutView = () => (
    <>
      <div className="p-6 overflow-y-auto flex-1">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-300">Selected Words:</span>
              <span className="font-medium">{selectedWords.length}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-300">Price per Word:</span>
              <span className="font-medium">$1.99</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-green-600 dark:text-green-400">${totalPrice}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitPayment}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="card-element" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Card Details
              </label>
              <div 
                id="card-element"
                ref={cardElementRef}
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700"
              />
              {paymentError && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {paymentError}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCheckout(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={processing}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!cardComplete || processing || !email}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Pay ${totalPrice}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Lock size={14} />
          <span>Secure payment powered by Stripe</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {showCheckout ? 'Checkout' : 'Select Words to Purchase'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={loading || processing}
          >
            <X size={20} />
          </button>
        </div>
        
        {showCheckout ? renderCheckoutView() : renderWordSelectionView()}
      </div>
      
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