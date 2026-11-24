"use client";

import { useEffect, useState, useMemo } from "react";
import { api, Circle, formatCircleDays } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import { HomeworkReportModal } from "@/components/HomeworkReportModal";
import {
  LuPrinter,
  LuPenTool,
  LuChevronRight,
  LuChevronLeft,
  LuBookOpen,
  LuCalendar,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";

const MONTHS_AR = [
  { val: 1, name: "يناير" },
  { val: 2, name: "فبراير" },
  { val: 3, name: "مارس" },
  { val: 4, name: "أبريل" },
  { val: 5, name: "مايو" },
  { val: 6, name: "يونيو" },
  { val: 7, name: "يوليو" },
  { val: 8, name: "أغسطس" },
  { val: 9, name: "سبتمبر" },
  { val: 10, name: "أكتوبر" },
  { val: 11, name: "نوفمبر" },
  { val: 12, name: "ديسمبر" },
];

const ARABIC_DAYS: Record<number, string> = {
  6: "السبت",
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
};

interface CalendarWeekDay {
  dateStr: string;
  displayDate: string;
  name: string;
  dayIndex: number;
}

interface CalendarWeek {
  index: number;
  name: string;
  startDate: string;
  endDate: string;
  days: CalendarWeekDay[];
}

/**
 * حساب أسابيع الشهر التقويمية الفعلية
 * - تبدأ من السبت وتستبعد الجمعة
 * - محصورة بدقة داخل الشهر (أيام الشهور الأخرى لا تظهر نهائياً)
 * - الأسبوع الأول يبدأ من أول يوم واجب في الشهر (مثلاً الأحد 1/11 = 5 أيام بدون السبت 31/10)
 * - الأسبوع الأخير ينتهي بآخر يوم واجب في الشهر (مثلاً الإثنين 30/11 = 3 أيام بدون ديسمبر)
 */
function getMonthCalendarWeeks(y: number, m: number): CalendarWeek[] {
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const lastDay = new Date(Date.UTC(y, m, 0));

  const rawWeeksMap = new Map<string, CalendarWeekDay[]>();
  const satOrder: string[] = [];

  let cur = new Date(firstDay);
  while (cur <= lastDay) {
    const dayOfWeek = cur.getUTCDay();
    // استبعاد الجمعة (5)
    if (dayOfWeek !== 5) {
      const diff = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
      const sat = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + diff));
      const satKey = sat.toISOString().slice(0, 10);
      const dateStr = cur.toISOString().slice(0, 10);
      const displayDate = `${cur.getUTCDate()}/${cur.getUTCMonth() + 1}`;

      if (!rawWeeksMap.has(satKey)) {
        rawWeeksMap.set(satKey, []);
        satOrder.push(satKey);
      }

      rawWeeksMap.get(satKey)!.push({
        dateStr,
        displayDate,
        name: ARABIC_DAYS[dayOfWeek] || "",
        dayIndex: dayOfWeek,
      });
    }
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 1));
  }

  return satOrder.map((satKey, idx) => {
    const days = rawWeeksMap.get(satKey) || [];
    return {
      index: idx,
      name: `الأسبوع ${idx + 1}`,
      startDate: days[0]?.dateStr || "",
      endDate: days[days.length - 1]?.dateStr || "",
      days,
    };
  });
}

export default function HomeworkPage() {
  const currentDate = new Date();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");

  // Month & Year state
  const [year, setYear] = useState(() => currentDate.getFullYear());
  const [month, setMonth] = useState(() => currentDate.getMonth() + 1);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const [students, setStudents] = useState<any[]>([]);
  const [recordsMap, setRecordsMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    async function loadCircles() {
      try {
        const data = await api.getCircles();
        setCircles(data);
        if (data.length > 0) {
          const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const urlCircleId = params?.get("circleId");
          if (urlCircleId && data.some((c) => c._id === urlCircleId)) {
            setSelectedCircleId(urlCircleId);
          } else {
            setSelectedCircleId(data[0]._id);
          }
        }
      } catch (err: any) {
        console.error(err);
      }
    }
    loadCircles();
  }, []);

  // حساب أسابيع الشهر المختار بدقة تقويمية
  const monthWeeks = useMemo(() => {
    return getMonthCalendarWeeks(year, month);
  }, [year, month]);

  // تصحيح الأسبوع المختار إذا تغير عدد أسابيع الشهر
  useEffect(() => {
    if (selectedWeekIndex >= monthWeeks.length && monthWeeks.length > 0) {
      setSelectedWeekIndex(0);
    }
  }, [monthWeeks, selectedWeekIndex]);

  const currentWeek: CalendarWeek | undefined = monthWeeks[selectedWeekIndex] || monthWeeks[0];

  const startDate = currentWeek?.startDate || "";
  const endDate = currentWeek?.endDate || "";
  const weekDays = currentWeek?.days || [];

  const loadHomework = async () => {
    if (!selectedCircleId || !startDate || !endDate) return;
    try {
      setLoading(true);
      const res = await api.getHomework(selectedCircleId, startDate, endDate);
      setStudents(res.students || []);

      const map = new Map<string, boolean>();
      res.records.forEach((r: any) => {
        map.set(`${r.studentId}_${r.date}`, Boolean(r.completed ?? (r.status === 'done')));
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

  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    } else {
      // الرجوع للشهر السابق
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
      setSelectedWeekIndex(0);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeekIndex < monthWeeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    } else {
      // التقدم للشهر التالي
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
      setSelectedWeekIndex(0);
    }
  };

  const handleCurrentWeek = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedWeekIndex(0);
  };

  const handleToggle = async (studentId: string, dateStr: string) => {
    const key = `${studentId}_${dateStr}`;
    const currentVal = Boolean(recordsMap.get(key));
    const newVal = !currentVal;

    setRecordsMap((prev) => {
      const updated = new Map(prev);
      updated.set(key, newVal);
      return updated;
    });

    try {
      await api.toggleHomework(selectedCircleId, studentId, dateStr, newVal);
    } catch {
      setRecordsMap((prev) => {
        const updated = new Map(prev);
        updated.set(key, currentVal);
        return updated;
      });
      alert("فشل تحديث حالة الواجب");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentCircle = circles.find((c) => c._id === selectedCircleId);
  const selectedMonthName = MONTHS_AR.find((m) => m.val === month)?.name || "";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* 1. SCREEN VIEW */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">متابعة الواجبات اليومية</h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              متابعة إنجاز الورد والواجب اليومي بحسب التقويم الشهري المعتمد (من السبت إلى الخميس - الجمعة عطلة)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              suppressHydrationWarning
              onClick={() => setIsReportModalOpen(true)}
              disabled={students.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shadow-sm hover:bg-primary-hover disabled:opacity-50 cursor-pointer transition-all"
            >
              <FaWhatsapp className="w-4 h-4 text-emerald-300" />
              <span>تقرير الواجب للواتساب</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={handlePrint}
              disabled={students.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border bg-surface text-text-main text-xs sm:text-sm font-bold shadow-xs hover:bg-beige disabled:opacity-50 cursor-pointer"
            >
              <LuPrinter className="w-4 h-4" />
              <span>طباعة كشف الواجبات</span>
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-surface-border shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
            {/* Circle Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-main">الحلقة *</label>
              <CustomSelect
                value={selectedCircleId}
                onChange={(val) => setSelectedCircleId(val as string)}
                options={circles.map((c) => ({
                  value: c._id,
                  label: c.name,
                  badge: formatCircleDays(c.days),
                }))}
                icon={<LuBookOpen className="w-4 h-4 text-primary" />}
              />
            </div>

            {/* Month Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-main">الشهر *</label>
              <CustomSelect
                value={month}
                onChange={(val) => {
                  setMonth(Number(val));
                  setSelectedWeekIndex(0);
                }}
                options={MONTHS_AR.map((m) => ({
                  value: m.val,
                  label: `${m.name} (${m.val})`,
                }))}
                icon={<LuCalendar className="w-4 h-4 text-primary" />}
              />
            </div>

            {/* Year Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-main">السنة *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => {
                  setYear(parseInt(e.target.value, 10));
                  setSelectedWeekIndex(0);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-xs sm:text-sm font-bold text-text-main focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>

          {/* Week Selection Pills & Navigation */}
          <div className="pt-2 border-t border-surface-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Week Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {monthWeeks.map((w, idx) => {
                const isSelected = selectedWeekIndex === idx;
                return (
                  <button
                    key={w.name}
                    type="button"
                    onClick={() => setSelectedWeekIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface-hover/60 text-text-muted hover:text-text-main hover:bg-surface-hover"
                    }`}
                  >
                    <span>{w.name}</span>
                    <span className="text-[10px] opacity-75 mr-1.5">({w.days.length} أيام)</span>
                  </button>
                );
              })}
            </div>

            {/* Prev / Next & Dates */}
            <div className="flex items-center justify-between md:justify-end gap-2 text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="px-2.5 py-1.5 rounded-xl border border-surface-border hover:bg-surface-hover font-bold text-text-main flex items-center gap-1 cursor-pointer"
                >
                  <LuChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={handleCurrentWeek}
                  className="px-2.5 py-1.5 rounded-xl border border-primary-subtle bg-primary-light text-primary font-bold hover:bg-primary/20 cursor-pointer"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="px-2.5 py-1.5 rounded-xl border border-surface-border hover:bg-surface-hover font-bold text-text-main flex items-center gap-1 cursor-pointer"
                >
                  <span>التالي</span>
                  <LuChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-beige px-3 py-1.5 rounded-xl border border-surface-border font-bold text-text-main text-[11px] sm:text-xs">
                من: <span className="text-primary">{startDate}</span> إلى:{" "}
                <span className="text-primary">{endDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Homework Table */}
        {loading ? (
          <div className="p-12 text-center text-text-muted">جاري تحميل سجل الواجبات...</div>
        ) : students.length === 0 ? (
          <div className="p-12 sm:p-16 text-center bg-surface rounded-2xl sm:rounded-3xl border border-dashed border-surface-border space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-primary mx-auto">
              <LuPenTool className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-text-main">لا توجد طالبات في هذه الحلقة</h3>
            <p className="text-xs text-text-muted">قم بإضافة طالبات للحلقة أولاً لمتابعة واجباتهن.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl sm:rounded-3xl border border-surface-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs sm:text-sm min-w-[500px]">
                <thead className="bg-beige/70 text-text-muted text-xs font-bold border-b border-surface-border">
                  <tr>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-right w-44 sticky right-0 bg-beige/90 z-20">
                      اسم الطالبة
                    </th>
                    {weekDays.map((day) => (
                      <th key={day.dateStr} className="py-3 sm:py-4 px-2 sm:px-3">
                        <div className="font-bold text-text-main">{day.name}</div>
                        <div className="text-[10px] text-text-muted font-normal mt-0.5 font-mono">
                          {day.displayDate}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 sm:py-4 px-3 sm:px-4 w-32">
                      الإنجاز الأسبوعي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {students.map((student) => {
                    const totalDaysInWeek = weekDays.length;
                    const completedDaysCount = weekDays.filter((d) =>
                      Boolean(recordsMap.get(`${student._id}_${d.dateStr}`))
                    ).length;

                    const percentage =
                      totalDaysInWeek > 0
                        ? Math.round((completedDaysCount / totalDaysInWeek) * 100)
                        : 0;

                    return (
                      <tr key={student._id} className="hover:bg-beige/40 transition-colors">
                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-right font-bold text-text-main sticky right-0 bg-surface z-10 border-l border-surface-border shadow-xs">
                          {student.name}
                        </td>

                        {weekDays.map((day) => {
                          const isDone = Boolean(recordsMap.get(`${student._id}_${day.dateStr}`));
                          return (
                            <td key={day.dateStr} className="py-3 sm:py-4 px-2 sm:px-3">
                              <button
                                type="button"
                                onClick={() => handleToggle(student._id, day.dateStr)}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  isDone
                                    ? "bg-primary text-white shadow-xs scale-105"
                                    : "bg-beige text-text-muted hover:bg-primary-light border border-surface-border"
                                }`}
                                title={`${day.name} (${day.displayDate}): ${isDone ? "تم الواجب" : "لم يُنجز بعد"}`}
                              >
                                {isDone ? "✓" : "-"}
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[11px] sm:text-xs text-primary font-mono">
                              {completedDaysCount} / {totalDaysInWeek}
                            </span>
                            <div className="w-16 sm:w-20 bg-beige rounded-full h-1.5 overflow-hidden border border-surface-border">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all"
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
              شهر {selectedMonthName} {year} - {currentWeek?.name} (من {startDate} إلى {endDate})
            </span>
          </div>
        </div>

        <table className="w-full text-center border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold">
              <th className="border border-black p-2 text-right w-44">اسم الطالبة</th>
              {weekDays.map((d) => (
                <th key={d.dateStr} className="border border-black p-2">
                  {d.name} ({d.displayDate})
                </th>
              ))}
              <th className="border border-black p-2 w-24">مجموع الأيام</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const completedCount = weekDays.filter((d) =>
                Boolean(recordsMap.get(`${student._id}_${d.dateStr}`))
              ).length;

              return (
                <tr key={student._id} className="border-b border-black">
                  <td className="border border-black p-2 text-right font-bold">{student.name}</td>
                  {weekDays.map((day) => {
                    const isDone = Boolean(recordsMap.get(`${student._id}_${day.dateStr}`));
                    return (
                      <td key={day.dateStr} className="border border-black p-2 font-bold">
                        {isDone ? "✓" : "-"}
                      </td>
                    );
                  })}
                  <td className="border border-black p-2 font-bold">
                    {completedCount} / {weekDays.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* WhatsApp Report Modal */}
      <HomeworkReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        circle={currentCircle}
      />
    </div>
  );
}
