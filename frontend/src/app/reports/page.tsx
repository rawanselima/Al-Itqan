"use client";

import { useEffect, useState } from "react";
import { api, Circle, formatCircleDays } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import { SettingsModal } from "@/components/SettingsModal";
import {
  LuPrinter,
  LuBookOpen,
  LuCalendar,
  LuCopy,
  LuCheck,
  LuRefreshCw,
  LuTriangleAlert,
  LuChevronDown,
  LuChevronUp,
  LuSettings,
  LuMessageSquare,
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

export default function ReportsPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  // Data state
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // WhatsApp text state
  const [whatsappText, setWhatsappText] = useState("");
  const [originalWhatsappText, setOriginalWhatsappText] = useState("");
  const [warnings, setWarnings] = useState<any[]>([]);
  const [showWhatsappCard, setShowWhatsappCard] = useState(true);
  const [showWarningsDetails, setShowWarningsDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load circles on mount
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
        console.error("فشل جلب الحلقات:", err);
      }
    }
    loadCircles();
  }, []);

  // Fetch report whenever circle, year, or month change
  const fetchReport = async () => {
    if (!selectedCircleId) return;
    try {
      setLoading(true);
      setError("");

      // 1. Fetch table data
      const data = await api.getMonthlyReport(selectedCircleId, year, month);
      setReportData(data);

      // 2. Fetch WhatsApp formatted report
      try {
        const hwReport = await api.getHomeworkReport(selectedCircleId, year, month);
        setWhatsappText(hwReport.text);
        setOriginalWhatsappText(hwReport.text);
        setWarnings(hwReport.warnings || []);
      } catch (e) {
        console.error("فشل جلب نص الواتساب:", e);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ في جلب التقرير الشهري");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedCircleId, year, month]);

  const handleCopyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("فشل نسخ النص إلى الحافظة");
    }
  };

  const handleResetWhatsapp = () => {
    setWhatsappText(originalWhatsappText);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedMonthName = MONTHS_AR.find((m) => m.val === month)?.name || "";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* 1. SCREEN VIEW */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">التقارير الشهرية الشاملة</h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              تقرير شهري تفصيلي مقسم بالأسابيع التقويمية لمتابعة الحضور، الغياب، التسميع، وأداء الواجبات، ورسالة الواتساب
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border bg-surface text-text-main text-xs sm:text-sm font-bold shadow-xs hover:bg-beige transition-colors cursor-pointer"
            >
              <LuSettings className="w-4 h-4 text-primary" />
              <span>الإعدادات والإجازات</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={!reportData || reportData.students.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shadow-md hover:bg-primary-hover disabled:opacity-50 cursor-pointer transition-all"
            >
              <LuPrinter className="w-4 h-4" />
              <span>طباعة التقرير الشهري</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-surface-border shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-main">الشهر *</label>
            <CustomSelect
              value={month}
              onChange={(val) => setMonth(Number(val))}
              options={MONTHS_AR.map((m) => ({
                value: m.val,
                label: `${m.name} (${m.val})`,
              }))}
              icon={<LuCalendar className="w-4 h-4 text-primary" />}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-main">السنة *</label>
            <input
              suppressHydrationWarning
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm text-text-main bg-surface focus:outline-hidden focus:border-primary font-bold"
            />
          </div>
        </div>

        {/* WhatsApp Message Generator Box (Always visible at top of report) */}
        {whatsappText && (
          <div className="bg-surface rounded-2xl sm:rounded-3xl border border-surface-border shadow-xs p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                  <FaWhatsapp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-text-main">
                    تقرير رسالة الواتساب الجاهز للإرسال
                  </h3>
                  <p className="text-xs text-text-muted">
                    رسالة نصية منسقة بدقة وفق التقويم والرموز، يمكنك تعديلها مباشرة ونسخها لقروب الحلقة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsappCard(!showWhatsappCard)}
                  className="px-3 py-1.5 rounded-xl border border-surface-border text-text-muted hover:text-text-main text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showWhatsappCard ? "طي الرسالة" : "إظهار الرسالة"}</span>
                  {showWhatsappCard ? <LuChevronUp className="w-4 h-4" /> : <LuChevronDown className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleResetWhatsapp}
                  className="px-3 py-1.5 rounded-xl border border-surface-border text-text-muted hover:text-text-main text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="استعادة النص المولد أصلياً"
                >
                  <LuRefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsapp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <LuCheck className="w-4 h-4 text-emerald-200" />
                      <span>تم نسخ التقرير!</span>
                    </>
                  ) : (
                    <>
                      <LuCopy className="w-4 h-4" />
                      <span>نسخ الرسالة</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Textarea */}
            {showWhatsappCard && (
              <textarea
                rows={12}
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                dir="rtl"
                className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-hover/30 text-text-main text-sm font-sans focus:outline-hidden focus:border-primary leading-relaxed resize-y selection:bg-emerald-100 selection:text-emerald-900"
              />
            )}
          </div>
        )}

        {/* Report Content Table */}
        {loading ? (
          <div className="p-12 text-center text-text-muted">جاري إعداد التقرير الشهري...</div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        ) : !reportData || reportData.students.length === 0 ? (
          <div className="p-12 text-center bg-surface rounded-2xl sm:rounded-3xl border border-dashed border-surface-border space-y-2">
            <h3 className="text-base font-bold text-text-main">لا توجد بيانات لهذا الشهر</h3>
            <p className="text-xs text-text-muted">
              لم يتم العثور على طالبات أو جلسات مسجلة في شهر {selectedMonthName} {year}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Cards Summary */}
            <div className="bg-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-surface-border shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-text-main">
                    كشف المتابعة الشهري - حلقة {reportData.circle.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    شهر {selectedMonthName} {year} • عدد الأسابيع التقويمية: {reportData.weeks.length} أسابيع
                  </p>
                </div>
              </div>

              {/* Responsive Detailed Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-beige/70 text-text-muted text-[11px] sm:text-xs font-bold border-b border-surface-border">
                      <th className="py-3 sm:py-4 px-4 w-44 sticky right-0 bg-beige/90 z-10">الطالبة</th>
                      {reportData.weeks.map((w: any) => (
                        <th key={w.weekNumber} className="py-3 sm:py-4 px-3 text-center border-r border-surface-border">
                          <div>{w.name}</div>
                          <div className="text-[10px] text-text-muted font-normal mt-0.5 font-mono">
                            {w.days?.length ? `${w.days.length} أيام` : `${w.startDate.slice(5)} ~ ${w.endDate.slice(5)}`}
                          </div>
                        </th>
                      ))}
                      <th className="py-3 sm:py-4 px-4 text-center border-r border-surface-border w-28">
                        مجموع الحضور
                      </th>
                      <th className="py-3 sm:py-4 px-4 text-center border-r border-surface-border w-28">
                        مجموع الواجبات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {reportData.students.map((st: any) => (
                      <tr key={st.studentId} className="hover:bg-beige/40 transition-colors">
                        <td className="py-3 sm:py-4 px-4 font-bold text-text-main sticky right-0 bg-surface z-10 border-l border-surface-border shadow-xs">
                          {st.name}
                        </td>

                        {st.weeklyStats.map((ws: any) => {
                          const badgeObj = st.weeklyDetails?.find((wd: any) => wd.weekNumber === ws.weekNumber);
                          const badge = badgeObj?.badge;

                          return (
                            <td key={ws.weekNumber} className="py-3 sm:py-4 px-3 text-center border-r border-surface-border">
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                                    حضور: {ws.present}
                                  </span>
                                  {badge === "medal" && <span title="أتمت المهام والحضور">🏅</span>}
                                  {badge === "trophy" && <span title="أتمت عمل المهام">🏆</span>}
                                </div>
                                <div>
                                  <span className="text-[11px] text-text-muted font-bold font-mono">
                                    واجب: {ws.homeworkDays}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-3 sm:py-4 px-4 text-center font-bold text-emerald-700 border-r border-surface-border font-mono">
                          {st.totals.present} حصة
                        </td>
                        <td className="py-3 sm:py-4 px-4 text-center font-bold text-primary border-r border-surface-border font-mono">
                          {st.totals.homeworkDays} يوم
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY SHEET */}
      {reportData && (
        <div className="print-only hidden font-sans" dir="rtl">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-extrabold text-primary">نظام الإتقان لإدارة الحلقات القرآنية</h1>
            <h2 className="text-lg font-bold text-text-main">
              كشف المتابعة الشهري - شهر {selectedMonthName} {year}
            </h2>
            <div className="text-xs text-gray-600">الحلقة: {reportData.circle?.name}</div>
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
                        <div>حضور: {ws.present} | غياب: {ws.absent}</div>
                        <div>واجب: {ws.homeworkDays} أيام</div>
                      </div>
                    </td>
                  ))}

                  <td className="border border-black p-2 text-center font-bold bg-slate-100">
                    <div>حضور: {st.totals.present} حصة</div>
                    <div>واجبات: {st.totals.homeworkDays} يوم</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings & Holidays Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          fetchReport();
        }}
        circles={circles}
      />
    </div>
  );
}
