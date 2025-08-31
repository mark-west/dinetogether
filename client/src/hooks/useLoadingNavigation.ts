import { useState, useCallback } from 'react';

export function useLoadingNavigation() {
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  const navigateWithLoading = useCallback((path: string) => {
    setLoadingPath(path);
    // Add a small delay to show the loading state before navigation
    setTimeout(() => {
      window.location.href = path;
    }, 150);
  }, []);

  const isLoading = useCallback((path: string) => {
    return loadingPath === path;
  }, [loadingPath]);

  return {
    navigateWithLoading,
    isLoading,
    loadingPath
  };
}