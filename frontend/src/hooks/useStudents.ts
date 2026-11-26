"use client";

import { useApiQuery, useCrudMutations, useOptimisticMutation } from "./useApi";
import { api } from "@/lib/api";

export interface Student {
  _id: string;
  name: string;
  phone: string;
  circleId: {
    _id: string;
    name: string;
    days?: (string | number)[];
    time?: string;
  };
  isActive: boolean;
  joinedAt?: string;
  leftAt?: string | null;
  warningForRemoval?: boolean;
}

interface StudentsParams {
  circleId?: string;
  search?: string;
}

export function useStudents(params: StudentsParams = {}) {
  const { data: students = [], isLoading, isPending, error, refetch } = useApiQuery<Student[]>(
    ["students", params],
    () => api.getStudents(params)
  );

  const { create, update, delete: deleteStudent, isCreating, isUpdating, isDeleting } = useCrudMutations<
    Student,
    { name: string; phone?: string; circleId: string; joinedAt?: string; leftAt?: string | null; warningForRemoval?: boolean },
    Partial<Student>
  >({
    entityName: "الطالبة",
    queryKey: ["students"],
    createFn: api.createStudent,
    updateFn: (id, data) => api.updateStudent(id, data),
    deleteFn: async (id) => { await api.deleteStudent(id); },
    getToastMessages: {
      createSuccess: "تم إضافة الطالبة بنجاح ✓",
      createError: "فشل إضافة الطالبة",
      updateSuccess: "تم تحديث الطالبة بنجاح ✓",
      updateError: "فشل تحديث الطالبة",
      deleteSuccess: "تم حذف الطالبة بنجاح ✓",
      deleteError: "فشل حذف الطالبة",
    },
  });

  const toggleWarningMutation = useOptimisticMutation<
    { id: string; warningForRemoval: boolean },
    Student,
    Error,
    Student[]
  >(
    ({ id, warningForRemoval }) => api.updateStudent(id, { warningForRemoval }),
    {
      queryKey: ["students", params],
      onMutate: async ({ id, warningForRemoval }) => {
        const previousStudents = students;
        return {
          previousData: previousStudents,
          rollback: () => {
            // The query invalidation will handle rollback
          },
        };
      },
      successMessage: "تم تحديث علامة التحذير",
      errorMessage: "فشل تحديث علامة التحذير",
    }
  );

  return {
    students,
    isLoading,
    isPending,
    error,
    refetch,
    createStudent: create,
    updateStudent: update,
    deleteStudent,
    toggleWarning: toggleWarningMutation.mutateAsync,
    isCreating,
    isUpdating,
    isDeleting,
    isTogglingWarning: toggleWarningMutation.isPending,
  };
}