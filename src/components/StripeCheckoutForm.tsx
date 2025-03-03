import React, { useState, useEffect } from 'react';
import { X, CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useAddress } from "@thirdweb-dev/react";
import { useAuth } from '../hooks/useAuth';
import { Toast } from './Toast';

interface StripeCheckoutFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWords: string[];
  onSuccess: () => void;
}

export function StripeCheckoutForm({ isOpen, onClose, selectedWords, onSuccess }: StripeCheckoutFormProps) {
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

  const totalPrice = (selectedWords.length * 1.99).toFixed(2);

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
      
      // Simulate a payment process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a custom pack ID based on the number of words
      const customPackId = `custom_${selectedWords.length}_words`;
      
      // Call your API to create a checkout session
      const response = await fetch(`${import.meta.env.VITE_API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId: customPackId,
          packType: 'custom_words',
          userId: profile.id,
          selectedWords
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process payment');
      }
      
      const data = await response.json();
      
      // Simulate successful payment verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
          
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your words have been added to your account.
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
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                    {/* Visa Card SVG */}
                    <svg className="h-4" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="780" height="500" fill="white"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M449.539 250.001C449.539 318.779 393.902 374.996 325.866 374.996C257.829 374.996 202.192 318.779 202.192 250.001C202.192 181.222 257.829 125.005 325.866 125.005C393.902 125.005 449.539 181.222 449.539 250.001Z" fill="#F79F1A"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M576.139 250.001C576.139 318.779 520.502 374.996 452.466 374.996C384.429 374.996 328.792 318.779 328.792 250.001C328.792 181.222 384.429 125.005 452.466 125.005C520.502 125.005 576.139 181.222 576.139 250.001Z" fill="#EA001B"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M389.166 164.675C413.297 188.285 426.966 221.915 426.966 250.001C426.966 278.087 413.297 311.717 389.166 335.327C365.035 311.717 351.366 278.087 351.366 250.001C351.366 221.915 365.035 188.285 389.166 164.675Z" fill="#FF5F01"/>
                    </svg>
                    
                    {/* Mastercard SVG */}
                    <svg className="h-4" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M293.199 348.599V331.953C293.199 325.281 289.233 321.315 282.561 321.315C279.183 321.315 275.805 322.489 273.601 326.455C271.983 323.077 269.193 321.315 265.229 321.315C262.437 321.315 259.645 322.489 257.441 325.281V321.901H252.301V348.599H257.441V334.159C257.441 329.605 260.233 327.401 264.199 327.401C268.165 327.401 270.369 329.605 270.369 334.159V348.599H275.509V334.159C275.509 329.605 278.301 327.401 282.267 327.401C286.233 327.401 288.437 329.605 288.437 334.159V348.599H293.199ZM366.219 321.901H357.169V314.643H352.029V321.901H346.889V326.455H352.029V339.299C352.029 345.221 354.821 349.187 361.493 349.187C363.697 349.187 366.219 348.599 368.129 347.425L366.805 343.017C365.481 343.899 363.697 344.193 362.373 344.193C359.581 344.193 357.377 342.871 357.377 339.299V326.455H366.219V321.901ZM403.219 321.315C399.839 321.315 397.635 323.077 396.311 325.281V321.901H391.171V348.599H396.311V334.159C396.311 329.899 398.515 327.401 402.481 327.401C403.511 327.401 404.835 327.695 405.865 327.989L407.189 322.195C406.159 321.901 404.543 321.315 403.219 321.315ZM334.045 324.693C331.253 322.489 327.287 321.315 323.027 321.315C315.767 321.315 311.213 324.693 311.213 330.041C311.213 334.453 314.591 337.245 320.513 338.275L323.321 338.863C326.551 339.451 328.461 340.333 328.461 342.243C328.461 344.447 326.257 346.063 322.291 346.063C318.325 346.063 315.533 344.447 313.917 342.831L311.213 346.651C314.005 349.187 318.031 350.361 322.291 350.361C330.517 350.361 333.897 346.357 333.897 341.949C333.897 337.245 330.223 334.747 324.595 333.717L321.787 333.129C319.143 332.687 316.797 332.099 316.797 329.899C316.797 327.989 318.707 326.455 322.291 326.455C325.875 326.455 328.667 327.989 330.223 329.311L334.045 324.693ZM486.219 321.315C482.839 321.315 480.635 323.077 479.311 325.281V321.901H474.171V348.599H479.311V334.159C479.311 329.899 481.515 327.401 485.481 327.401C486.511 327.401 487.835 327.695 488.865 327.989L490.189 322.195C489.159 321.901 487.543 321.315 486.219 321.315ZM443.219 335.189C443.219 343.899 449.435 350.361 458.779 350.361C463.039 350.361 465.831 349.187 468.623 346.651L465.831 342.537C463.627 344.447 461.423 345.515 458.779 345.515C453.401 345.515 448.555 341.655 448.555 335.189C448.555 328.723 453.401 324.863 458.779 324.863C461.423 324.863 463.627 325.931 465.831 327.841L468.623 323.727C465.831 321.191 463.039 320.017 458.779 320.017C449.435 320.017 443.219 326.479 443.219 335.189ZM527.219 335.189V321.901H522.079V325.281C519.875 322.783 516.789 321.315 512.823 321.315C504.863 321.315 498.353 327.841 498.353 335.189C498.353 342.537 504.863 349.063 512.823 349.063C516.789 349.063 519.875 347.595 522.079 345.097V348.477H527.219V335.189ZM503.689 335.189C503.689 331.071 507.061 326.455 513.411 326.455C519.581 326.455 523.133 330.923 523.133 335.189C523.133 339.455 519.581 343.923 513.411 343.923C507.061 343.923 503.689 339.307 503.689 335.189ZM417.219 321.315C409.259 321.315 402.749 327.695 402.749 335.189C402.749 342.683 409.259 349.063 417.513 349.063C421.773 349.063 426.033 347.595 429.119 344.741L426.327 341.067C424.123 343.017 421.037 344.193 418.245 344.193C414.279 344.193 410.313 342.243 409.259 337.833H430.443V335.777C430.443 327.695 425.151 321.315 417.219 321.315ZM417.219 326.185C421.479 326.185 424.711 328.723 425.445 332.981H409.259C409.993 329.017 413.225 326.185 417.219 326.185ZM378.219 335.189V313.025H373.079V325.281C370.875 322.783 367.789 321.315 363.823 321.315C355.863 321.315 349.353 327.841 349.353 335.189C349.353 342.537 355.863 349.063 363.823 349.063C367.789 349.063 370.875 347.595 373.079 345.097V348.477H378.219V335.189ZM354.689 335.189C354.689 331.071 358.061 326.455 364.411 326.455C370.581 326.455 374.133 330.923 374.133 335.189C374.133 339.455 370.581 343.923 364.411 343.923C358.061 343.923 354.689 339.307 354.689 335.189Z" fill="#231F20"/>
                      <path d="M219.199 335.189V321.901H214.059V325.281C211.855 322.783 208.769 321.315 204.803 321.315C196.843 321.315 190.333 327.841 190.333 335.189C190.333 342.537 196.843 349.063 204.803 349.063C208.769 349.063 211.855 347.595 214.059 345.097V348.477H219.199V335.189ZM195.669 335.189C195.669 331.071 199.041 326.455 205.391 326.455C211.561 326.455 215.113 330.923 215.113 335.189C215.113 339.455 211.561 343.923 205.391 343.923C199.041 343.923 195.669 339.307 195.669 335.189Z" fill="#231F20"/>
                      <path d="M242.199 349.063C250.747 349.063 257.257 342.537 257.257 335.189C257.257 327.841 250.747 321.315 242.199 321.315C233.651 321.315 227.141 327.841 227.141 335.189C227.141 342.537 233.651 349.063 242.199 349.063ZM242.199 343.923C236.149 343.923 232.477 339.895 232.477 335.189C232.477 330.483 236.149 326.455 242.199 326.455C248.249 326.455 251.921 330.483 251.921 335.189C251.921 339.895 248.249 343.923 242.199 343.923Z" fill="#231F20"/>
                      <path d="M285.199 349.063C293.747 349.063 300.257 342.537 300.257 335.189C300.257 327.841 293.747 321.315 285.199 321.315C276.651 321.315 270.141 327.841 270.141 335.189C270.141 342.537 276.651 349.063 285.199 349.063ZM285.199 343.923C279.149 343.923 275.477 339.895 275.477 335.189C275.477 330.483 279.149 326.455 285.199 326.455C291.249 326.455 294.921 330.483 294.921 335.189C294.921 339.895 291.249 343.923 285.199 343.923Z" fill="#231F20"/>
                      <path d="M527.199 313.025H522.059V348.599H527.199V313.025Z" fill="#231F20"/>
                      <path d="M554.199 349.063C562.747 349.063 569.257 342.537 569.257 335.189C569.257 327.841 562.747 321.315 554.199 321.315C545.651 321.315 539.141 327.841 539.141 335.189C539.141 342.537 545.651 349.063 554.199 349.063ZM554.199 343.923C548.149 343.923 544.477 339.895 544.477 335.189C544.477 330.483 548.149 326.455 554.199 326.455C560.249 326.455 563.921 330.483 563.921 335.189C563.921 339.895 560.249 343.923 554.199 343.923Z" fill="#231F20"/>
                      <path d="M576.199 348.599H581.339V335.189C581.339 329.899 584.719 326.455 589.859 326.455C590.889 326.455 591.919 326.749 592.949 327.043V321.901C592.067 321.607 591.185 321.607 590.303 321.607C586.043 321.607 582.663 323.727 581.339 327.401V321.901H576.199V348.599Z" fill="#231F20"/>
                      <path d="M170.199 335.189V313.025H165.059V325.281C162.855 322.783 159.769 321.315 155.803 321.315C147.843 321.315 141.333 327.841 141.333 335.189C141.333 342.537 147.843 349.063 155.803 349.063C159.769 349.063 162.855 347.595 165.059 345.097V348.477H170.199V335.189ZM146.669 335.189C146.669 331.071 150.041 326.455 156.391 326.455C162.561 326.455 166.113 330.923 166.113 335.189C166.113 339.455 162.561 343.923 156.391 343.923C150.041 343.923 146.669 339.307 146.669 335.189Z" fill="#231F20"/>
                    </svg>
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