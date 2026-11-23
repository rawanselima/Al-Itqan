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
  LuFileText,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";

const HOMEWORK_DAYS = [
  { key: "saturday", name: "السبت", offset: 0 },
  { key: "sunday", name: "الأحد", offset: 1 },
  { key: "monday", name: "الإثنين", offset: 2 },
  { key: "tuesday", name: "الثلاثاء", offset: 3 },
  { key: "wednesday", name: "الأربعاء", offset: 4 },
  { key: "thursday", name: "الخميس", offset: 5 },
];

function getSaturdayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
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

  const loadHomework = async () => {
    if (!selectedCircleId) return;
    try {
      setLoading(true);
      const res = await api.getHomework(selectedCircleId, startDate, endDate);
      setStudents(res.students || []);

      const map = new Map<string, boolean>();
      res.records.forEach((r) => {
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
    } catch (err) {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. SCREEN VIEW */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">متابعة الواجبات الأسبوعية</h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              متابعة إنجاز الورد والواجب اليومي (من السبت إلى الخميس - الجمعة عطلة)
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
              <span>تقرير الواجب (شهري وأسبوعي)</span>
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
        <div className="bg-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-surface-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Circle Selector */}
          <div className="w-full md:w-72 space-y-1">
            <label className="text-xs font-bold text-text-main">اختر الحلقة</label>
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

          {/* Week Navigation */}
          <div className="flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrevWeek}
              className="px-2.5 py-2 rounded-xl border border-surface-border hover:bg-beige text-text-main font-bold text-xs sm:text-sm cursor-pointer"
              title="الأسبوع السابق"
            >
              <span className="inline-flex items-center gap-1">
                <LuChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </span>
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-3 py-2 rounded-xl border border-primary-subtle bg-primary-light text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer"
            >
              الأسبوع الحالي
            </button>
            <button
              onClick={handleNextWeek}
              className="px-2.5 py-2 rounded-xl border border-surface-border hover:bg-beige text-text-main font-bold text-xs sm:text-sm cursor-pointer"
              title="الأسبوع التالي"
            >
              <span className="inline-flex items-center gap-1">
                <span>التالي</span>
                <LuChevronLeft className="w-4 h-4" />
              </span>
            </button>
          </div>

          {/* Week Date Display */}
          <div className="text-xs font-bold text-text-main bg-beige px-3.5 py-2.5 rounded-xl border border-surface-border text-center">
            من: <span className="text-primary font-bold">{startDate}</span> إلى:{" "}
            <span className="text-primary font-bold">{endDate}</span>
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
              <table className="w-full text-center text-xs sm:text-sm min-w-[620px]">
                <thead className="bg-beige/70 text-text-muted text-xs font-bold border-b border-surface-border">
                  <tr>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-right w-48 sm:w-56 sticky right-0 bg-beige/95 backdrop-blur-xs z-10 border-l border-surface-border">
                      اسم الطالبة
                    </th>
                    {weekDaysDates.map((day) => (
                      <th key={day.key} className="py-3 sm:py-4 px-2 sm:px-3">
                        <div>{day.name}</div>
                        <div className="text-[10px] text-text-muted font-normal">{day.displayDate}</div>
                      </th>
                    ))}
                    <th className="py-3 sm:py-4 px-3 sm:px-4 w-28 sm:w-32">الإنجاز الأسبوعي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border font-medium text-text-main">
                  {students.map((student) => {
                    let completedDaysCount = 0;
                    weekDaysDates.forEach((day) => {
                      if (recordsMap.get(`${student._id}_${day.dateStr}`)) {
                        completedDaysCount++;
                      }
                    });

                    const percentage = Math.round((completedDaysCount / 6) * 100);

                    return (
                      <tr key={student._id} className="hover:bg-beige/40 transition-colors">
                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-right font-bold text-text-main sticky right-0 bg-surface z-10 border-l border-surface-border shadow-xs">
                          {student.name}
                        </td>

                        {weekDaysDates.map((day) => {
                          const isDone = Boolean(recordsMap.get(`${student._id}_${day.dateStr}`));
                          return (
                            <td key={day.key} className="py-3 sm:py-4 px-2 sm:px-3">
                              <button
                                type="button"
                                onClick={() => handleToggle(student._id, day.dateStr)}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  isDone
                                    ? "bg-primary text-white shadow-xs scale-105"
                                    : "bg-beige text-text-muted hover:bg-primary-light border border-surface-border"
                                }`}
                                title={`${day.name}: ${isDone ? "تم الواجب" : "لم يُنجز بعد"}`}
                              >
                                {isDone ? "✓" : "-"}
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[11px] sm:text-xs text-primary">
                              {completedDaysCount} / 6
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

      {/* Homework WhatsApp Report Modal */}
      <HomeworkReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        circle={currentCircle}
        currentSaturday={currentSaturday}
        studentsList={students}
        recordsMap={recordsMap}
      />
    </div>
  );
}
