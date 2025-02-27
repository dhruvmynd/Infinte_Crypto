import React, { useState, useEffect } from 'react';
import { X, CreditCard, Package, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useStripeCheckout, WORD_PACKS, TOKEN_PACKAGES } from '../lib/stripe';
import { Toast } from './Toast';
import { useAuth } from '../hooks/useAuth';
import { useAddress } from "@thirdweb-dev/react";
import { useProfile } from '../hooks/useProfile';
import { checkSupabaseConnection, handleDatabaseError } from '../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'words' | 'tokens';
}

export function CheckoutModal({ isOpen, onClose, type }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { checkout } = useStripeCheckout();
  const { user } = useAuth();
  const address = useAddress();
  const { profile, isLoading: profileLoading } = useProfile();
  
  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedPackage(null);
      setError(null);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const packages = type === 'words' ? WORD_PACKS : TOKEN_PACKAGES;
  const icon = type === 'words' ? Package : Sparkles;

  const isLoggedIn = !!user || !!address;
  const hasProfile = !!profile?.id;

  const handleCheckout = async (packageId: string) => {
    if (!isLoggedIn) {
      setError('You must be logged in to make a purchase');
      return;
    }

    if (profileLoading) {
      setError('Your profile is still loading. Please try again in a moment.');
      return;
    }

    if (!hasProfile && address) {
      setError('Your Web3 profile is being created. Please try again in a moment.');
      return;
    }

    setSelectedPackage(packageId);
    
    try {
      setLoading(true);
      setError(null);
      
      // Check Supabase connection first
      const { connected, error: connectionError } = await checkSupabaseConnection();
      if (!connected) {
        throw new Error(connectionError?.message || 'Database connection issue. Please try again.');
      }
      
      await checkout(packageId, type);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? handleDatabaseError(err, err.message)
        : 'An error occurred during checkout';
      
      setError(errorMessage);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          disabled={loading}
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6" id="checkout-dialog-title">
          {type === 'words' ? 'Buy Word Packs' : 'Get Tokens'}
        </h2>

        {!isLoggedIn && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">User must be logged in to make a purchase</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  type === 'words' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-500'
                }`}>
                  {React.createElement(icon, { size: 24 })}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{pkg.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{pkg.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold">${pkg.price}</span>
                    <button
                      onClick={() => handleCheckout(pkg.id)}
                      disabled={loading || !isLoggedIn}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading && selectedPackage === pkg.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CreditCard size={16} />
                      )}
                      <span>{loading && selectedPackage === pkg.id ? 'Processing...' : 'Buy Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12H20M20 12L16 8M20 12L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>

      {loading && (
        <Toast
          message="Processing your purchase..."
          type="loading"
          onClose={() => {}}
        />
      )}
    </div>
  );
}