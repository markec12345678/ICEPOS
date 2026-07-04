"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { toUserFriendlyError, type UserFriendlyError } from "@/lib/errors";

/**
 * Centraliziran error handling hook.
 *
 * Namesto toast.error("Napaka") povsod uporabljaj:
 *
 *   const { handleError } = useErrorHandler();
 *   try { ... } catch (e) { handleError(e); }
 *
 * Avtomatsko pretvori tehnično napako v user-friendly toast.
 */
export function useErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    const friendly = toUserFriendlyError(error);

    // Dodaj context v opis če je podan
    const description = context
      ? `${context}: ${friendly.description}`
      : friendly.description;

    toast.error(friendly.title, {
      description,
      duration: friendly.retryable ? 6000 : 4000,
      action: friendly.retryable
        ? {
            label: "Poskusi znova",
            onClick: () => window.location.reload(),
          }
        : undefined,
    });

    // Log za debugging (samo v development)
    if (process.env.NODE_ENV === "development" && friendly.technical) {
      console.error(`[${friendly.title}] ${friendly.technical}`);
    }
  }, []);

  const handleApiError = useCallback(
    async <T>(apiCall: () => Promise<T>, context?: string): Promise<T | null> => {
      try {
        return await apiCall();
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError]
  );

  const showSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
    });
  }, []);

  const showWarning = useCallback((message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  }, []);

  const showInfo = useCallback((message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 3000,
    });
  }, []);

  return {
    handleError,
    handleApiError,
    showSuccess,
    showWarning,
    showInfo,
  };
}

/**
 * Wrapper za try-catch z avtomatskim error handlingom.
 *
 * const { withErrorHandling } = useErrorHandler();
 * const result = await withErrorHandling(async () => {
 *   const res = await fetch("/api/orders");
 *   return res.json();
 * }, "Nalaganje računov");
 */
export function useWithErrorHandling() {
  const { handleError } = useErrorHandler();

  const withErrorHandling = useCallback(
    async <T>(fn: () => Promise<T>, context?: string): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError]
  );

  return { withErrorHandling, handleError };
}
