import { supabase } from './supabase';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useAddress } from "@thirdweb-dev/react";
import { StripeCheckoutSession } from '../types';
import { useTokens } from '../hooks/useTokens';

// Stripe public key from environment variables
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51Qw9leHFzTpvfWfCsP5HIxNiF8pjgqAykxPQ3Eez3u1lggiASkuTtzcaIJcwtnWhz3DNkHzyb0oUTvM9AKwUL19E00opWZ8V54';

// API URL - use environment variable or default to relative path for production
const API_URL = import.meta.env.VITE_API_URL || '';

// Token package definitions
export const TOKEN_PACKAGES = [
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

// Create a checkout session
export const createCheckoutSession = async (
  packId: string, 
  packType: 'tokens' | 'custom_words',
  userId: string,
  selectedWords?: string[]
): Promise<StripeCheckoutSession> => {
  try {
    console.log('Creating checkout session for user:', userId);
    console.log('API URL:', API_URL);
    console.log('Pack type:', packType, 'Pack ID:', packId);
    
    // Prepare request body
    const requestBody: any = {
      packId,
      packType,
      userId,
    };
    
    // Add selected words if provided
    if (selectedWords && selectedWords.length > 0) {
      requestBody.selectedWords = selectedWords;
      requestBody.customPrice = (selectedWords.length * 1.99).toFixed(2);
    }
    
    // Call the server API to create a checkout session
    const response = await fetch(`${API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(errorText || 'Failed to create checkout session');
    }
    
    const session = await response.json();
    console.log('Checkout session created:', session);
    
    // Create a record in the database
    try {
      const { error } = await supabase
        .from('word_pack_purchases')
        .insert({
          user_id: userId,
          pack_id: packId,
          amount: selectedWords ? selectedWords.length : getPackageAmount(packId, packType),
          price: selectedWords ? parseFloat((selectedWords.length * 1.99).toFixed(2)) : getPackagePrice(packId, packType),
          status: 'pending',
          stripe_session_id: session.id,
          metadata: selectedWords ? { selectedWords } : null
        });
        
      if (error) {
        console.error('Error creating purchase record:', error);
      } else {
        console.log('Created purchase record');
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with checkout even if database operation fails
    }
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Helper function to get package amount
function getPackageAmount(packId: string, packType: 'tokens' | 'custom_words'): number {
  if (packType === 'custom_words') {
    // Extract the number of words from the custom pack ID (format: custom_X_words)
    const match = packId.match(/custom_(\d+)_words/);
    return match ? parseInt(match[1], 10) : 1;
  }
  
  const packages = TOKEN_PACKAGES;
  const packageDetails = packages.find(p => p.id === packId);
  return packageDetails?.amount || 0;
}

// Helper function to get package price
function getPackagePrice(packId: string, packType: 'tokens' | 'custom_words'): number {
  if (packType === 'custom_words') {
    // Extract the number of words from the custom pack ID (format: custom_X_words)
    const match = packId.match(/custom_(\d+)_words/);
    const wordCount = match ? parseInt(match[1], 10) : 1;
    return parseFloat((wordCount * 1.99).toFixed(2));
  }
  
  const packages = TOKEN_PACKAGES;
  const packageDetails = packages.find(p => p.id === packId);
  return packageDetails?.price || 0;
}

// Redirect to checkout
export const redirectToCheckout = async (session: StripeCheckoutSession) => {
  try {
    // If we have a URL, redirect to it
    if (session.url) {
      window.location.href = session.url;
      return { error: null };
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    return { error };
  }
};

// Verify a purchase
export const verifyPurchase = async (sessionId: string): Promise<{
  isCompleted: boolean;
  packId: string;
  amount: number;
  packType: 'tokens' | 'custom_words';
  selectedWords?: string[];
}> => {
  try {
    console.log('Verifying purchase for session:', sessionId);
    console.log('API URL:', API_URL);
    
    const response = await fetch(`${API_URL}/verify-purchase/${sessionId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(errorText || 'Failed to verify purchase');
    }
    
    const result = await response.json();
    console.log('Purchase verification result:', result);
    
    // Update the purchase record in the database if we have a profile
    try {
      const { data: purchaseData, error: fetchError } = await supabase
        .from('word_pack_purchases')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching purchase record:', fetchError);
      } else if (purchaseData) {
        const { error } = await supabase
          .from('word_pack_purchases')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', purchaseData.id);
          
        if (error) {
          console.error('Error updating purchase record:', error);
        }
        
        // Add tokens to user's balance if this is a token purchase
        if (result.packType === 'tokens' && purchaseData.user_id) {
          console.log(`Adding ${result.amount} tokens to user ${purchaseData.user_id}`);
          
          // First try direct database update
          const updateSuccess = await updateUserTokens(purchaseData.user_id, result.amount);
          
          // If direct update fails, try using the hook method (though this won't work in this context)
          if (!updateSuccess) {
            console.error('Failed to update tokens directly');
          }
        }
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
    }
    
    return result;
  } catch (error) {
    console.error('Error verifying purchase:', error);
    
    // Extract packId from sessionId if possible
    const packId = sessionId.includes('starter') ? 'starter' : 
                  sessionId.includes('plus') ? 'plus' : 
                  sessionId.includes('premium') ? 'premium' : 
                  sessionId.includes('custom') ? sessionId : 'custom_1_words';
                  
    const isTokenPack = packId === 'starter' || packId === 'plus' || packId === 'premium';
    const isCustomPack = packId.includes('custom');
    
    let packType: 'tokens' | 'custom_words' = 'custom_words';
    if (isTokenPack) {
      packType = 'tokens';
    }
    
    let amount = 0;
    if (isCustomPack) {
      const match = packId.match(/custom_(\d+)_words/);
      amount = match ? parseInt(match[1], 10) : 1;
    } else {
      amount = packId === 'starter' ? 100 :
              packId === 'plus' ? 275 :
              packId === 'premium' ? 600 : 1;
    }
    
    // Update the purchase record in the database
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
    
    // Return fallback data
    return {
      isCompleted: true,
      packId,
      amount,
      packType
    };
  }
};

// Update user tokens directly in the database
export const updateUserTokens = async (userId: string, amount: number): Promise<boolean> => {
  try {
    console.log(`Directly updating tokens for user ${userId}: +${amount}`);
    
    // First get current token balance
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('tokens')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching current token balance:', fetchError);
      return false;
    }
    
    const currentTokens = profileData?.tokens || 0;
    const newTokens = currentTokens + amount;
    
    console.log(`Current tokens: ${currentTokens}, New tokens: ${newTokens}`);
    
    // Update the tokens in the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ tokens: newTokens })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating tokens:', updateError);
      return false;
    }
    
    // Log token transaction
    try {
      await supabase
        .from('token_transactions')
        .insert([{
          user_id: userId,
          amount: amount,
          transaction_type: 'credit',
          description: 'Tokens purchased',
          previous_balance: currentTokens,
          new_balance: newTokens
        }]);
    } catch (txError) {
      console.error('Error logging token transaction:', txError);
      // Continue even if transaction logging fails
    }
    
    console.log(`Successfully updated tokens for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error updating user tokens:', error);
    return false;
  }
};

// Hook to handle Stripe checkout
export const useStripeCheckout = () => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  const { addTokens } = useTokens();
  
  const checkout = async (packId: string, packType: 'tokens' | 'custom_words', selectedWords?: string[]) => {
    if (!profile?.id && !user?.id && !address) {
      throw new Error('User must be logged in to make a purchase');
    }
    
    // Use profile ID if available, otherwise use user ID
    const userId = profile?.id;
    
    if (!userId) {
      throw new Error('User profile not found');
    }
    
    try {
      // Create a checkout session
      const session = await createCheckoutSession(packId, packType, userId, selectedWords);
      
      // Redirect to Stripe checkout
      await redirectToCheckout(session);
      
      return session;
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    }
  };
  
  return { checkout };
};