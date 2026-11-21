"use client";

import { useEffect, useState, useMemo } from "react";
import { api, Circle } from "@/lib/api";

// Days of homework: Saturday through Thursday (Friday off)
const HOMEWORK_DAYS = [
  { key: "saturday", name: "السبت", offset: 0 },
  { key: "sunday", name: "الأحد", offset: 1 },
  { key: "monday", name: "الإثنين", offset: 2 },
  { key: "tuesday", name: "الثلاثاء", offset: 3 },
  { key: "wednesday", name: "الأربعاء", offset: 4 },
  { key: "thursday", name: "الخميس", offset: 5 },
];

// Helper to get nearest Saturday for a date
function getSaturdayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  // Saturday is day 6. In JS, day 6 offset is 0, day 0 (Sunday) offset is -1, day 1 is -2, etc.
  const diff = day === 6 ? 0 : -(day + 1);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HomeworkPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [currentSaturday, setCurrentSaturday] = useState(() => getSaturdayOfWeek(new Date()));
  const [students, setStudents] = useState<any[]>([]);
  const [recordsMap, setRecordsMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load Circles on Mount
  useEffect(() => {
    async function loadCircles() {
      try {
        const data = await api.getCircles();
        setCircles(data);
        if (data.length > 0) {
          setSelectedCircleId(data[0]._id);
        }
      } catch (err: any) {
        console.error(err);
      }
    }
    loadCircles();
  }, []);

  // Compute dates for Saturday through Thursday
  const weekDaysDates = useMemo(() => {
    return HOMEWORK_DAYS.map((day) => {
      const d = new Date(currentSaturday);
      d.setDate(d.getDate() + day.offset);
      return {
        ...day,
        dateStr: formatDate(d),
        displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
      };
    });
  }, [currentSaturday]);

  const startDate = weekDaysDates[0].dateStr;
  const endDate = weekDaysDates[weekDaysDates.length - 1].dateStr;

  // Load Homework records for current week
  const loadHomework = async () => {
    if (!selectedCircleId) return;
    try {
      setLoading(true);
      const res = await api.getHomework(selectedCircleId, startDate, endDate);
      setStudents(res.students || []);

      const map = new Map<string, boolean>();
      res.records.forEach((r) => {
        // key format: "studentId_YYYY-MM-DD"
        map.set(`${r.studentId}_${r.date}`, r.completed);
      });
      setRecordsMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, [selectedCircleId, startDate, endDate]);

  // Navigate Weeks
  const handlePrevWeek = () => {
    const prev = new Date(currentSaturday);
    prev.setDate(prev.getDate() - 7);
    setCurrentSaturday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentSaturday);
    next.setDate(next.getDate() + 7);
    setCurrentSaturday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentSaturday(getSaturdayOfWeek(new Date()));
  };

  // Toggle Homework cell
  const handleToggle = async (studentId: string, dateStr: string) => {
    const key = `${studentId}_${dateStr}`;
    const currentVal = Boolean(recordsMap.get(key));
    const newVal = !currentVal;

    // Optimistic UI Update
    setRecordsMap((prev) => {
      const updated = new Map(prev);
      updated.set(key, newVal);
      return updated;
    });

    try {
      await api.toggleHomework(selectedCircleId, studentId, dateStr, newVal);
    } catch (err) {
      // Revert if error
      setRecordsMap((prev) => {
        const updated = new Map(prev);
        updated.set(key, currentVal);
        return updated;
      });
      alert("فشل تحديث حالة الواجب");
    }
  };

  // Print View
  const handlePrint = () => {
    window.print();
  };

  const currentCircle = circles.find((c) => c._id === selectedCircleId);

  return (
    <div className="p-8 space-y-6">
      {/* 1. SCREEN VIEW */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">متابعة الواجبات الأسبوعية</h2>
            <p className="text-sm text-slate-500 mt-1">
              متابعة إنجاز الورد والواجب اليومي (من السبت إلى الخميس - الجمعة عطلة)
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <span>🖨️</span>
            <span>طباعة كشف الواجبات</span>
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Circle Selector */}
          <div className="w-full md:w-72 space-y-1">
            <label className="text-xs font-bold text-slate-600">اختر الحلقة</label>
            <select
              value={selectedCircleId}
              onChange={(e) => setSelectedCircleId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-600"
            >
              {circles.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.days.join("، ")})
                </option>
              ))}
            </select>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm cursor-pointer"
              title="الأسبوع السابق"
            >
              &rarr; الأسبوع السابق
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
            >
              الأسبوع الحالي
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm cursor-pointer"
              title="الأسبوع التالي"
            >
              الأسبوع التالي &larr;
            </button>
          </div>

          {/* Week Date Display */}
          <div className="text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
            من: <span className="text-emerald-800">{startDate}</span> إلى:{" "}
            <span className="text-emerald-800">{endDate}</span>
          </div>
        </div>

        {/* Homework Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري تحميل سجل الواجبات...</div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
            <div className="text-4xl">✍️</div>
            <h3 className="text-base font-bold text-slate-700">لا توجد طالبات في هذه الحلقة</h3>
            <p className="text-xs text-slate-500">قم بإضافة طالبات للحلقة أولاً لمتابعة واجباتهن.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-right w-56">اسم الطالبة</th>
                    {weekDaysDates.map((day) => (
                      <th key={day.key} className="py-4 px-3">
                        <div>{day.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{day.displayDate}</div>
                      </th>
                    ))}
                    <th className="py-4 px-4 w-32">الإنجاز الأسبوعي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {students.map((student) => {
                    // Count completed days for this student
                    let completedDaysCount = 0;
                    weekDaysDates.forEach((day) => {
                      if (recordsMap.get(`${student._id}_${day.dateStr}`)) {
                        completedDaysCount++;
                      }
                    });

                    const percentage = Math.round((completedDaysCount / 6) * 100);

                    return (
                      <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 text-right font-bold text-slate-800">
                          {student.name}
                        </td>

                        {weekDaysDates.map((day) => {
                          const isDone = Boolean(recordsMap.get(`${student._id}_${day.dateStr}`));
                          return (
                            <td key={day.key} className="py-4 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggle(student._id, day.dateStr)}
                                className={`w-9 h-9 rounded-xl font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  isDone
                                    ? "bg-emerald-600 text-white shadow-xs scale-105"
                                    : "bg-slate-100 text-slate-300 hover:bg-slate-200 border border-slate-200"
                                }`}
                                title={`${day.name}: ${isDone ? "تم الواجب" : "لم يُنجز بعد"}`}
                              >
                                {isDone ? "✓" : "-"}
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-xs text-emerald-800">
                              {completedDaysCount} / 6 أيام
                            </span>
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY SHEET */}
      <div className="print-only p-4 font-sans text-black" dir="rtl">
        <div className="text-center pb-6 border-b-2 border-black mb-6 space-y-2">
          <h1 className="text-2xl font-black">كشف متابعة الواجبات الأسبوعية</h1>
          <div className="flex justify-between items-center text-sm font-bold pt-2">
            <span>الحلقة: {currentCircle?.name || "حلقة القرآن"}</span>
            <span>
              الفترة: من السبت {startDate} إلى الخميس {endDate}
            </span>
          </div>
        </div>

        <table className="w-full text-center border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold">
              <th className="border border-black p-2 text-right w-44">اسم الطالبة</th>
              {weekDaysDates.map((d) => (
                <th key={d.key} className="border border-black p-2">
                  {d.name} ({d.displayDate})
                </th>
              ))}
              <th className="border border-black p-2 w-24">مجموع الأيام</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              let count = 0;
              weekDaysDates.forEach((day) => {
                if (recordsMap.get(`${student._id}_${day.dateStr}`)) count++;
              });

              return (
                <tr key={student._id} className="border-b border-black">
                  <td className="border border-black p-2 text-right font-bold">{student.name}</td>
                  {weekDaysDates.map((day) => {
                    const isDone = Boolean(recordsMap.get(`${student._id}_${day.dateStr}`));
                    return (
                      <td key={day.key} className="border border-black p-2 font-bold">
                        {isDone ? "✓" : "-"}
                      </td>
                    );
                  })}
                  <td className="border border-black p-2 font-bold">{count} / 6</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-12 flex justify-between items-center text-sm font-bold pt-8 border-t border-black">
          <div>توقيع المشرف / المعلمة: .......................................</div>
          <div>نظام الإتقان لإدارة الحلقات</div>
        </div>
      </div>
    </div>
  );
}
