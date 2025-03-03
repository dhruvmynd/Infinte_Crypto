import React, { useState, useEffect } from 'react';
import { X, CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useAddress } from "@thirdweb-dev/react";
import { useAuth } from '../hooks/useAuth';
import { Toast } from './Toast';
import { supabase } from '../lib/supabase';
import { useTokens } from '../hooks/useTokens';

interface StripeCheckoutFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWords: string[];
  onSuccess: () => void;
  tokenPackage?: {
    id: string;
    name: string;
    description: string;
    price: number;
    amount: number;
  };
}

export function StripeCheckoutForm({ isOpen, onClose, selectedWords, onSuccess, tokenPackage }: StripeCheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  const { addTokens } = useTokens();

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setLoading(false);
      setError(null);
      setSuccess(false);
      setEmail(user?.email || '');
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setName('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Determine if this is a token purchase or word purchase
  const isTokenPurchase = !!tokenPackage;
  const totalPrice = isTokenPurchase 
    ? tokenPackage.price.toFixed(2)
    : (selectedWords.length * 1.99).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      setError('You must be logged in to make a purchase');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      setToast({
        message: 'Processing your purchase...',
        type: 'loading'
      });
      
      // Determine the pack ID and type
      const packId = isTokenPurchase 
        ? tokenPackage.id 
        : `custom_${selectedWords.length}_words`;
      
      const packType = isTokenPurchase ? 'tokens' : 'custom_words';
      
      // Call your API to create a checkout session
      const response = await fetch(`${import.meta.env.VITE_API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId,
          packType,
          userId: profile.id,
          selectedWords: isTokenPurchase ? undefined : selectedWords,
          directPayment: true // Flag to indicate this is a direct payment
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', errorText);
        throw new Error(errorText || 'Failed to create checkout session');
      }
      
      const session = await response.json();
      console.log('Checkout session created:', session);
      
      // Simulate payment processing with the test card
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a record in the database
      try {
        const { error } = await supabase
          .from('word_pack_purchases')
          .insert({
            user_id: profile.id,
            pack_id: packId,
            amount: isTokenPurchase ? tokenPackage.amount : selectedWords.length,
            price: parseFloat(totalPrice),
            status: 'completed',
            stripe_session_id: session.id || `sim_${Date.now()}_${packId}`,
            metadata: isTokenPurchase ? null : { selectedWords }
          });
          
        if (error) {
          console.error('Error creating purchase record:', error);
        } else {
          console.log('Created purchase record');
          
          // If this is a token purchase, add tokens to the user's balance
          if (isTokenPurchase) {
            addTokens(tokenPackage.amount);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue with checkout even if database operation fails
      }
      
      // Show success message
      setSuccess(true);
      setToast({
        message: 'Purchase completed successfully!',
        type: 'success'
      });
      
      // Close modal and notify parent after a delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during checkout');
      setToast({
        message: 'Payment failed. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          disabled={loading}
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Complete Your Purchase
          </h2>
          
          <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            {isTokenPurchase ? (
              <div>
                <h3 className="font-semibold mb-2">{tokenPackage.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{tokenPackage.description}</p>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600 dark:text-green-400">${totalPrice}</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Selected Words:</span>
                  <span className="font-bold">{selectedWords.length}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedWords.map((word, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs"
                    >
                      {word}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600 dark:text-green-400">${totalPrice}</span>
                </div>
              </div>
            )}
          </div>
          
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isTokenPurchase 
                  ? `${tokenPackage.amount} tokens have been added to your account.`
                  : 'Your words have been added to your account.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name on Card
                </label>
                <input
                  type="text"
                  id="cardName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-3 pr-10"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    required
                    disabled={loading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-dashboard-pro/assets/img/logos/visa.png" alt="visa" className="h-4" />
                    <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-dashboard-pro/assets/img/logos/mastercard.png" alt="mastercard" className="h-4" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    id="expiry"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    id="cvc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="123"
                    maxLength={3}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Pay ${totalPrice}</span>
                  </>
                )}
              </button>
              
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
                <p>This is a test checkout. Use card number 4242 4242 4242 4242</p>
                <p>with any future expiry date and any 3-digit CVC.</p>
              </div>
            </form>
          )}
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
  );
}