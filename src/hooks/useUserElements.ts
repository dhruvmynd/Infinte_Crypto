import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useAddress } from "@thirdweb-dev/react";
import { DraggableItem } from '../types';

export function useUserElements() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  const queryClient = useQueryClient();

  // Get the user ID from either profile, user, or address
  const userId = profile?.id || (user?.id ? user.id : null);
  const isAuthenticated = !!userId || !!address;

  // Fetch user's saved elements
  const { data: savedElements, isLoading, error, refetch } = useQuery({
    queryKey: ['user-elements', userId],
    queryFn: async () => {
      if (!userId) return [];

      try {
        const { data, error } = await supabase
          .from('user_elements')
          .select('element_data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching user elements:', error);
          return [];
        }

        // Extract element data from the response
        return data?.map(item => item.element_data) || [];
      } catch (err) {
        console.error('Error in user elements query:', err);
        return [];
      }
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Save user elements
  const { mutate: saveUserElements } = useMutation({
    mutationFn: async (elements: DraggableItem[]) => {
      if (!userId) {
        console.log('User not authenticated, skipping element save');
        return [];
      }

      try {
        // First, delete existing elements
        const { error: deleteError } = await supabase
          .from('user_elements')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting existing elements:', deleteError);
        }

        // Filter out base elements and only save generated elements
        const elementsToSave = elements.filter(
          element => !element.isBaseElement && element.combinedFrom?.length >= 2
        );

        if (elementsToSave.length === 0) {
          return [];
        }

        // Prepare elements for saving - create a clean copy without position data
        const cleanedElements = elementsToSave.map(element => {
          // Create a deep copy of the element
          const cleanElement = { ...element };
          
          // Remove position data for storage
          delete cleanElement.position;
          delete cleanElement.connectedPoints;
          
          return {
            user_id: userId,
            element_data: cleanElement
          };
        });

        // Insert new elements
        const { data, error } = await supabase
          .from('user_elements')
          .insert(cleanedElements)
          .select();

        if (error) {
          console.error('Error saving user elements:', error);
          return elementsToSave;
        }

        console.log(`Saved ${elementsToSave.length} elements for user ${userId}`);
        
        // Invalidate the query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['user-elements', userId] });
        
        return elementsToSave;
      } catch (err) {
        console.error('Error in save elements mutation:', err);
        return elements;
      }
    },
    onSuccess: (savedElements) => {
      if (userId) {
        queryClient.setQueryData(['user-elements', userId], savedElements);
      }
    },
    onError: (error) => {
      console.error('Error saving user elements:', error);
    }
  });

  return {
    savedElements: savedElements || [],
    isLoading,
    error,
    saveUserElements,
    isAuthenticated,
    refetchElements: refetch
  };
}