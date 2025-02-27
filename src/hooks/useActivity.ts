import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAddress } from "@thirdweb-dev/react";
import { useProfile } from './useProfile';

interface Activity {
  activity_type: string;
  details?: Record<string, any>;
}

export function useActivity() {
  const address = useAddress();
  const { profile } = useProfile();

  const { mutate: trackActivity } = useMutation({
    mutationFn: async (activity: Activity) => {
      try {
        // Skip activity tracking if no profile is available
        if (!profile?.id) {
          console.log('Activity tracking skipped - no profile found');
          return null;
        }

        // Use a more permissive approach with public RLS policies
        const { data, error } = await supabase
          .from('user_activities')
          .insert([{
            user_id: profile.id,
            activity_type: activity.activity_type,
            details: activity.details || {}
          }]);

        if (error) {
          console.log('Activity tracking error:', error);
          return null;
        }
        
        return data;
      } catch (error) {
        console.log('Activity tracking error:', error);
        // Return null instead of throwing to prevent errors from propagating
        return null;
      }
    },
    // Disable retries to prevent multiple attempts that might fail
    retry: false,
    // Don't throw on error to prevent breaking the app flow
    onError: (error) => {
      console.log('Activity tracking mutation error (handled):', error);
    }
  });

  return { 
    trackActivity: (activity: Activity) => {
      // Only attempt to track if we have a profile
      if (profile?.id) {
        return trackActivity(activity);
      } else {
        console.log('Activity tracking skipped - no profile');
        return Promise.resolve(null);
      }
    }
  };
}