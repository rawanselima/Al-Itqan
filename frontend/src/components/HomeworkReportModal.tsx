"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api, Circle } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import {
  LuX,
  LuCopy,
  LuCheck,
  LuRefreshCw,
  LuCalendar,
  LuTriangleAlert,
  LuChevronDown,
  LuChevronUp,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";

const MONTHS_AR = [
  { val: 1, name: "يناير (1)" },
  { val: 2, name: "فبراير (2)" },
  { val: 3, name: "مارس (3)" },
  { val: 4, name: "أبريل (4)" },
  { val: 5, name: "مايو (5)" },
  { val: 6, name: "يونيو (6)" },
  { val: 7, name: "يوليو (7)" },
  { val: 8, name: "أغسطس (8)" },
  { val: 9, name: "سبتمبر (9)" },
  { val: 10, name: "أكتوبر (10)" },
  { val: 11, name: "نوفمبر (11)" },
  { val: 12, name: "ديسمبر (12)" },
];

interface HomeworkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  circle: Circle | undefined;
  currentSaturday?: Date;
  studentsList?: any[];
  recordsMap?: Map<string, boolean>;
}

export function HomeworkReportModal({
  isOpen,
  onClose,
  circle,
}: HomeworkReportModalProps) {
  const currentDate = new Date();
  const [reportType, setReportType] = useState<"monthly" | "custom">("monthly");
  const [year, setYear] = useState(() => currentDate.getFullYear());
  const [month, setMonth] = useState(() => currentDate.getMonth() + 1);

  // Custom date range (weekly)
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => currentDate.toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [warnings, setWarnings] = useState<Array<{ studentName: string; date: string; type: string }>>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute fromDate & toDate
  const { fromDate, toDate } = useMemo(() => {
    if (reportType === "custom") {
      return { fromDate: customFrom, toDate: customTo };
    }
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0));
    return {
      fromDate: firstDay.toISOString().slice(0, 10),
      toDate: lastDay.toISOString().slice(0, 10),
    };
  }, [reportType, year, month, customFrom, customTo]);

  // Fetch report data
  const fetchReport = async () => {
    if (!isOpen || !circle?._id) return;
    try {
      setLoading(true);
      const data = await api.getHomeworkReport(circle._id, fromDate, toDate);
      setReportText(data.text);
      setOriginalText(data.text);
      setWarnings(data.warnings || []);
    } catch (err: any) {
      console.error("فشل جلب تقرير الواجب:", err);
      alert(err.message || "فشل جلب تقرير الواجب");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, circle?._id, fromDate, toDate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("فشل نسخ التقرير إلى الحافظة");
    }
  };

  const handleReset = () => {
    setReportText(originalText);
  };

  if (!isOpen || !circle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-surface border border-surface-border rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <FaWhatsapp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-text-main">
                تقرير الواجب والحضور - حلقة {circle.name}
              </h3>
              <p className="text-xs text-text-muted">
                رسالة نصية منسقة للواتساب جاهزة للنسخ والمشاركة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-surface-border bg-surface flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-surface-hover/50 p-1 rounded-xl border border-surface-border text-xs font-bold">
            <button
              onClick={() => setReportType("monthly")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                reportType === "monthly" ? "bg-primary text-white shadow-xs" : "text-text-muted"
              }`}
            >
              تقرير شهري
            </button>
            <button
              onClick={() => setReportType("custom")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                reportType === "custom" ? "bg-primary text-white shadow-xs" : "text-text-muted"
              }`}
            >
              أسبوعي / مخصص
            </button>
          </div>

          {reportType === "monthly" ? (
            <div className="flex items-center gap-2">
              <div className="w-36">
                <CustomSelect
                  value={month}
                  onChange={(val) => setMonth(Number(val))}
                  options={MONTHS_AR.map((m) => ({ value: m.val, label: m.name }))}
                />
              </div>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="w-24 px-3 py-2 rounded-xl border border-surface-border text-xs font-bold bg-surface"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-border bg-surface font-semibold"
              />
              <span>إلى</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-border bg-surface font-semibold"
              />
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Warnings Alert */}
          {warnings.length > 0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <LuTriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    تنبيه: يوجد {warnings.length} أيام ماضية لم تسجّل (رمز ▫️).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWarnings(!showWarnings)}
                  className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                >
                  <span>{showWarnings ? "إخفاء" : "عرض السجلات"}</span>
                  {showWarnings ? <LuChevronUp className="w-3.5 h-3.5" /> : <LuChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showWarnings && (
                <div className="pt-2 border-t border-amber-200/60 max-h-36 overflow-y-auto space-y-1">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex justify-between py-0.5 px-2 bg-amber-100/50 rounded-md">
                      <span>{w.studentName}</span>
                      <span className="font-mono">{w.date} ({w.type === "homework" ? "واجب" : "حضور"})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text Area */}
          {loading ? (
            <div className="py-20 text-center text-text-muted">
              <LuRefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-sm font-bold">جاري إعداد التقرير...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={16}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                dir="rtl"
                className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-hover/30 text-text-main text-sm font-sans focus:outline-hidden focus:border-primary leading-relaxed resize-y selection:bg-emerald-100 selection:text-emerald-900"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-hover/20">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-border text-text-muted hover:text-text-main text-xs font-bold cursor-pointer"
          >
            <LuRefreshCw className="w-3.5 h-3.5" />
            <span>إعادة ضبط النص</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-surface-border text-text-muted hover:text-text-main text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer"
            >
              {copied ? (
                <>
                  <LuCheck className="w-4 h-4 text-emerald-200" />
                  <span>تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <LuCopy className="w-4 h-4" />
                  <span>نسخ التقرير</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
