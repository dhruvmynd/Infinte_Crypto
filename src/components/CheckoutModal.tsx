import React from 'react';
import { X, CreditCard, Package, Sparkles } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'words' | 'tokens';
}

interface PackageOption {
  id: string;
  name: string;
  description: string;
  price: number;
  amount: number;
}

const WORD_PACKAGES: PackageOption[] = [
  {
    id: 'basic',
    name: 'Basic Pack',
    description: 'Get started with 10 new word combinations',
    price: 4.99,
    amount: 10
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    description: 'Unlock 25 new word combinations',
    price: 9.99,
    amount: 25
  },
  {
    id: 'ultimate',
    name: 'Ultimate Pack',
    description: 'Master the game with 50 new combinations',
    price: 19.99,
    amount: 50
  }
];

const TOKEN_PACKAGES: PackageOption[] = [
  {
    id: 'starter',
    name: 'Starter Tokens',
    description: '100 tokens to unlock hints and power-ups',
    price: 4.99,
    amount: 100
  },
  {
    id: 'plus',
    name: 'Plus Tokens',
    description: '250 tokens with 10% bonus',
    price: 9.99,
    amount: 275
  },
  {
    id: 'premium',
    name: 'Premium Tokens',
    description: '500 tokens with 20% bonus',
    price: 19.99,
    amount: 600
  }
];

export function CheckoutModal({ isOpen, onClose, type }: CheckoutModalProps) {
  if (!isOpen) return null;

  const packages = type === 'words' ? WORD_PACKAGES : TOKEN_PACKAGES;
  const icon = type === 'words' ? Package : Sparkles;

  const handleCheckout = (packageId: string) => {
    // This is where you would integrate with Stripe
    console.log(`Checkout for package: ${packageId}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {type === 'words' ? 'Buy Word Packs' : 'Get Tokens'}
        </h2>

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
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <CreditCard size={16} />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}