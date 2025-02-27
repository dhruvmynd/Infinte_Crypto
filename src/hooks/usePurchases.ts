import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfile } from './useProfile';
import { useAuth } from '../hooks/useAuth';
import { useAddress } from "@thirdweb-dev/react";

interface Purchase {
  id: string;
  user_id: string;
  pack_id: string;
  amount: number;
  price: number;
  status: 'pending' | 'completed' | 'cancelled';
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export function usePurchases() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  const queryClient = useQueryClient();

  // Get the user ID from either profile, user, or address
  const userId = profile?.id || (user?.id ? user.id : null);
  const isAuthenticated = !!userId || !!address;

  // Fetch user's purchases
  const { data: purchases, isLoading, error } = useQuery({
    queryKey: ['purchases', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('word_pack_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Purchase[];
    },
    enabled: !!userId
  });

  // Get user's total words and tokens
  const { 
    data: totals,
    isLoading: totalsLoading
  } = useQuery({
    queryKey: ['purchase-totals', userId],
    queryFn: async () => {
      if (!userId) return { words: 0, tokens: 0 };

      const { data, error } = await supabase
        .from('word_pack_purchases')
        .select('pack_id, amount')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) throw error;

      return (data || []).reduce((acc, purchase) => {
        if (purchase.pack_id.includes('token')) {
          acc.tokens += purchase.amount;
        } else {
          acc.words += purchase.amount;
        }
        return acc;
      }, { words: 0, tokens: 0 });
    },
    enabled: !!userId
  });

  // Use tokens
  const { mutate: useTokens } = useMutation({
    mutationFn: async (amount: number) => {
      if (!userId) throw new Error('User not logged in');
      if ((totals?.tokens || 0) < amount) throw new Error('Not enough tokens');

      // In a real app, you would have a table to track token usage
      // For now, we'll just simulate it by returning success
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['purchase-totals', userId] });
    }
  });

  // Use words
  const { mutate: useWords } = useMutation({
    mutationFn: async (amount: number) => {
      if (!userId) throw new Error('User not logged in');
      if ((totals?.words || 0) < amount) throw new Error('Not enough word packs');

      // In a real app, you would have a table to track word usage
      // For now, we'll just simulate it by returning success
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['purchase-totals', userId] });
    }
  });

  return {
    purchases,
    isLoading,
    error,
    isAuthenticated,
    totals: {
      words: totals?.words || 0,
      tokens: totals?.tokens || 0,
      isLoading: totalsLoading
    },
    useTokens,
    useWords
  };
}