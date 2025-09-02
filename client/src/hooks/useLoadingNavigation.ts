import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';

export function useLoadingNavigation() {
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const navigateWithLoading = useCallback((path: string) => {
    setLoadingPath(path);
    // Add a small delay to show the loading state before navigation
    setTimeout(() => {
      navigate(path);
      setLoadingPath(null);
    }, 150);
  }, [navigate]);

  const isLoading = useCallback((path: string) => {
    return loadingPath === path;
  }, [loadingPath]);

  return {
    navigateWithLoading,
    isLoading,
    loadingPath
  };
}