"use client";

import { useEffect, useState } from "react";
import { api, Circle } from "@/lib/api";

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

export default function ReportsPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load circles on mount
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

  // Fetch report whenever circle, year, or month change
  useEffect(() => {
    if (!selectedCircleId) return;

    async function fetchReport() {
      try {
        setLoading(true);
        setError("");
        const data = await api.getMonthlyReport(selectedCircleId, year, month);
        setReportData(data);
      } catch (err: any) {
        setError(err.message || "حدث خطأ في جلب التقرير الشهري");
        setReportData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [selectedCircleId, year, month]);

  const handlePrint = () => {
    window.print();
  };

  const selectedMonthName = MONTHS_AR.find((m) => m.val === month)?.name || "";

  return (
    <div className="p-8 space-y-6">
      {/* 1. SCREEN VIEW (Hidden when printing) */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">التقارير الشهرية الشاملة</h2>
            <p className="text-sm text-slate-500 mt-1">
              تقرير شهري تفصيلي مقسم بالأسابيع لمتابعة الحضور، الغياب، التسميع، وأداء الواجبات
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={!reportData || reportData.students.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold shadow-md hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
          >
            <span>🖨️</span>
            <span>طباعة التقرير الشهري</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">الحلقة *</label>
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">الشهر *</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-600"
            >
              {MONTHS_AR.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.name} ({m.val})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">السنة *</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري إعداد التقرير الشهري...</div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        ) : !reportData || reportData.students.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
            <div className="text-4xl">📊</div>
            <h3 className="text-base font-bold text-slate-700">لا توجد بيانات متاحة لهذا الشهر</h3>
            <p className="text-xs text-slate-500">
              تأكد من تسجيل الحضور والواجبات خلال أسابيع شهر {selectedMonthName} {year}.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  تقرير شهر {selectedMonthName} {year} - {reportData.circle?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أيام الانعقاد: {reportData.circle?.days.join(" و ")} ({reportData.circle?.time})
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800">
                إجمالي الطالبات: {reportData.students.length} طالبة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4">اسم الطالبة</th>
                    {reportData.weeks.map((w: any) => (
                      <th key={w.weekNumber} className="py-4 px-3 text-center border-r border-slate-200">
                        <div>{w.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {w.startDate.slice(5)} إلى {w.endDate.slice(5)}
                        </div>
                      </th>
                    ))}
                    <th className="py-4 px-4 text-center border-r border-slate-200 bg-emerald-50 text-emerald-900">
                      إجمالي الشهر
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.students.map((st: any) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/70">
                      <td className="py-4 px-4 font-bold text-slate-800">{st.name}</td>

                      {st.weeklyStats.map((ws: any) => (
                        <td
                          key={ws.weekNumber}
                          className="py-3 px-3 border-r border-slate-100 text-center"
                        >
                          <div className="inline-flex flex-col gap-1 text-[11px]">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-emerald-700 font-bold">
                                حضـ: {ws.present}
                              </span>
                              {ws.recited > 0 && (
                                <span className="text-teal-700 font-semibold" title="سمّعت">
                                  (سمّعت: {ws.recited})
                                </span>
                              )}
                              {ws.absent > 0 && (
                                <span className="text-rose-600">غياب: {ws.absent}</span>
                              )}
                              {ws.excused > 0 && (
                                <span className="text-amber-600">اعتذار: {ws.excused}</span>
                              )}
                            </div>
                            <div className="text-slate-500 bg-slate-50 rounded-md py-0.5 px-1 border border-slate-100">
                              واجب: <span className="font-bold text-slate-700">{ws.homeworkDays}</span> أيام
                            </div>
                          </div>
                        </td>
                      ))}

                      {/* Monthly Totals */}
                      <td className="py-3 px-4 border-r border-slate-200 bg-emerald-50/40 text-center">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-bold text-emerald-800">
                            حضور: {st.totals.present} | تسميع: {st.totals.recited}
                          </span>
                          <span className="text-[11px] text-slate-600">
                            غياب: {st.totals.absent} | اعتذار: {st.totals.excused}
                          </span>
                          <span className="font-bold text-[11px] text-teal-800">
                            إجمالي أيام الواجب: {st.totals.homeworkDays} يوم
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY REPORT (A4 Ready) */}
      {reportData && (
        <div className="print-only p-4 font-sans text-black" dir="rtl">
          <div className="text-center pb-6 border-b-2 border-black mb-6 space-y-2">
            <h1 className="text-2xl font-black">التقرير الشهري لمتابعة الحضور والواجبات</h1>
            <div className="flex justify-between items-center text-sm font-bold pt-2">
              <span>الحلقة: {reportData.circle?.name}</span>
              <span>
                عن شهر: {selectedMonthName} {year}
              </span>
              <span>مواعيد الحلقة: {reportData.circle?.days.join(" و ")}</span>
            </div>
          </div>

          <table className="w-full text-right border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-200 border-b border-black font-bold">
                <th className="border border-black p-2 w-36">اسم الطالبة</th>
                {reportData.weeks.map((w: any) => (
                  <th key={w.weekNumber} className="border border-black p-2 text-center">
                    <div>{w.name}</div>
                    <div className="text-[9px] font-normal">
                      {w.startDate.slice(5)} ~ {w.endDate.slice(5)}
                    </div>
                  </th>
                ))}
                <th className="border border-black p-2 text-center w-36 bg-slate-300">
                  إجمالي الشهر
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.students.map((st: any) => (
                <tr key={st.studentId} className="border-b border-black">
                  <td className="border border-black p-2 font-bold">{st.name}</td>

                  {st.weeklyStats.map((ws: any) => (
                    <td key={ws.weekNumber} className="border border-black p-2 text-center">
                      <div className="space-y-0.5">
                        <div>
                          حضور: {ws.present} | غياب: {ws.absent}
                        </div>
                        <div>
                          تسميع: {ws.recited} | واجب: {ws.homeworkDays} أيام
                        </div>
                      </div>
                    </td>
                  ))}

                  <td className="border border-black p-2 text-center font-bold bg-slate-100">
                    <div>حضور: {st.totals.present} ({st.totals.recited} تسميع)</div>
                    <div>غياب: {st.totals.absent}</div>
                    <div>الواجبات: {st.totals.homeworkDays} يوم</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 flex justify-between items-center text-sm font-bold pt-8 border-t border-black">
            <div>توقيع المشرف / المعلمة: .......................................</div>
            <div>نظام الإتقان لإدارة الحلقات</div>
          </div>
        </div>
      )}
    </div>
  );
}
