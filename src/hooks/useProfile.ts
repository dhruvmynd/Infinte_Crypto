import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAddress } from "@thirdweb-dev/react";

interface Profile {
  id: string;
  user_id: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
  last_login: string;
  web3_provider: string | null;
  chain_id: string | null;
}

export function useProfile() {
  const address = useAddress();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', address],
    queryFn: async () => {
      if (!address) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!address,
    retry: 1
  });

  // Create or update profile
  const { mutate: createProfile } = useMutation({
    mutationFn: async (newProfile: { wallet_address: string; web3_provider?: string; chain_id?: string }) => {
      const normalizedAddress = newProfile.wallet_address.toLowerCase();

      // First try to update existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        // Update existing profile
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update({
            last_login: new Date().toISOString(),
            web3_provider: newProfile.web3_provider,
            chain_id: newProfile.chain_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return data;
      }

      // Create new profile if it doesn't exist
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert([{
          wallet_address: normalizedAddress,
          web3_provider: newProfile.web3_provider,
          chain_id: newProfile.chain_id,
          last_login: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', address], data);
    },
    onError: (error) => {
      console.error('Error creating/updating profile:', error);
    }
  });

  return {
    profile,
    isLoading,
    error,
    createProfile
  };
}