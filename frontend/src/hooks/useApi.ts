"use client";

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions, QueryKey } from "@tanstack/react-query";
import { useToast } from "./useToast";
import { useState, useEffect } from "react";

// Base query hook with common configuration
export function useApiQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, "queryKey" | "queryFn">
) {
  return useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

// Base mutation hook with common configuration
export function useApiMutation<TVariables, TData = unknown, TError = Error, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn">
) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    retry: 0,
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables, context, undefined as any);
    },
    onError: (err, variables, context) => {
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      error(errorMessage);
      options?.onError?.(err, variables, context, undefined as any);
    },
    onSettled: (data, error, variables, context) => {
      options?.onSettled?.(data, error, variables, context, undefined as any);
    },
    ...options,
  });
}

// Specialized mutation hook for CRUD operations with automatic cache invalidation
export function useCrudMutations<TEntity, TCreateInput, TUpdateInput>({
  entityName,
  queryKey,
  createFn,
  updateFn,
  deleteFn,
  getToastMessages = {},
}: {
  entityName: string;
  queryKey: QueryKey;
  createFn: (data: TCreateInput) => Promise<TEntity>;
  updateFn: (id: string, data: TUpdateInput) => Promise<TEntity>;
  deleteFn: (id: string) => Promise<void>;
  getToastMessages?: {
    createSuccess?: string;
    createError?: string;
    updateSuccess?: string;
    updateError?: string;
    deleteSuccess?: string;
    deleteError?: string;
  };
}) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const getMessages = (action: "create" | "update" | "delete", type: "success" | "error") => {
    const key = `${action}${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof getToastMessages;
    return getToastMessages[key] || `${entityName} ${action === "create" ? "تمت الإضافة" : action === "update" ? "تم التحديث" : "تم الحذف"} ${type === "success" ? "بنجاح ✓" : "فشلت"}`;
  };

  const createMutation = useApiMutation(createFn, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      success(getMessages("create", "success"));
    },
    onError: (err) => {
      error(err instanceof Error ? err.message : getMessages("create", "error"));
    },
  });

  const updateMutation = useApiMutation(({ id, data }: { id: string; data: TUpdateInput }) => updateFn(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      success(getMessages("update", "success"));
    },
    onError: (err) => {
      error(err instanceof Error ? err.message : getMessages("update", "error"));
    },
  });

  const deleteMutation = useApiMutation(deleteFn, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      success(getMessages("delete", "success"));
    },
    onError: (err) => {
      error(err instanceof Error ? err.message : getMessages("delete", "error"));
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}

// Hook for optimistic updates
export interface OptimisticContext<T> {
  previousData?: T;
  rollback: () => void;
}

export function useOptimisticMutation<TVariables, TData = unknown, TError = Error, TDataSnapshot = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: QueryKey;
    onMutate: (variables: TVariables) => Promise<OptimisticContext<TDataSnapshot>>;
    onSuccess?: (data: TData, variables: TVariables, context: OptimisticContext<TDataSnapshot>) => void;
    onError?: (error: TError, variables: TVariables, context: OptimisticContext<TDataSnapshot> | undefined) => void;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: OptimisticContext<TDataSnapshot> | undefined) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useApiMutation<TVariables, TData, TError, OptimisticContext<TDataSnapshot>>(mutationFn, {
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      const result = await options.onMutate(variables);
      return result;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey });
      if (options.successMessage) success(options.successMessage);
      options.onSuccess?.(data, variables, context);
    },
    onError: (err, variables, context) => {
      if (context?.rollback) context.rollback();
      error(err instanceof Error ? err.message : options.errorMessage || "فشلت العملية");
      options.onError?.(err, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey });
      options.onSettled?.(data, error, variables, context);
    },
  });
}

// Helper to create debounced search parameter
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}