"use client";

import React, { useState, useEffect } from "react";
import { api, Circle } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import { Dialog, Button, LoadingState } from "@/components/ui";
import { showToast } from "@/lib/toast";
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
      showToast.error(err.message || "فشل جلب تقرير الواجب");
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
      showToast.success("تم نسخ التقرير للواتساب ✓");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast.error("فشل نسخ التقرير إلى الحافظة");
    }
  };

  const handleReset = () => {
    setReportText(originalText);
  };

  if (!circle) return null;

  const circleDisplayName = circle.teacherName?.trim() || circle.name;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`تقرير الواجب والحضور الشهري - ${circleDisplayName}`}
      size="xl"
      showCloseButton={true}
      className="h-[88vh]"
      bodyClassName="p-0 flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      <div className="flex flex-col flex-1 min-h-0 h-full">
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
              className="w-24 px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-sm font-bold text-text-main focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary/20"
              min={2020}
              max={2030}
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Text Area */}
          {loading ? (
            <LoadingState text="جاري إعداد التقرير الشهري..." className="my-auto flex-1 py-24" />
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                dir="rtl"
                className="w-full h-full min-h-[300px] px-5 py-4 rounded-2xl border border-surface-border bg-surface-hover/30 text-text-main text-sm font-sans focus:outline-hidden focus:border-primary leading-relaxed resize-none selection:bg-emerald-100 selection:text-emerald-900 overflow-y-auto flex-1"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-hover/20 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            iconLeft={<LuRefreshCw className="w-3.5 h-3.5" />}
          >
            إعادة ضبط النص
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              إغلاق
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleCopy}
              iconLeft={copied ? <LuCheck className="w-4 h-4 text-emerald-200" /> : <LuCopy className="w-4 h-4" />}
            >
              {copied ? "تم النسخ بنجاح!" : "نسخ التقرير للواتساب"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}