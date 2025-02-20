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
      if (!address) throw new Error('No wallet address found');
      if (!profile?.id) throw new Error('No profile found');

      const { data, error } = await supabase
        .from('user_activities')
        .insert([{
          user_id: profile.id,
          activity_type: activity.activity_type,
          details: activity.details || {}
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  });

  return { trackActivity };
}