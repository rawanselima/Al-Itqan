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
  days: string[];
  time: string;
  notes?: string;
  studentCount?: number;
  createdAt?: string;
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
  createStudent: (data: { name: string; phone?: string; circleId: string }) =>
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
      records: Array<{
        studentId: string;
        studentName: string;
        phone: string;
        status: 'present' | 'absent' | 'excused';
        hasRecited: boolean;
        order: number | null;
        notes?: string;
      }>;
    }>(`/attendance?circleId=${circleId}&date=${date}`),

  saveAttendance: (circleId: string, date: string, records: any[]) =>
    request<{ message: string; session: any }>('/attendance', {
      method: 'POST',
      body: JSON.stringify({ circleId, date, records }),
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
};
