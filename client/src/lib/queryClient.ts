import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL - use environment variable for mobile apps, fallback to relative for web
const getApiBaseUrl = () => {
  // In production mobile builds, use the environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // For web development/production, use relative URLs
  return '';
};

const API_BASE_URL = getApiBaseUrl();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    } catch (parseError) {
      // If we can't read the response text, just use status
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Prepend API base URL for mobile apps
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Create full URL for mobile apps
    const relativeUrl = queryKey.join("/") as string;
    const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_BASE_URL}${relativeUrl}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Handle responses without bodies (204, 304) 
    if (res.status === 204 || res.status === 304) {
      return null;
    }
    
    // Check if response has content and is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // If it's not JSON, check if it's empty (204 No Content, etc.)
      const text = await res.text();
      if (!text.trim()) {
        return null;
      }
      throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
    }
    
    try {
      return await res.json();
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from server');
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - cache data aggressively
      retry: false,
      retryOnMount: false,
      gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    },
    mutations: {
      retry: false,
    },
  },
});
