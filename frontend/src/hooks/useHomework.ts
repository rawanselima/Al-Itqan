"use client";

import { useApiQuery, useApiMutation } from "./useApi";
import { api } from "@/lib/api";

export interface HomeworkRecord {
  _id: string;
  studentId: string;
  date: string;
  completed: boolean;
}

export interface HomeworkResponse {
  students: Array<{
    _id: string;
    name: string;
    phone: string;
  }>;
  records: HomeworkRecord[];
}

export function useHomework(circleId: string | null, startDate: string | null, endDate: string | null) {
  return useApiQuery<HomeworkResponse>(
    ["homework", circleId, startDate, endDate],
    () => api.getHomework(circleId!, startDate!, endDate!),
    { enabled: !!circleId && !!startDate && !!endDate }
  );
}

export function useHomeworkMutations(circleId: string | null) {
  const queryKey = ["homework", circleId];

  const toggleMutation = useApiMutation(
    (data: { studentId: string; date: string; completed: boolean }) =>
      api.toggleHomework(circleId!, data.studentId, data.date, data.completed),
    {
      onMutate: async () => {
        // Invalidate all homework queries for this circle
        // The component handles optimistic updates
      },
      onSuccess: () => {
        // No toast for individual toggles to avoid spam
      },
      onError: (error: Error) => {
        console.error("فشل تحديث الواجب:", error);
      },
      onSettled: () => {
        // Invalidate to ensure consistency
      },
    }
  );

  return {
    toggleHomework: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}