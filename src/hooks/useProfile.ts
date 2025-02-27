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

const MAX_RETRIES = 3;
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

        // If no profile found, create one
        if (!data) {
          console.log('No profile found, creating one for:', normalizedAddress);
          
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                wallet_address: normalizedAddress,
                web3_provider: 'thirdweb',
                email: null, // Explicitly set email to null for Web3 users
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_login: new Date().toISOString()
              })
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating profile:', createError);
              
              // If we get a duplicate key error, try to fetch the profile again
              if (createError.code === '23505') {
                console.log('Duplicate key error, trying to fetch profile again');
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('wallet_address', normalizedAddress)
                  .maybeSingle();
                  
                if (existingProfile) {
                  console.log('Found existing profile after duplicate key error');
                  return existingProfile as Profile;
                }
              }
              
              throw createError;
            }
            
            console.log('Successfully created new profile:', newProfile);
            return newProfile as Profile;
          } catch (createError) {
            console.error('Failed to create profile, trying to fetch again:', createError);
            
            // If creation fails, try to fetch again in case it was created by another concurrent request
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('wallet_address', normalizedAddress)
              .maybeSingle();
              
            if (existingProfile) {
              console.log('Found existing profile on second attempt');
              return existingProfile as Profile;
            }
            
            throw createError;
          }
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
          console.log('Creating profile for wallet address:', normalizedAddress);
          
          // Check if profile already exists
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle();
            
          if (fetchError) {
            console.error('Error fetching existing profile:', fetchError);
          }
            
          if (existingProfile) {
            console.log('Found existing profile, updating:', existingProfile);
            // Update existing profile
            const { data, error } = await supabase
              .from('profiles')
              .update({
                web3_provider: params.web3_provider,
                chain_id: params.chain_id,
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProfile.id)
              .select()
              .single();
              
            if (error) {
              console.error('Error updating web3 profile:', error);
              throw error;
            }
            
            return data;
          }
          
          console.log('No existing profile found, creating new one');
          // Create new profile with explicit null for email to avoid conflicts
          const { data, error } = await supabase
            .from('profiles')
            .insert({
              wallet_address: normalizedAddress,
              web3_provider: params.web3_provider,
              chain_id: params.chain_id,
              email: null, // Explicitly set email to null for Web3 users
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating web3 profile:', error);
            
            // If creation fails due to duplicate key, try to fetch again
            if (error.code === '23505') {
              console.log('Duplicate key error during creation, trying to fetch existing profile');
              const { data: retryProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('wallet_address', normalizedAddress)
                .maybeSingle();
                
              if (retryProfile) {
                console.log('Found existing profile after creation failed');
                return retryProfile;
              }
            }
            
            throw error;
          }
          
          console.log('Successfully created new profile:', data);
          return data;
        }

        // Handle web2 users
        if (params.user_id && params.email) {
          console.log('Creating/updating web2 profile for user:', params.user_id);
          
          // First check if a profile with this email already exists
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', params.email)
            .maybeSingle();
            
          if (fetchError) {
            console.error('Error fetching existing profile by email:', fetchError);
          }
            
          if (existingProfile) {
            console.log('Found existing profile by email, updating:', existingProfile);
            // Update existing profile
            const { data, error } = await supabase
              .from('profiles')
              .update({
                user_id: params.user_id,
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProfile.id)
              .select()
              .single();
              
            if (error) {
              console.error('Error updating web2 profile:', error);
              throw error;
            }
            
            return data;
          }
          
          // Try to create a new profile
          const { data, error } = await supabase
            .from('profiles')
            .insert({
              user_id: params.user_id,
              email: params.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating web2 profile:', error);
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