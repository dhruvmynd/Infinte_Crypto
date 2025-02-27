import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useAddress } from "@thirdweb-dev/react";

interface GameStats {
  id: string;
  user_id: string;
  basic_score: number;
  timed_score: number;
  category_score: number;
  one_vs_one_score: number;
  created_at: string;
  updated_at: string;
}

export function useGameStats() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const address = useAddress();
  const queryClient = useQueryClient();

  // Get the user ID from either profile, user, or address
  const userId = profile?.id || (user?.id ? user.id : null);
  const isAuthenticated = !!userId || !!address;

  // Fetch user's game stats
  const { data: gameStats, isLoading, error } = useQuery({
    queryKey: ['game-stats', userId],
    queryFn: async () => {
      // Return default stats if user is not authenticated
      if (!userId) {
        return {
          basic_score: 0,
          timed_score: 0,
          category_score: 0,
          one_vs_one_score: 0
        };
      }

      try {
        const { data, error } = await supabase
          .from('user_game_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching game stats:', error);
          return {
            basic_score: 0,
            timed_score: 0,
            category_score: 0,
            one_vs_one_score: 0
          };
        }
        
        // If no stats found, create default stats
        if (!data) {
          const defaultStats = {
            user_id: userId,
            basic_score: 0,
            timed_score: 0,
            category_score: 0,
            one_vs_one_score: 0
          };
          
          try {
            const { error: insertError } = await supabase
              .from('user_game_stats')
              .insert([defaultStats]);
              
            if (insertError) {
              console.error('Error creating default stats:', insertError);
            }
            
            return defaultStats;
          } catch (insertErr) {
            console.error('Error creating default stats:', insertErr);
            return defaultStats;
          }
        }
        
        return data as GameStats;
      } catch (err) {
        console.error('Error in game stats query:', err);
        return {
          basic_score: 0,
          timed_score: 0,
          category_score: 0,
          one_vs_one_score: 0
        };
      }
    },
    enabled: true, // Always fetch, even if userId is null
    retry: 1,
    staleTime: 5000, // 5 seconds
    refetchInterval: 5000 // Refetch every 5 seconds for more responsive updates
  });

  // Update game stats
  const { mutate: updateGameStats } = useMutation({
    mutationFn: async (stats: Partial<GameStats>) => {
      // Skip update if user is not authenticated
      if (!userId) {
        console.log('User not authenticated, skipping stats update');
        return {
          basic_score: stats.basic_score || 0,
          timed_score: stats.timed_score || 0,
          category_score: stats.category_score || 0,
          one_vs_one_score: stats.one_vs_one_score || 0
        };
      }
      
      try {
        // Check if stats exist
        const { data: existingStats } = await supabase
          .from('user_game_stats')
          .select('id, basic_score, timed_score, category_score, one_vs_one_score')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existingStats?.id) {
          // Update existing stats - only update if new score is higher
          const updateData: Record<string, any> = {};
          
          if (stats.basic_score !== undefined) {
            updateData.basic_score = Math.max(existingStats.basic_score || 0, stats.basic_score);
          }
          
          if (stats.timed_score !== undefined) {
            updateData.timed_score = Math.max(existingStats.timed_score || 0, stats.timed_score);
          }
          
          if (stats.category_score !== undefined) {
            updateData.category_score = Math.max(existingStats.category_score || 0, stats.category_score);
          }
          
          if (stats.one_vs_one_score !== undefined) {
            updateData.one_vs_one_score = Math.max(existingStats.one_vs_one_score || 0, stats.one_vs_one_score);
          }
          
          // Only update if there are changes
          if (Object.keys(updateData).length > 0) {
            try {
              const { error } = await supabase
                .from('user_game_stats')
                .update(updateData)
                .eq('id', existingStats.id);
                
              if (error) {
                console.error('Error updating game stats:', error);
                return existingStats;
              }
              
              return {
                ...existingStats,
                ...updateData
              };
            } catch (updateErr) {
              console.error('Error in update operation:', updateErr);
              return existingStats;
            }
          }
          
          return existingStats;
        } else {
          // Create new stats
          try {
            const { error } = await supabase
              .from('user_game_stats')
              .insert([{
                user_id: userId,
                basic_score: stats.basic_score || 0,
                timed_score: stats.timed_score || 0,
                category_score: stats.category_score || 0,
                one_vs_one_score: stats.one_vs_one_score || 0
              }]);
              
            if (error) {
              console.error('Error creating game stats:', error);
              return {
                basic_score: stats.basic_score || 0,
                timed_score: stats.timed_score || 0,
                category_score: stats.category_score || 0,
                one_vs_one_score: stats.one_vs_one_score || 0
              };
            }
            
            return {
              user_id: userId,
              basic_score: stats.basic_score || 0,
              timed_score: stats.timed_score || 0,
              category_score: stats.category_score || 0,
              one_vs_one_score: stats.one_vs_one_score || 0
            };
          } catch (insertErr) {
            console.error('Error in insert operation:', insertErr);
            return {
              basic_score: stats.basic_score || 0,
              timed_score: stats.timed_score || 0,
              category_score: stats.category_score || 0,
              one_vs_one_score: stats.one_vs_one_score || 0
            };
          }
        }
      } catch (err) {
        console.error('Error in game stats mutation:', err);
        return {
          basic_score: stats.basic_score || 0,
          timed_score: stats.timed_score || 0,
          category_score: stats.category_score || 0,
          one_vs_one_score: stats.one_vs_one_score || 0
        };
      }
    },
    onSuccess: (data) => {
      if (userId) {
        queryClient.setQueryData(['game-stats', userId], data);
      }
    },
    onError: (error) => {
      console.error('Error updating game stats:', error);
    }
  });

  // Update score for a specific mode
  const updateScore = (mode: 'basic' | 'timed' | 'category' | 'one_vs_one', score: number) => {
    if (!userId) {
      console.log('User not authenticated, skipping score update');
      return;
    }
    
    const updateData: Partial<GameStats> = {};
    
    switch (mode) {
      case 'basic':
        updateData.basic_score = score;
        break;
      case 'timed':
        updateData.timed_score = score;
        break;
      case 'category':
        updateData.category_score = score;
        break;
      case 'one_vs_one':
        updateData.one_vs_one_score = score;
        break;
    }
    
    // Immediately update the local cache for a responsive UI
    const currentStats = queryClient.getQueryData<GameStats>(['game-stats', userId]) || {
      basic_score: 0,
      timed_score: 0,
      category_score: 0,
      one_vs_one_score: 0
    };
    
    queryClient.setQueryData(['game-stats', userId], {
      ...currentStats,
      ...updateData
    });
    
    // Then update the server
    updateGameStats(updateData);
  };

  // Increment score for a specific mode
  const incrementScore = (mode: 'basic' | 'timed' | 'category' | 'one_vs_one') => {
    if (!userId) {
      console.log('User not authenticated, skipping score increment');
      return;
    }
    
    const currentStats = gameStats || {
      basic_score: 0,
      timed_score: 0,
      category_score: 0,
      one_vs_one_score: 0
    };
    
    const updateData: Partial<GameStats> = {};
    
    switch (mode) {
      case 'basic':
        updateData.basic_score = (currentStats.basic_score || 0) + 1;
        break;
      case 'timed':
        updateData.timed_score = (currentStats.timed_score || 0) + 1;
        break;
      case 'category':
        updateData.category_score = (currentStats.category_score || 0) + 1;
        break;
      case 'one_vs_one':
        updateData.one_vs_one_score = (currentStats.one_vs_one_score || 0) + 1;
        break;
    }
    
    // Immediately update the local cache for a responsive UI
    queryClient.setQueryData(['game-stats', userId], {
      ...currentStats,
      ...updateData
    });
    
    // Then update the server
    updateGameStats(updateData);
  };

  return {
    gameStats: gameStats || {
      basic_score: 0,
      timed_score: 0,
      category_score: 0,
      one_vs_one_score: 0
    },
    isLoading,
    error,
    updateScore,
    incrementScore,
    updateGameStats,
    isAuthenticated
  };
}