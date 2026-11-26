"use client";

import { useApiQuery, useApiMutation, useCrudMutations } from "./useApi";
import { api, Settings, Holiday } from "@/lib/api";

export function useSettings() {
  const { data: settings, isLoading, error, refetch } = useApiQuery<Settings>(
    ["settings"],
    api.getSettings
  );

  const updateMutation = useApiMutation(
    (data: Partial<Settings>) => api.updateSettings(data),
    {
      onSuccess: () => {
        // The query cache will be updated automatically
      },
    }
  );

  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

export function useHolidays(circleId?: string) {
  const queryKey = ["holidays", circleId];

  const { data: holidays = [], isLoading, error, refetch } = useApiQuery<Holiday[]>(
    queryKey,
    () => api.getHolidays(circleId)
  );

  const { create: createHoliday, delete: deleteHoliday, isCreating, isDeleting } = useCrudMutations<
    Holiday,
    { circleId?: string | null; from: string; to: string; reason?: string },
    never
  >({
    entityName: "الإجازة",
    queryKey,
    createFn: api.createHoliday,
    updateFn: () => Promise.reject(new Error("Not implemented")),
    deleteFn: async (id) => { await api.deleteHoliday(id); },
    getToastMessages: {
      createSuccess: "تم إضافة الإجازة بنجاح ✓",
      createError: "فشل إضافة الإجازة",
      deleteSuccess: "تم حذف الإجازة بنجاح ✓",
      deleteError: "فشل حذف الإجازة",
    },
  });

  return {
    holidays,
    isLoading,
    error,
    refetch,
    createHoliday,
    deleteHoliday,
    isCreating,
    isDeleting,
  };
}