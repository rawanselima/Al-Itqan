"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  LuFileSpreadsheet,
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
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState<"whatsapp" | "table">("whatsapp");

  // Selection state
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "custom">("monthly");
  const [year, setYear] = useState(() => currentDate.getFullYear());
  const [month, setMonth] = useState(() => currentDate.getMonth() + 1);

  // Custom date range state (for weekly or custom range)
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => currentDate.toISOString().slice(0, 10));

  // WhatsApp text editing & copying
  const [editedText, setEditedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showWarningsDetails, setShowWarningsDetails] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 1. Fetch Circles using React Query
  const { data: circles = [] } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.getCircles(),
  });

  // Set default circle once loaded
  useEffect(() => {
    if (circles.length > 0 && !selectedCircleId) {
      setSelectedCircleId(circles[0]._id);
    }
  }, [circles, selectedCircleId]);

  // Compute from and to dates based on period type
  const { fromDate, toDate } = useMemo(() => {
    if (periodType === "custom") {
      return { fromDate: customFrom, toDate: customTo };
    }
    // Monthly range
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0));
    return {
      fromDate: firstDay.toISOString().slice(0, 10),
      toDate: lastDay.toISOString().slice(0, 10),
    };
  }, [periodType, year, month, customFrom, customTo]);

  // 2. Fetch WhatsApp Homework & Attendance Report using React Query
  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ["homeworkReport", selectedCircleId, fromDate, toDate],
    queryFn: () => api.getHomeworkReport(selectedCircleId, fromDate, toDate),
    enabled: Boolean(selectedCircleId),
  });

  // 3. Fetch Monthly Detailed Table Data for Printing
  const {
    data: tableReportData,
    isLoading: tableLoading,
  } = useQuery({
    queryKey: ["monthlyTableReport", selectedCircleId, year, month],
    queryFn: () => api.getMonthlyReport(selectedCircleId, year, month),
    enabled: Boolean(selectedCircleId && activeTab === "table"),
  });

  // Keep editedText synced when fresh data arrives
  useEffect(() => {
    if (reportData?.text) {
      setEditedText(reportData.text);
    }
  }, [reportData?.text]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("فشل نسخ النص إلى الحافظة");
    }
  };

  const handleResetText = () => {
    if (reportData?.text) {
      setEditedText(reportData.text);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedMonthName = MONTHS_AR.find((m) => m.val === month)?.name || "";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* 1. SCREEN VIEW (Hidden when printing) */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-main flex items-center gap-2.5">
              <LuFileSpreadsheet className="w-6 h-6 text-primary" />
              <span>تقارير الحلقات والمتابعة</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              توليد رسائل الواتساب الأسبوعية والشهرية تلقائياً، ومتابعة الحضور والغياب وأداء الواجبات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border bg-surface text-text-main text-xs sm:text-sm font-bold shadow-xs hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <LuSettings className="w-4 h-4 text-primary" />
              <span>الإعدادات والإجازات</span>
            </button>

            {activeTab === "table" && (
              <button
                onClick={handlePrint}
                disabled={!tableReportData || tableReportData.students.length === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shadow-md hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
              >
                <LuPrinter className="w-4 h-4" />
                <span>طباعة التقرير</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-surface-border gap-2">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "whatsapp"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <FaWhatsapp className="w-4 h-4 text-emerald-600" />
            <span>رسالة الواتساب الجاهزة</span>
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "table"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <LuPrinter className="w-4 h-4" />
            <span>جدول المتابعة الشهري للطباعة</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-surface-border shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Circle Select */}
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

            {/* Period Type Select (Only for WhatsApp tab) */}
            {activeTab === "whatsapp" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">نوع الفترة</label>
                <div className="flex bg-surface-hover/50 p-1 rounded-xl border border-surface-border">
                  <button
                    type="button"
                    onClick={() => setPeriodType("monthly")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      periodType === "monthly"
                        ? "bg-primary text-white shadow-xs"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    تقرير شهري
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType("custom")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      periodType === "custom"
                        ? "bg-primary text-white shadow-xs"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    أسبوعي / مخصص
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Date Controls */}
            {activeTab === "whatsapp" && periodType === "custom" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-main">من تاريخ</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-main">إلى تاريخ</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-primary"
                  />
                </div>
              </>
            ) : (
              <>
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
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm text-text-main bg-surface focus:outline-hidden focus:border-primary font-semibold"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: WHATSAPP REPORT VIEW */}
        {activeTab === "whatsapp" && (
          <div className="space-y-4">
            {/* Warnings Alert Box */}
            {reportData?.warnings && reportData.warnings.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
                    <LuTriangleAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      تنبيه: يوجد {reportData.warnings.length} أيام ماضية لم يتم تسجيل الحضور أو الواجب فيها
                      (ظهرت بالرمز ▫️).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWarningsDetails(!showWarningsDetails)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                  >
                    <span>{showWarningsDetails ? "إخفاء التفاصيل" : "عرض السجلات الناقصة"}</span>
                    {showWarningsDetails ? (
                      <LuChevronUp className="w-4 h-4" />
                    ) : (
                      <LuChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {showWarningsDetails && (
                  <div className="pt-2 border-t border-amber-200/60 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                    {reportData.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-amber-100/60"
                      >
                        <span className="font-semibold">{w.studentName}</span>
                        <div className="flex items-center gap-2 text-amber-800 font-mono">
                          <span>{w.date}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-amber-200">
                            {w.type === "homework" ? "واجب ناقص" : "جلسة حضور"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {reportError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {(reportError as any)?.message || "فشل تحميل التقرير"}
              </div>
            )}

            {/* Loading Skeleton */}
            {reportLoading ? (
              <div className="bg-surface rounded-3xl p-12 text-center text-text-muted border border-surface-border">
                <LuRefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm font-bold">جاري إعداد تقرير الواتساب...</p>
              </div>
            ) : (
              /* Editable Textarea & Controls */
              <div className="bg-surface rounded-2xl sm:rounded-3xl border border-surface-border p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-text-main flex items-center gap-2">
                      <FaWhatsapp className="w-4 h-4 text-emerald-600" />
                      <span>النص الجاهز للمشاركة عبر الواتساب</span>
                    </h3>
                    <p className="text-xs text-text-muted">
                      يمكنك التعديل مباشرة على النص قبل نسخه وإرساله لقروب الحلقة
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetText}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-border text-text-muted hover:text-text-main hover:bg-surface-hover text-xs font-bold transition-colors cursor-pointer"
                      title="استعادة النص الأصلي"
                    >
                      <LuRefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة ضبط</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <LuCheck className="w-4 h-4 text-emerald-200" />
                          <span>تم نسخ التقرير!</span>
                        </>
                      ) : (
                        <>
                          <LuCopy className="w-4 h-4" />
                          <span>نسخ التقرير للواتساب</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    rows={18}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    dir="rtl"
                    className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-hover/30 text-text-main text-sm font-sans focus:outline-hidden focus:border-primary leading-relaxed resize-y selection:bg-emerald-100 selection:text-emerald-900"
                    placeholder="سيظهر التقرير هنا..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRINTABLE TABLE VIEW */}
        {activeTab === "table" && (
          <div className="space-y-4">
            {tableLoading ? (
              <div className="bg-surface rounded-3xl p-12 text-center text-text-muted border border-surface-border">
                <LuRefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm font-bold">جاري إعداد الجدول الشهري...</p>
              </div>
            ) : !tableReportData || tableReportData.students.length === 0 ? (
              <div className="p-8 text-center bg-surface rounded-2xl border border-surface-border text-text-muted text-sm">
                لا توجد طالبات أو جلسات مسجلة لهذه الحلقة في شهر {selectedMonthName} {year}.
              </div>
            ) : (
              <div className="bg-surface rounded-2xl sm:rounded-3xl border border-surface-border shadow-xs overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-surface-border flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-text-main">
                      كشف المتابعة الشهري - حلقة {tableReportData.circle.name}
                    </h3>
                    <p className="text-xs text-text-muted">
                      شهر {selectedMonthName} {year}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-surface-hover/60 border-b border-surface-border text-text-muted text-[11px] sm:text-xs font-bold">
                        <th className="py-3 px-4">الطالبة</th>
                        {tableReportData.weeks.map((w: any) => (
                          <th key={w.weekNumber} className="py-3 px-3 text-center border-r border-surface-border">
                            {w.name}
                          </th>
                        ))}
                        <th className="py-3 px-4 text-center border-r border-surface-border">مجموع الحضور</th>
                        <th className="py-3 px-4 text-center border-r border-surface-border">مجموع الواجبات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {tableReportData.students.map((st: any) => (
                        <tr key={st.studentId} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-text-main">{st.name}</td>
                          {st.weeklyStats.map((ws: any) => (
                            <td key={ws.weekNumber} className="py-3 px-3 text-center border-r border-surface-border">
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                                  حضور: {ws.present}
                                </span>
                                <div>
                                  <span className="text-[11px] text-text-muted font-bold">
                                    واجب: {ws.homeworkDays}
                                  </span>
                                </div>
                              </div>
                            </td>
                          ))}
                          <td className="py-3 px-4 text-center font-bold text-emerald-700 border-r border-surface-border">
                            {st.totals.present} حصة
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-primary border-r border-surface-border">
                            {st.totals.homeworkDays} يوم
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY VIEW */}
      {tableReportData && (
        <div className="print-only hidden font-sans" dir="rtl">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-extrabold text-primary">نظام الإتقان لإدارة الحلقات القرآنية</h1>
            <h2 className="text-lg font-bold text-text-main">
              تقرير شهر {selectedMonthName} {year} - حلقة {tableReportData.circle.name}
            </h2>
          </div>

          <table className="w-full text-right border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-gray-400">
                <th className="p-2 border border-gray-300">م</th>
                <th className="p-2 border border-gray-300">اسم الطالبة</th>
                <th className="p-2 border border-gray-300 text-center">إجمالي الحضور</th>
                <th className="p-2 border border-gray-300 text-center">الغياب</th>
                <th className="p-2 border border-gray-300 text-center">الاعتذار</th>
                <th className="p-2 border border-gray-300 text-center">التسميع</th>
                <th className="p-2 border border-gray-300 text-center">أيام الواجب</th>
              </tr>
            </thead>
            <tbody>
              {tableReportData.students.map((st: any, i: number) => (
                <tr key={st.studentId} className="border-b border-gray-300">
                  <td className="p-2 border border-gray-300 text-center">{i + 1}</td>
                  <td className="p-2 border border-gray-300 font-bold">{st.name}</td>
                  <td className="p-2 border border-gray-300 text-center">{st.totals.present}</td>
                  <td className="p-2 border border-gray-300 text-center">{st.totals.absent}</td>
                  <td className="p-2 border border-gray-300 text-center">{st.totals.excused}</td>
                  <td className="p-2 border border-gray-300 text-center">{st.totals.recited}</td>
                  <td className="p-2 border border-gray-300 text-center">{st.totals.homeworkDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings & Holidays Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          refetchReport();
        }}
        circles={circles}
      />
    </div>
  );
}
