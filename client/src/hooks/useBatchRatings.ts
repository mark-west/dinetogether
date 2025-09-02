import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface BatchRatingsHookProps {
  eventIds: string[];
  enabled?: boolean;
}

export function useBatchRatings({ eventIds, enabled = true }: BatchRatingsHookProps) {
  const { isAuthenticated } = useAuth();
  
  // Batch fetch user ratings
  const { data: userRatings = {} } = useQuery({
    queryKey: ['/api/events/batch/ratings', eventIds.sort().join(',')],
    queryFn: async () => {
      if (eventIds.length === 0) return {};
      const response = await fetch(`/api/events/batch/ratings?eventIds=${eventIds.join(',')}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch batch ratings');
      return response.json();
    },
    enabled: enabled && isAuthenticated && eventIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Batch fetch average ratings
  const { data: averageRatings = {} } = useQuery({
    queryKey: ['/api/events/batch/average-ratings', eventIds.sort().join(',')],
    queryFn: async () => {
      if (eventIds.length === 0) return {};
      const response = await fetch(`/api/events/batch/average-ratings?eventIds=${eventIds.join(',')}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch batch average ratings');
      return response.json();
    },
    enabled: enabled && eventIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    getUserRating: (eventId: string) => userRatings[eventId],
    getAverageRating: (eventId: string) => averageRatings[eventId],
    userRatings,
    averageRatings
  };
}