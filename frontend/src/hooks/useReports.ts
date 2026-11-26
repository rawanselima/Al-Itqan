"use client";

import { useApiQuery } from "./useApi";
import { api } from "@/lib/api";

export function useMonthlyReport(circleId: string | null, year: number, month: number) {
  return useApiQuery(
    ["monthly-report", circleId, year, month],
    () => api.getMonthlyReport(circleId!, year, month),
    { enabled: !!circleId }
  );
}

export function useHomeworkReport(circleId: string | null, year: number, month: number) {
  return useApiQuery(
    ["homework-report", circleId, year, month],
    () => api.getHomeworkReport(circleId!, year, month),
    { enabled: !!circleId }
  );
}