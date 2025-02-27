import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useAddress } from "@thirdweb-dev/react";

export function useTokens() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  const queryClient = useQueryClient();

  // Get the user ID from either profile, user, or address
  const userId = profile?.id || (user?.id ? user.id : null);
  const isAuthenticated = !!userId || !!address;

  // Fetch user's token balance
  const { data: tokenBalance, isLoading, error } = useQuery({
    queryKey: ['token-balance', userId],
    queryFn: async () => {
      if (!userId) return 0;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('tokens')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching token balance:', error);
          return 0;
        }

        return data?.tokens || 0;
      } catch (err) {
        console.error('Error in token balance query:', err);
        return 0;
      }
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 5000, // 5 seconds
    refetchInterval: 5000 // Refetch every 5 seconds for more responsive updates
  });

  // Update token balance
  const { mutate: updateTokenBalance } = useMutation({
    mutationFn: async ({ amount, operation }: { amount: number; operation: 'add' | 'subtract' }) => {
      if (!userId) {
        console.log('User not authenticated, skipping token update');
        return 0;
      }

      try {
        // Get current token balance
        const { data: currentData, error: fetchError } = await supabase
          .from('profiles')
          .select('tokens')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching current token balance:', fetchError);
          return 0;
        }

        const currentBalance = currentData?.tokens || 0;
        const newBalance = operation === 'add' 
          ? currentBalance + amount 
          : Math.max(0, currentBalance - amount);

        // Update token balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ tokens: newBalance })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating token balance:', updateError);
          return currentBalance;
        }

        // Log token transaction
        try {
          await supabase
            .from('token_transactions')
            .insert([{
              user_id: userId,
              amount: amount,
              transaction_type: operation === 'add' ? 'credit' : 'debit',
              description: operation === 'add' ? 'Tokens added' : 'Tokens used',
              previous_balance: currentBalance,
              new_balance: newBalance
            }]);
        } catch (txError) {
          console.error('Error logging token transaction:', txError);
          // Continue even if transaction logging fails
        }

        return newBalance;
      } catch (err) {
        console.error('Error in token balance mutation:', err);
        return tokenBalance || 0;
      }
    },
    onSuccess: (newBalance) => {
      if (userId) {
        queryClient.setQueryData(['token-balance', userId], newBalance);
      }
    },
    onError: (error) => {
      console.error('Error updating token balance:', error);
    }
  });

  // Add tokens
  const addTokens = (amount: number) => {
    if (!userId || amount <= 0) return;
    updateTokenBalance({ amount, operation: 'add' });
  };

  // Use tokens
  const useTokens = (amount: number) => {
    if (!userId || amount <= 0) return false;
    
    // Check if user has enough tokens
    if ((tokenBalance || 0) < amount) {
      return false;
    }
    
    updateTokenBalance({ amount, operation: 'subtract' });
    return true;
  };

  // Check if user has enough tokens
  const hasEnoughTokens = (amount: number) => {
    return (tokenBalance || 0) >= amount;
  };

  return {
    tokenBalance: tokenBalance || 0,
    isLoading,
    error,
    addTokens,
    useTokens,
    hasEnoughTokens,
    isAuthenticated
  };
}