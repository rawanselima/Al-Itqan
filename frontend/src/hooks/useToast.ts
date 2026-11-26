"use client";

import { toast, ToastOptions, Id } from "react-toastify";

interface ToastConfig {
  success?: string;
  error?: string;
  loading?: string;
}

export function useToast() {
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      toastId: options?.toastId,
      ...options,
    });
  };

  const showError = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      toastId: options?.toastId,
      ...options,
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      toastId: options?.toastId,
      ...options,
    });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      toastId: options?.toastId,
      ...options,
    });
  };

  const showLoading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      toastId: options?.toastId,
      ...options,
    });
  };

  const dismiss = (toastId?: Id) => {
    if (toastId !== undefined) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const update = (toastId: string, config: ToastConfig) => {
    if (config.success) {
      toast.update(toastId, { render: config.success, type: "success", isLoading: false });
    } else if (config.error) {
      toast.update(toastId, { render: config.error, type: "error", isLoading: false });
    } else if (config.loading) {
      toast.update(toastId, { render: config.loading, type: "default", isLoading: true });
    }
  };

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    loading: showLoading,
    dismiss,
    update,
  };
}

export function createToastHandlers(defaultSuccess?: string, defaultError?: string) {
  const { success, error, dismiss, update, loading } = useToast();

  const withToast = async <T>(
    promise: Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      loadingMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T | null> => {
    const loadingId = options?.loadingMessage ? loading(options.loadingMessage) : null;

    try {
      const data = await promise;
      if (loadingId) dismiss(loadingId);
      success(options?.successMessage || defaultSuccess || "تمت العملية بنجاح ✓");
      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      if (loadingId) dismiss(loadingId);
      const errorMessage = err instanceof Error ? err.message : (options?.errorMessage || defaultError || "فشلت العملية");
      error(errorMessage);
      options?.onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    }
  };

  const withOptimisticUpdate = async <T>(
    promise: Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      onMutate?: () => Promise<{ rollback: () => void }>;
      onError?: (error: Error, rollback: () => void) => void;
      onSettled?: () => void;
    }
  ): Promise<T | null> => {
    let rollback: (() => void) | null = null;

    try {
      if (options.onMutate) {
        const result = await options.onMutate();
        rollback = result.rollback;
      }

      const data = await promise;
      success(options.successMessage || defaultSuccess || "تمت العملية بنجاح ✓");
      options.onSettled?.();
      return data;
    } catch (err) {
      if (rollback) {
        rollback();
        options.onError?.(err instanceof Error ? err : new Error("Error"), rollback);
      }
      error(options.errorMessage || defaultError || "فشلت العملية");
      options.onSettled?.();
      return null;
    }
  };

  return {
    success,
    error,
    loading,
    dismiss,
    update,
    withToast,
    withOptimisticUpdate,
  };
}