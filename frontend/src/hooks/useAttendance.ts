"use client";

import { useApiQuery, useApiMutation } from "./useApi";
import { api } from "@/lib/api";

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  phone: string;
  status: "present" | "absent" | "excused" | "unrecorded";
  hasRecited: boolean;
  order: number | null;
  notes?: string;
  homeworkCompleted?: boolean;
  departureTime?: string | null;
}

export interface AttendanceSession {
  circleId: string;
  date: string;
  isNew: boolean;
  isHoliday?: boolean;
  isOfficialHoliday?: boolean;
  holidayReason?: string;
  records: AttendanceRecord[];
}

export function useAttendance(circleId: string | null, date: string | null) {
  return useApiQuery<AttendanceSession>(
    ["attendance", circleId, date],
    () => api.getAttendance(circleId!, date!),
    { enabled: !!circleId && !!date }
  );
}

export function useAttendanceMutations(circleId: string | null, date: string | null) {
  const queryKey = ["attendance", circleId, date];

  // Save attendance (used for auto-save)
  const saveMutation = useApiMutation(
    (data: { records: AttendanceRecord[]; isHoliday: boolean }) =>
      api.saveAttendance(circleId!, date!, data.records, data.isHoliday),
    {
      onMutate: async (newData) => {
        // Optimistic update handled by the component
        return { previousData: undefined };
      },
      onError: (err) => {
        console.error("فشل الحفظ التلقائي:", err);
      },
      onSettled: () => {
        // Invalidate to ensure consistency
      },
    }
  );

  // Manual save (for explicit save button if needed)
  const manualSaveMutation = useApiMutation(
    (data: { records: AttendanceRecord[]; isHoliday: boolean }) =>
      api.saveAttendance(circleId!, date!, data.records, data.isHoliday),
    {
      onSuccess: () => {
        // The query cache will be updated automatically
      },
    }
  );

  return {
    saveAttendance: saveMutation.mutateAsync,
    manualSaveAttendance: manualSaveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isManualSaving: manualSaveMutation.isPending,
    saveError: saveMutation.error,
  };
}