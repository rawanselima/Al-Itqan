"use client";

import { useApiQuery, useCrudMutations } from "./useApi";
import { api, Circle } from "@/lib/api";

export function useCircles() {
  // Fetch all circles
  const { data: circles = [], isLoading, error, refetch } = useApiQuery<Circle[]>(
    ["circles"],
    api.getCircles
  );

  const { create, update, delete: deleteCircle, isCreating, isUpdating, isDeleting } = useCrudMutations<
    Circle,
    Partial<Circle>,
    Partial<Circle>
  >({
    entityName: "الحلقة",
    queryKey: ["circles"],
    createFn: api.createCircle,
    updateFn: (id, data) => api.updateCircle(id, data),
    deleteFn: async (id) => { await api.deleteCircle(id); },
    getToastMessages: {
      createSuccess: "تم إضافة الحلقة بنجاح ✓",
      createError: "فشل إضافة الحلقة",
      updateSuccess: "تم تحديث الحلقة بنجاح ✓",
      updateError: "فشل تحديث الحلقة",
      deleteSuccess: "تم حذف الحلقة بنجاح ✓",
      deleteError: "فشل حذف الحلقة",
    },
  });

  return {
    circles,
    isLoading,
    error,
    refetch,
    createCircle: create,
    updateCircle: update,
    deleteCircle,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

export function useCircle(id: string | null) {
  return useApiQuery<Circle>(
    ["circles", id],
    () => api.getCircle(id!),
    { enabled: !!id }
  );
}