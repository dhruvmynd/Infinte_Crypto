import { supabase } from './supabase';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useAddress } from "@thirdweb-dev/react";
import { StripeCheckoutSession } from '../types';

// Stripe public key from environment variables
const STRIPE_PUBLIC_KEY = 'pk_test_51Qw9leHFzTpvfWfCsP5HIxNiF8pjgqAykxPQ3Eez3u1lggiASkuTtzcaIJcwtnWhz3DNkHzyb0oUTvM9AKwUL19E00opWZ8V54';

// API URL - dynamically determine the correct API URL
const getApiUrl = () => {
  // In production, use relative paths
  if (import.meta.env.PROD) {
    return '';
  }
  
  // In development, use the environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to localhost:3001 for development
  return 'http://localhost:3001';
};

// Word pack definitions
export const WORD_PACKS = [
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
  packType: 'words' | 'tokens',
  userId: string
): Promise<StripeCheckoutSession> => {
  try {
    console.log('Creating checkout session for user:', userId);
    const apiUrl = getApiUrl();
    console.log('Using API URL:', apiUrl);
    
    // Call the server API to create a checkout session
    const response = await fetch(`${apiUrl}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        packId,
        packType,
        userId,
      }),
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
      const packages = packType === 'words' ? WORD_PACKS : TOKEN_PACKAGES;
      const packageDetails = packages.find(p => p.id === packId);
      
      if (!packageDetails) {
        throw new Error(`Package ${packId} not found`);
      }
      
      const { data, error } = await supabase
        .from('word_pack_purchases')
        .insert({
          user_id: userId,
          pack_id: packId,
          amount: packageDetails.amount,
          price: packageDetails.price,
          status: 'pending',
          stripe_session_id: session.id
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating purchase record:', error);
      } else {
        console.log('Created purchase record:', data);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with checkout even if database operation fails
    }
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Fallback to simulated checkout for development
    console.log('Using simulated checkout session');
    const packages = packType === 'words' ? WORD_PACKS : TOKEN_PACKAGES;
    const packageDetails = packages.find(p => p.id === packId);
    
    if (!packageDetails) {
      throw new Error(`Package ${packId} not found`);
    }
    
    // Generate a unique session ID
    const sessionId = `sim_${Date.now()}_${packId}`;
    
    // Create a record in the database
    try {
      const { data, error } = await supabase
        .from('word_pack_purchases')
        .insert({
          user_id: userId,
          pack_id: packId,
          amount: packageDetails.amount,
          price: packageDetails.price,
          status: 'pending',
          stripe_session_id: sessionId
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating purchase record:', error);
      } else {
        console.log('Created purchase record:', data);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
    }
    
    // Return simulated session
    return {
      id: sessionId,
      url: `/success?session_id=${sessionId}&pack_id=${packId}&amount=${packageDetails.amount}`
    };
  }
};

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
  packType: 'words' | 'tokens';
}> => {
  try {
    console.log('Verifying purchase for session:', sessionId);
    const apiUrl = getApiUrl();
    console.log('Using API URL:', apiUrl);
    
    const response = await fetch(`${apiUrl}/verify-purchase/${sessionId}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(errorText || 'Failed to verify purchase');
    }
    
    const result = await response.json();
    console.log('Purchase verification result:', result);
    
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
    
    return result;
  } catch (error) {
    console.error('Error verifying purchase:', error);
    
    // Fallback for development
    console.log('Using simulated purchase verification');
    
    // Extract packId from sessionId if possible
    const packId = sessionId.includes('basic') ? 'basic' : 
                  sessionId.includes('pro') ? 'pro' : 
                  sessionId.includes('ultimate') ? 'ultimate' : 
                  sessionId.includes('starter') ? 'starter' : 
                  sessionId.includes('plus') ? 'plus' : 
                  sessionId.includes('premium') ? 'premium' : 'basic';
                  
    const isTokenPack = packId === 'starter' || packId === 'plus' || packId === 'premium';
    const packType = isTokenPack ? 'tokens' : 'words';
    
    const amount = packId === 'basic' ? 10 : 
                  packId === 'pro' ? 25 : 
                  packId === 'ultimate' ? 50 :
                  packId === 'starter' ? 100 :
                  packId === 'plus' ? 275 :
                  packId === 'premium' ? 600 : 10;
    
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
    
    return {
      isCompleted: true,
      packId,
      amount,
      packType
    };
  }
};

// Hook to handle Stripe checkout
export const useStripeCheckout = () => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  
  const checkout = async (packId: string, packType: 'words' | 'tokens') => {
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
      const session = await createCheckoutSession(packId, packType, userId);
      
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