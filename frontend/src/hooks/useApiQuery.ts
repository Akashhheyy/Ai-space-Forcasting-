import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/types/api";

interface UseApiQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseApiQueryResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err : new ApiError("Unexpected error", 0));
        setData(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    void refetch();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, ...deps]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return undefined;
    const id = window.setInterval(() => void refetch(), refetchInterval);
    return () => window.clearInterval(id);
  }, [refetch, refetchInterval, enabled]);

  const isEmpty =
    !isLoading &&
    !error &&
    (data == null ||
      (Array.isArray(data) && data.length === 0) ||
      (typeof data === "object" &&
        data !== null &&
        "items" in data &&
        Array.isArray((data as { items: unknown[] }).items) &&
        (data as { items: unknown[] }).items.length === 0));

  return { data, error, isLoading, isEmpty, refetch };
}
