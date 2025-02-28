import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { verifyPurchase, updateUserTokens } from '../lib/stripe';
import { Toast } from '../components/Toast';
import { useTokens } from '../hooks/useTokens';

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { addTokens } = useTokens();
  const [loading, setLoading] = useState(true);
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  
  const sessionId = searchParams.get('session_id');
  const packId = searchParams.get('pack_id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const verifyPurchaseDetails = async () => {
      if (!sessionId) {
        navigate('/');
        return;
      }

      setToast({
        message: 'Verifying your purchase...',
        type: 'loading'
      });

      try {
        console.log('Verifying purchase with session ID:', sessionId);
        
        // Determine if this is a token purchase based on pack ID
        const isTokenPack = packId?.includes('starter') || 
                           packId?.includes('plus') || 
                           packId?.includes('premium');
        
        const isCustomPack = packId?.includes('custom');
        
        console.log('Is token pack:', isTokenPack, 'Is custom pack:', isCustomPack, 'Pack ID:', packId);
        
        // Use URL parameters as fallback if verification fails
        const fallbackDetails = {
          pack_id: packId || 'unknown',
          amount: amount ? parseInt(amount, 10) : 0,
          status: 'completed',
          packType: isTokenPack ? 'tokens' : isCustomPack ? 'custom_words' : 'words'
        };
        
        try {
          // Try to verify the purchase with the server
          const result = await verifyPurchase(sessionId);
          
          if (result.isCompleted) {
            console.log('Purchase completed successfully:', result);
            setPurchaseDetails({
              pack_id: result.packId,
              amount: result.amount,
              status: 'completed',
              packType: result.packType,
              selectedWords: result.selectedWords
            });
            
            setToast({
              message: 'Purchase completed successfully!',
              type: 'success'
            });
            
            // Update purchase status in database if we have a profile
            if (profile?.id) {
              try {
                const { error } = await supabase
                  .from('word_pack_purchases')
                  .update({ 
                    status: 'completed',
                    updated_at: new Date().toISOString()
                  })
                  .eq('stripe_session_id', sessionId);
                  
                if (error) {
                  console.error('Error updating purchase record:', error);
                }
                
                // Add tokens to user's balance if this is a token purchase
                if (result.packType === 'tokens') {
                  console.log(`Adding ${result.amount} tokens to user ${profile.id}`);
                  
                  // First try direct database update
                  const updateSuccess = await updateUserTokens(profile.id, result.amount);
                  
                  // If direct update fails, try using the hook method
                  if (!updateSuccess) {
                    addTokens(result.amount);
                  }
                }
              } catch (dbError) {
                console.error('Database error:', dbError);
              }
            }
          } else {
            console.log('Purchase not completed, using URL parameters as fallback');
            setPurchaseDetails(fallbackDetails);
            
            setToast({
              message: 'Purchase verification pending. Your items will be added soon.',
              type: 'loading'
            });
          }
        } catch (err) {
          console.error('Error verifying purchase:', err);
          // Use URL parameters as fallback
          console.log('Using URL parameters as fallback due to error');
          setPurchaseDetails(fallbackDetails);
          
          // Add tokens to user's balance if this is a token purchase (fallback)
          if (fallbackDetails.packType === 'tokens' && profile?.id) {
            console.log(`Adding ${fallbackDetails.amount} tokens to user ${profile.id} (fallback)`);
            
            // First try direct database update
            const updateSuccess = await updateUserTokens(profile.id, fallbackDetails.amount);
            
            // If direct update fails, try using the hook method
            if (!updateSuccess) {
              addTokens(fallbackDetails.amount);
            }
          }
          
          setToast({
            message: 'Unable to verify purchase. Please contact support if items are not added.',
            type: 'error'
          });
        }
      } catch (err) {
        console.error('Error in verification process:', err);
        // Use URL parameters as absolute fallback
        const isTokenPack = packId?.includes('starter') || 
                           packId?.includes('plus') || 
                           packId?.includes('premium');
        
        const isCustomPack = packId?.includes('custom');
                           
        const fallbackDetails = {
          pack_id: packId || 'unknown',
          amount: amount ? parseInt(amount, 10) : 0,
          status: 'completed',
          packType: isTokenPack ? 'tokens' : isCustomPack ? 'custom_words' : 'words'
        };
        
        setPurchaseDetails(fallbackDetails);
        
        // Add tokens to user's balance if this is a token purchase (absolute fallback)
        if (fallbackDetails.packType === 'tokens' && profile?.id) {
          console.log(`Adding ${fallbackDetails.amount} tokens to user ${profile.id} (absolute fallback)`);
          
          // First try direct database update
          const updateSuccess = await updateUserTokens(profile.id, fallbackDetails.amount);
          
          // If direct update fails, try using the hook method
          if (!updateSuccess) {
            addTokens(fallbackDetails.amount);
          }
        }
        
        setToast({
          message: 'Error processing purchase. Please contact support.',
          type: 'error'
        });
      } finally {
        setLoading(false);
        
        // Clear toast after 5 seconds
        setTimeout(() => {
          setToast(null);
        }, 5000);
      }
    };

    if (sessionId) {
      verifyPurchaseDetails();
    } else {
      setLoading(false);
      setToast({
        message: 'Invalid session. Please try again.',
        type: 'error'
      });
    }
  }, [sessionId, navigate, profile?.id, packId, amount, addTokens]);

  const handleContinue = () => {
    navigate('/infinite_ideas');
  };

  // Determine what to display based on purchase type
  const renderPurchaseDetails = () => {
    if (!purchaseDetails) return null;

    if (purchaseDetails.packType === 'custom_words') {
      return (
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Thank you for your purchase. Your account has been credited with:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-xl font-bold">{purchaseDetails.amount} Custom Words</p>
            {purchaseDetails.selectedWords && purchaseDetails.selectedWords.length > 0 ? (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Selected words:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {purchaseDetails.selectedWords.map((word: string, index: number) => (
                    <span 
                      key={index} 
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Custom word selection</p>
            )}
          </div>
        </div>
      );
    } else if (purchaseDetails.packType === 'tokens') {
      return (
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Thank you for your purchase. Your account has been credited with:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-xl font-bold">{purchaseDetails.amount} Tokens</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pack: {purchaseDetails.pack_id}</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Thank you for your purchase. Your account has been credited with:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-xl font-bold">{purchaseDetails.amount} Words</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pack: {purchaseDetails.pack_id}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-green-500 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Purchase Successful!</h1>
        
        {loading ? (
          <p className="text-gray-600 dark:text-gray-300 mb-6">Verifying your purchase...</p>
        ) : (
          renderPurchaseDetails()
        )}
        
        <button
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors"
        >
          <span>Continue to Game</span>
          <ArrowRight size={18} />
        </button>
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