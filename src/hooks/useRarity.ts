import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface ElementCombination {
  name: string;
  count: number;
}

export function useRarity() {
  // Fetch total number of users and combinations
  const { data: stats } = useQuery({
    queryKey: ['rarity-stats'],
    queryFn: async () => {
      console.log('Fetching rarity stats...');
      
      // Get total number of users who have generated at least one combination
      const { data: activities } = await supabase
        .from('user_activities')
        .select('user_id, activity_type')
        .in('activity_type', ['element_combined', 'combination_discovered']);

      // Count unique users who have combined elements
      const uniqueUsers = new Set(activities?.map(a => a.user_id)).size;
      const totalUsers = Math.max(uniqueUsers, 1); // Ensure at least 1 user

      console.log('Total active users:', totalUsers);

      // Get all combinations with their counts
      const { data: combinations } = await supabase
        .from('element_combinations')
        .select('name, count')
        .order('count', { ascending: false });

      console.log('Combinations:', combinations);

      return {
        totalUsers,
        combinations: combinations || []
      };
    },
    refetchInterval: 5000 // Refetch every 5 seconds for more responsive updates
  });

  const calculateRarity = (name: string): number => {
    if (!stats?.combinations?.length) {
      console.log('No combinations data available');
      return 10; // Base rarity for new elements
    }

    const combination = stats.combinations.find(c => c.name === name);
    if (!combination) {
      console.log(`No data found for combination: ${name}`);
      return 10; // Base rarity for new elements
    }

    // Calculate rarity percentage
    // Formula: (1 - timesGenerated/totalUsers) * 100
    const rarity = Math.round((1 - (combination.count / stats.totalUsers)) * 100);
    
    // Ensure rarity is between 10 and 100
    const finalRarity = Math.max(10, Math.min(100, rarity));

    console.log(`Rarity calculation for ${name}:`, {
      count: combination.count,
      totalUsers: stats.totalUsers,
      rarity: finalRarity
    });

    return finalRarity;
  };

  return {
    calculateRarity,
    combinations: stats?.combinations || [],
    totalUsers: stats?.totalUsers || 1
  };
}