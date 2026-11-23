const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `خطأ في الطلب: ${response.statusText}`);
  }

  return response.json();
}

// Circles
export interface Circle {
  _id: string;
  name: string;
  teacherName?: string;
  days: (number | string)[];
  time: string;
  notes?: string;
  studentCount?: number;
  createdAt?: string;
}

export interface Holiday {
  _id: string;
  circleId?: { _id: string; name: string } | string | null;
  from: string;
  to: string;
  reason?: string;
  createdAt?: string;
}

export interface Settings {
  _id?: string;
  supervisorName: string;
  introText?: string;
  outroText?: string;
}

export const DAYS_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export function getDayName(d: number | string): string {
  if (typeof d === "number") {
    return DAYS_NAMES[d] || String(d);
  }
  const n = Number(d);
  if (!isNaN(n) && n in DAYS_NAMES) {
    return DAYS_NAMES[n];
  }
  return String(d);
}

export function formatCircleDays(days?: Array<number | string>, separator = "، "): string {
  if (!days || !Array.isArray(days)) return "";
  return days.map(getDayName).join(separator);
}

export const api = {
  // Circles
  getCircles: () => request<Circle[]>('/circles'),
  getCircle: (id: string) => request<Circle>(`/circles/${id}`),
  createCircle: (data: Partial<Circle>) =>
    request<Circle>('/circles', { method: 'POST', body: JSON.stringify(data) }),
  updateCircle: (id: string, data: Partial<Circle>) =>
    request<Circle>(`/circles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCircle: (id: string) => request<{ message: string }>(`/circles/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (params?: { circleId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.circleId) query.append('circleId', params.circleId);
    if (params?.search) query.append('search', params.search);
    return request<any[]>(`/students?${query.toString()}`);
  },
  createStudent: (data: {
    name: string;
    phone?: string;
    circleId: string;
    joinedAt?: string;
    leftAt?: string | null;
    warningForRemoval?: boolean;
  }) =>
    request<any>('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: string, data: any) =>
    request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id: string) =>
    request<{ message: string }>(`/students/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (circleId: string, date: string) =>
    request<{
      circleId: string;
      date: string;
      isNew: boolean;
      isHoliday?: boolean;
      records: Array<{
        studentId: string;
        studentName: string;
        phone: string;
        status: 'present' | 'absent' | 'excused' | 'unrecorded';
        hasRecited: boolean;
        order: number | null;
        notes?: string;
        homeworkCompleted?: boolean;
        departureTime?: string | null;
      }>;
    }>(`/attendance?circleId=${circleId}&date=${date}`),

  saveAttendance: (circleId: string, date: string, records: any[], isHoliday?: boolean) =>
    request<{ message: string; session: any }>('/attendance', {
      method: 'POST',
      body: JSON.stringify({ circleId, date, records, isHoliday }),
    }),

  // Homework
  getHomework: (circleId: string, startDate: string, endDate: string) =>
    request<{
      students: any[];
      records: Array<{
        _id: string;
        studentId: string;
        date: string;
        completed: boolean;
      }>;
    }>(`/homework?circleId=${circleId}&startDate=${startDate}&endDate=${endDate}`),

  toggleHomework: (circleId: string, studentId: string, date: string, completed: boolean) =>
    request<any>('/homework/toggle', {
      method: 'POST',
      body: JSON.stringify({ circleId, studentId, date, completed }),
    }),

  // Reports
  getMonthlyReport: (circleId: string, year: number, month: number) =>
    request<{
      circle: { _id: string; name: string; days: string[]; time: string };
      year: number;
      month: number;
      weeks: Array<{
        weekNumber: number;
        name: string;
        startDate: string;
        endDate: string;
      }>;
      students: Array<{
        studentId: string;
        name: string;
        phone: string;
        attendanceHistory?: Array<{
          date: string;
          status: 'present' | 'absent' | 'excused' | 'unrecorded';
        }>;
        weeklyDetails?: Array<{
          weekNumber: number;
          weekName: string;
          startDate: string;
          endDate: string;
          days: Array<{
            date: string;
            completed: boolean | null;
          }>;
          completedDays: number;
          badge: 'medal' | 'trophy' | null;
        }>;
        weeklyStats: Array<{
          weekNumber: number;
          weekName: string;
          startDate: string;
          endDate: string;
          present: number;
          absent: number;
          excused: number;
          recited: number;
          homeworkDays: number;
        }>;
        totals: {
          present: number;
          absent: number;
          excused: number;
          recited: number;
          homeworkDays: number;
        };
      }>;
    }>(`/reports/monthly?circleId=${circleId}&year=${year}&month=${month}`),

  getHomeworkReport: (circleId: string, yearOrFrom?: number | string, monthOrTo?: number | string) => {
    const params = new URLSearchParams({ circleId });
    if (typeof yearOrFrom === "number") {
      params.append("year", String(yearOrFrom));
      if (monthOrTo) params.append("month", String(monthOrTo));
    } else if (typeof yearOrFrom === "string") {
      params.append("from", yearOrFrom);
      if (monthOrTo) params.append("to", String(monthOrTo));
    }
    return request<{
      report: any;
      warnings: Array<{ studentName: string; date: string; type: "homework" | "attendance" }>;
      text: string;
    }>(`/reports/homework?${params.toString()}`);
  },

  // Holidays
  getHolidays: (circleId?: string) => {
    const q = circleId ? `?circleId=${circleId}` : "";
    return request<Holiday[]>(`/holidays${q}`);
  },
  createHoliday: (data: { circleId?: string | null; from: string; to: string; reason?: string }) =>
    request<Holiday>("/holidays", { method: "POST", body: JSON.stringify(data) }),
  deleteHoliday: (id: string) =>
    request<{ message: string }>(`/holidays/${id}`, { method: "DELETE" }),

  // Settings
  getSettings: () => request<Settings>("/settings"),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
};
