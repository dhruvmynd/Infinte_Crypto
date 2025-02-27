import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { verifyPurchase } from '../lib/stripe';

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  
  const sessionId = searchParams.get('session_id');
  const packId = searchParams.get('pack_id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const verifyPurchaseDetails = async () => {
      if (!sessionId) {
        navigate('/');
        return;
      }

      try {
        console.log('Verifying purchase with session ID:', sessionId);
        // Verify the purchase with the server
        const result = await verifyPurchase(sessionId);
        
        if (result.isCompleted) {
          console.log('Purchase completed successfully:', result);
          setPurchaseDetails({
            pack_id: result.packId,
            amount: result.amount,
            status: 'completed',
            packType: result.packType
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
            } catch (dbError) {
              console.error('Database error:', dbError);
            }
          }
        } else {
          console.log('Purchase not completed, using URL parameters as fallback');
          // If not completed, use the URL parameters as fallback
          setPurchaseDetails({
            pack_id: packId || 'unknown',
            amount: amount ? parseInt(amount, 10) : 0,
            status: 'pending'
          });
        }
      } catch (err) {
        console.error('Error verifying purchase:', err);
        // Use URL parameters as fallback
        console.log('Using URL parameters as fallback due to error');
        setPurchaseDetails({
          pack_id: packId || 'unknown',
          amount: amount ? parseInt(amount, 10) : 0,
          status: 'pending'
        });
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      verifyPurchaseDetails();
    } else {
      setLoading(false);
    }
  }, [sessionId, navigate, profile?.id, packId, amount]);

  const handleContinue = () => {
    navigate('/infinite_ideas');
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
        ) : purchaseDetails ? (
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Thank you for your purchase. Your account has been credited with:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-xl font-bold">{purchaseDetails.amount} {purchaseDetails.pack_id.includes('token') || purchaseDetails.packType === 'tokens' ? 'Tokens' : 'Words'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pack: {purchaseDetails.pack_id}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We couldn't find your purchase details, but don't worry! If your payment was successful, your items will be added to your account.
          </p>
        )}
        
        <button
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors"
        >
          <span>Continue to Game</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}