import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useProfile } from './useProfile';
import { useAddress } from "@thirdweb-dev/react";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { createProfile } = useProfile();
  const address = useAddress();

  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return retryOperation(operation, retries - 1);
      }
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleUser = async (user: User | null) => {
      if (!mounted) return;

      if (user) {
        setUser(user);
        try {
          await retryOperation(() =>
            createProfile({
              user_id: user.id,
              email: user.email
            })
          );
        } catch (err) {
          console.error('Error handling web2 user profile:', err);
          // Don't throw here - allow the user to continue even if profile creation fails
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    // Get initial session with retry
    retryOperation(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        handleUser(session?.user ?? null);
      }
    }).catch(error => {
      console.error('Error getting initial session:', error);
      if (mounted) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [createProfile]);

  // If we have a wallet address but no user, we're still authenticated
  const isAuthenticated = !!user || !!address;

  return { 
    user, 
    loading,
    isAuthenticated
  };
}