"use client";

import React, { useState, useEffect } from "react";
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
  const [year, setYear] = useState(() => currentDate.getFullYear());
  const [month, setMonth] = useState(() => currentDate.getMonth() + 1);

  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [warnings, setWarnings] = useState<Array<{ studentName: string; date: string; type: string }>>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch report data
  const fetchReport = async () => {
    if (!isOpen || !circle?._id) return;
    try {
      setLoading(true);
      const data = await api.getHomeworkReport(circle._id, year, month);
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
  }, [isOpen, circle?._id, year, month]);

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
        className="bg-surface border border-surface-border rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-hover/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <FaWhatsapp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-text-main">
                تقرير الواجب والحضور الشهري - حلقة {circle.name}
              </h3>
              <p className="text-xs text-text-muted">
                رسالة نصية شهرية منسقة للواتساب تشمل ما تم تسجيله حتى الأسبوع الحالي
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
        <div className="px-6 py-3 border-b border-surface-border bg-surface flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted">تقرير شهر:</span>
            <div className="w-40">
              <CustomSelect
                value={month}
                onChange={(val) => setMonth(Number(val))}
                options={MONTHS_AR.map((m) => ({ value: m.val, label: m.name }))}
                icon={<LuCalendar className="w-4 h-4 text-primary" />}
              />
            </div>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-24 px-3 py-2 rounded-xl border border-surface-border text-xs font-bold bg-surface text-text-main focus:outline-hidden focus:border-primary"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Text Area */}
          {loading ? (
            <div className="py-24 text-center text-text-muted my-auto">
              <LuRefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-sm font-bold">جاري إعداد التقرير الشهري...</p>
            </div>
          ) : (
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              dir="rtl"
              className="w-full h-80 sm:h-96 md:h-[420px] px-4 py-3 rounded-2xl border border-surface-border bg-surface-hover/30 text-text-main text-sm font-sans focus:outline-hidden focus:border-primary leading-relaxed resize-none selection:bg-emerald-100 selection:text-emerald-900 overflow-y-auto"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-hover/20 shrink-0">
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
                  <span>نسخ التقرير للواتساب</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
