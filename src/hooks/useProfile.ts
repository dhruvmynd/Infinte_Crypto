import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAddress } from "@thirdweb-dev/react";

interface Profile {
  id: string;
  user_id: string | null;
  wallet_address: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  last_login: string;
  web3_provider: string | null;
  chain_id: string | null;
}

interface CreateProfileParams {
  wallet_address?: string;
  user_id?: string;
  email?: string;
  web3_provider?: string;
  chain_id?: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const QUERY_TIMEOUT = 10000; // 10 seconds

export function useProfile() {
  const address = useAddress();
  const queryClient = useQueryClient();

  // Fetch profile based on either wallet address or user ID
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', address?.toLowerCase()],
    queryFn: async ({ signal }) => {
      if (!address) return null;

      const normalizedAddress = address.toLowerCase();
      console.log('Fetching profile for address:', normalizedAddress);

      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), QUERY_TIMEOUT);
        });

        // Create the fetch promise with case-insensitive search
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', normalizedAddress)
          .maybeSingle()
          .abortSignal(signal);

        // Race between fetch and timeout
        const { data, error } = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('Supabase error fetching profile:', error);
          throw error;
        }

        console.log('Profile data:', data);
        return data as Profile | null;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Profile fetch aborted - this is normal during cleanup');
          return null;
        }
        console.error('Error in profile query:', error);
        throw error;
      }
    },
    enabled: !!address,
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY,
    staleTime: 30000, // 30 seconds
    cacheTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  // Create or update profile
  const { mutate: createProfile, isLoading: isCreating } = useMutation({
    mutationFn: async (params: CreateProfileParams) => {
      try {
        // Handle web3 users
        if (params.wallet_address) {
          const normalizedAddress = params.wallet_address.toLowerCase();
          console.log('Creating profile for address:', normalizedAddress);
          
          // Always create a new profile for web3 users
          const { data, error } = await supabase
            .from('profiles')
            .insert({
              wallet_address: normalizedAddress,
              web3_provider: params.web3_provider,
              chain_id: params.chain_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating web3 profile:', error);
            throw error;
          }
          return data;
        }

        // Handle web2 users
        if (params.user_id && params.email) {
          console.log('Creating/updating web2 profile for user:', params.user_id);
          const { data, error } = await supabase
            .from('profiles')
            .upsert({
              user_id: params.user_id,
              email: params.email,
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (error) {
            console.error('Error upserting web2 profile:', error);
            throw error;
          }
          return data;
        }

        throw new Error('Either wallet_address or both user_id and email are required');
      } catch (error) {
        console.error('Profile mutation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Profile created/updated successfully:', data);
      queryClient.setQueryData(['profile', address?.toLowerCase()], data);
    },
    onError: (error) => {
      console.error('Error in profile mutation:', error);
    },
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY
  });

  return {
    profile,
    isLoading: isLoading || isCreating,
    error,
    createProfile
  };
}