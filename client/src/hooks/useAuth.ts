import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
    gcTime: 2 * 60 * 1000, // Cache for 2 minutes (reduced for faster photo updates)
    staleTime: 30 * 1000, // Consider fresh for 30 seconds (reduced for faster updates)
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
