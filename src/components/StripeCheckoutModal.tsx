import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useStripeCheckout } from '../lib/stripe';
import { useAuth } from '../hooks/useAuth';
import { useAddress } from "@thirdweb-dev/react";
import { useProfile } from '../hooks/useProfile';
import { Toast } from './Toast';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  packId: string;
  packType: 'tokens' | 'custom_words';
  amount: number;
  price: number;
  title: string;
  selectedWords?: string[];
}

interface FormData {
  fullName: string;
  email: string;
  country: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
];

export function StripeCheckoutModal({ 
  isOpen, 
  onClose, 
  packId, 
  packType, 
  amount, 
  price, 
  title,
  selectedWords 
}: StripeCheckoutModalProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    country: 'US',
    postalCode: '',
    addressLine1: '',
    addressLine2: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  
  const { checkout } = useStripeCheckout();
  const { user } = useAuth();
  const address = useAddress();
  const { profile } = useProfile();
  
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  
  // Mock Stripe Elements (in a real implementation, this would be actual Stripe Elements)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        fullName: '',
        email: user?.email || '',
        country: 'US',
        postalCode: '',
        addressLine1: '',
        addressLine2: '',
      });
      setErrors({});
      setStatus('idle');
      setErrorMessage('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setCardComplete(false);
      
      // Focus the first input field
      setTimeout(() => {
        if (initialFocusRef.current) {
          initialFocusRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, user]);
  
  useEffect(() => {
    // Handle ESC key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    
    // Trap focus within modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleTabKey);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, loading, onClose]);
  
  // Auto-close on success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }
    
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && cardComplete;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      if (!cardComplete) {
        setToast({
          message: 'Please complete the card information',
          type: 'error'
        });
        setTimeout(() => setToast(null), 3000);
      }
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
    setStatus('loading');
    
    try {
      // In a real implementation, you would create a payment method with Stripe
      // and then pass it to your server
      
      // For now, we'll just use the existing checkout function
      await checkout(packId, packType, selectedWords);
      
      setStatus('success');
      setToast({
        message: 'Payment successful!',
        type: 'success'
      });
    } catch (error) {
      console.error('Payment error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred during payment');
      setToast({
        message: 'Payment failed. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Simulate card input validation
  const handleCardInputChange = (field: string, value: string) => {
    switch (field) {
      case 'number':
        setCardNumber(value);
        break;
      case 'expiry':
        setCardExpiry(value);
        break;
      case 'cvc':
        setCardCvc(value);
        break;
    }
    
    // Check if all card fields are filled
    setTimeout(() => {
      setCardComplete(
        cardNumber.length >= 16 && 
        cardExpiry.length >= 5 && 
        cardCvc.length >= 3
      );
    }, 100);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          aria-label="Close checkout"
        >
          <X size={24} />
        </button>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="checkout-title" className="text-2xl font-bold">Complete Your Purchase</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{title}</p>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Thank you for your purchase. Your account has been credited.
              </p>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                {errorMessage || 'There was an error processing your payment. Please try again.'}
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Order summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h3 className="font-medium mb-2">Order Summary</h3>
                  <div className="flex justify-between mb-2">
                    <span>{packType === 'tokens' ? 'Tokens' : 'Custom Words'}</span>
                    <span>{amount}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span>Total</span>
                    <span>${price.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Customer Information */}
                <div>
                  <h3 className="font-medium mb-3">Customer Information</h3>
                  
                  <div className="space-y-3">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={initialFocusRef}
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
                        placeholder="John Doe"
                        aria-required="true"
                        aria-invalid={!!errors.fullName}
                        aria-describedby={errors.fullName ? "fullName-error" : undefined}
                        disabled={loading}
                      />
                      {errors.fullName && (
                        <p id="fullName-error" className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
                        placeholder="john@example.com"
                        aria-required="true"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        disabled={loading}
                      />
                      {errors.email && (
                        <p id="email-error" className="mt-1 text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>
                    
                    {/* Country and Postal Code */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Country/Region <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          aria-required="true"
                          disabled={loading}
                        >
                          {COUNTRIES.map(country => (
                            <option key={country.code} value={country.code}>{country.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Postal/ZIP Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.postalCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
                          placeholder="12345"
                          aria-required="true"
                          aria-invalid={!!errors.postalCode}
                          aria-describedby={errors.postalCode ? "postalCode-error" : undefined}
                          disabled={loading}
                        />
                        {errors.postalCode && (
                          <p id="postalCode-error" className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div>
                      <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="addressLine1"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.addressLine1 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
                        placeholder="123 Main St"
                        aria-required="true"
                        aria-invalid={!!errors.addressLine1}
                        aria-describedby={errors.addressLine1 ? "addressLine1-error" : undefined}
                        disabled={loading}
                      />
                      {errors.addressLine1 && (
                        <p id="addressLine1-error" className="mt-1 text-sm text-red-500">{errors.addressLine1}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address Line 2 <span className="text-gray-400 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="addressLine2"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Apt, Suite, Unit, etc."
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Payment Information */}
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Payment Information</h3>
                  
                  <div className="space-y-3">
                    {/* Card Number */}
                    <div>
                      <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Card Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="cardNumber"
                          value={cardNumber}
                          onChange={(e) => handleCardInputChange('number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          aria-required="true"
                          disabled={loading}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                          <img src="https://cdn.jsdelivr.net/gh/stripe-samples/card-payment-form@main/static/images/visa.svg" alt="Visa" className="h-6" />
                          <img src="https://cdn.jsdelivr.net/gh/stripe-samples/card-payment-form@main/static/images/mastercard.svg" alt="Mastercard" className="h-6" />
                          <img src="https://cdn.jsdelivr.net/gh/stripe-samples/card-payment-form@main/static/images/amex.svg" alt="American Express" className="h-6" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Expiry and CVC */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Expiration Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="cardExpiry"
                          value={cardExpiry}
                          onChange={(e) => handleCardInputChange('expiry', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="MM / YY"
                          maxLength={5}
                          aria-required="true"
                          disabled={loading}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="cardCvc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CVC / CVV <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="cardCvc"
                            value={cardCvc}
                            onChange={(e) => handleCardInputChange('cvc', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="123"
                            maxLength={4}
                            aria-required="true"
                            disabled={loading}
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <img src="https://cdn.jsdelivr.net/gh/stripe-samples/card-payment-form@main/static/images/cvc.svg" alt="CVC" className="h-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer with buttons */}
              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      <span>Pay ${price.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <Loader2 size={24} className="animate-spin text-purple-500" />
            <span className="text-gray-800 dark:text-white font-medium">Processing payment...</span>
          </div>
        </div>
      )}
    </div>
  );
}