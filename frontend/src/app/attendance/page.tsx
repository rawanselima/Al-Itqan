"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { api, Circle, formatCircleDays } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import {
  LuBookOpen,
  LuUsers,
  LuCalendar,
  LuFileText,
  LuCheck,
  LuCopy,
  LuLayoutGrid,
  LuPrinter,
  LuTriangleAlert,
  LuX,
  LuRefreshCw,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";

// Palette constants matching the Framer design
const G = "#184E3D";
const muted = "#7C857D";
const line = "#E6E9E2";
const cream = "#F6F5F0";

const DAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  phone: string;
  status: "present" | "absent" | "excused" | "unrecorded";
  hasRecited: boolean;
  order: number | null;
  notes?: string;
  homeworkCompleted?: boolean;
  departureTime?: string | null;
}

// Icons using react-icons
function Icon({ kind = "grid", size = 18 }: { kind?: string; size?: number }) {
  const props = { size, className: "shrink-0" };
  switch (kind) {
    case "book":
      return <LuBookOpen {...props} />;
    case "users":
      return <LuUsers {...props} />;
    case "calendar":
      return <LuCalendar {...props} />;
    case "report":
      return <LuFileText {...props} />;
    case "check":
      return <LuCheck {...props} />;
    case "copy":
      return <LuCopy {...props} />;
    default:
      return <LuLayoutGrid {...props} />;
  }
}

export default function AttendancePage() {
  const [mounted, setMounted] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isLoadedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>("");

  // Filters & Report Modal
  const [filter, setFilter] = useState<"الكل" | "حاضرة" | "غائبة" | "معتذرة">("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [supervisorName, setSupervisorName] = useState("أمل طاهر");
  const [editedReportText, setEditedReportText] = useState("");

  // Load circles and settings on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [data, settingsData] = await Promise.all([
          api.getCircles(),
          api.getSettings().catch(() => null),
        ]);
        setCircles(data);
        if (settingsData?.supervisorName) {
          setSupervisorName(settingsData.supervisorName);
        }
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
        setErrorMessage("فشل في تحميل الحلقات");
      }
    }
    loadInitialData();
  }, []);

  // Load attendance session when circle or date changes
  useEffect(() => {
    if (!selectedCircleId || !date) return;

    async function loadAttendance() {
      try {
        setLoading(true);
        isLoadedRef.current = false;
        setErrorMessage("");
        const res = await api.getAttendance(selectedCircleId, date);
        const loadedRecords = res.records || [];
        const loadedHoliday = Boolean(res.isHoliday);
        setRecords(loadedRecords);
        setIsHoliday(loadedHoliday);
        setHolidayReason((res as any).holidayReason || "");
        lastSavedSnapshotRef.current = JSON.stringify({
          records: loadedRecords,
          isHoliday: loadedHoliday,
        });
        isLoadedRef.current = true;
      } catch (err: any) {
        setErrorMessage(err.message || "حدث خطأ أثناء تحميل سجل الحضور");
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [selectedCircleId, date]);

  // Auto-Save Effect: Automatically persists any change to records or holiday
  useEffect(() => {
    if (!isLoadedRef.current || !selectedCircleId || !date) return;

    const currentSnapshot = JSON.stringify({ records, isHoliday });
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    const timer = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        await api.saveAttendance(selectedCircleId, date, records, isHoliday);
        lastSavedSnapshotRef.current = currentSnapshot;
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      } catch (err: any) {
        setSaveStatus("error");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [records, isHoliday, selectedCircleId, date]);

  const currentCircle = circles.find((c) => c._id === selectedCircleId);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const heard = records.filter((r) => r.status === "present" && r.hasRecited).length;
    const waiting = Math.max(0, present - heard);
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    return { total, present, heard, waiting, absent, excused };
  }, [records]);

  // Handle status change with automatic shift (ترحيل الأدوار تلقائياً عند تغيير الحالة)
  const handleStatusChange = (
    studentId: string,
    newStatusArabic: "لم يُسجّل" | "حاضرة" | "غائبة" | "معتذرة"
  ) => {
    if (isHoliday) return;

    const statusMap: Record<string, "present" | "absent" | "excused" | "unrecorded"> = {
      "حاضرة": "present",
      "غائبة": "absent",
      "معتذرة": "excused",
      "لم يُسجّل": "unrecorded",
    };
    const newStatus = statusMap[newStatusArabic] || "unrecorded";

    setRecords((prev) => {
      const target = prev.find((r) => r.studentId === studentId);
      if (!target) return prev;

      const wasPresent = target.status === "present";
      const oldOrder = target.order;

      // 1. إذا تحولت الطالبة إلى "حاضرة"
      if (newStatus === "present") {
        if (wasPresent && target.order !== null) return prev; // حاضرة ولديها دور بالفعل

        const currentOrders = prev
          .filter((r) => r.status === "present" && r.order !== null && r.studentId !== studentId)
          .map((r) => r.order as number);
        const nextOrder = currentOrders.length > 0 ? Math.max(...currentOrders) + 1 : 1;

        return prev.map((r) =>
          r.studentId === studentId
            ? { ...r, status: "present", order: nextOrder }
            : r
        );
      }

      // 2. إذا تحولت الطالبة إلى (غائبة، معتذرة، أو لم يُسجّل)
      // تصفير دورها وترحيل أدوار باقي الحاضرات تلقائياً لسد الفراغ
      return prev.map((r) => {
        if (r.studentId === studentId) {
          return {
            ...r,
            status: newStatus,
            hasRecited: false,
            homeworkCompleted: false,
            order: null,
            departureTime: null,
          };
        }

        // ترحيل (Shift Down -1) لكل طالبة حاضرة كان دورها بعد دور هذه الطالبة
        if (
          wasPresent &&
          oldOrder !== null &&
          r.status === "present" &&
          r.order !== null &&
          r.order > oldOrder
        ) {
          return {
            ...r,
            order: r.order - 1,
          };
        }

        return r;
      });
    });
  };

  // تعديل رقم الدور يدوياً وترحيل باقي الأدوار تلقائياً
  const handleReorderStudent = (studentId: string, targetOrder: number) => {
    if (isHoliday || targetOrder < 1) return;

    setRecords((prev) => {
      const student = prev.find((r) => r.studentId === studentId);
      if (!student) return prev;

      const currentOrder = student.order;
      const otherPresent = prev.filter(
        (r) => r.status === "present" && r.studentId !== studentId && r.order !== null
      );

      // الحد الأقصى لرقم الدور هو عدد الطالبات الحاضرات
      const maxPossibleOrder = otherPresent.length + 1;
      const finalTargetOrder = Math.min(Math.max(1, targetOrder), maxPossibleOrder);

      if (currentOrder === finalTargetOrder) return prev;

      return prev.map((r) => {
        if (r.studentId === studentId) {
          return {
            ...r,
            status: "present",
            order: finalTargetOrder,
          };
        }

        if (r.status !== "present" || r.order === null) {
          return r;
        }

        const ord = r.order;

        if (currentOrder === null) {
          // تسكين طالبة لم يكن لها رقم دور من قبل
          if (ord >= finalTargetOrder) {
            return { ...r, order: ord + 1 };
          }
          return r;
        }

        // نقل إلى رقم دور أصغر (مثال من 4 إلى 1) -> ترحيل الأدوار الوسطى للأعلى (+1)
        if (finalTargetOrder < currentOrder) {
          if (ord >= finalTargetOrder && ord < currentOrder) {
            return { ...r, order: ord + 1 };
          }
        }

        // نقل إلى رقم دور أكبر (مثال من 1 إلى 4) -> ترحيل الأدوار الوسطى للأسفل (-1)
        if (finalTargetOrder > currentOrder) {
          if (ord > currentOrder && ord <= finalTargetOrder) {
            return { ...r, order: ord - 1 };
          }
        }

        return r;
      });
    });
  };

  // Toggle Recitation
  const handleToggleRecited = (studentId: string) => {
    if (isHoliday) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId && r.status === "present"
          ? { ...r, hasRecited: !r.hasRecited }
          : r
      )
    );
  };

  // Toggle Homework
  const handleToggleHomework = (studentId: string) => {
    if (isHoliday) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId && r.status === "present"
          ? { ...r, homeworkCompleted: !r.homeworkCompleted }
          : r
      )
    );
  };

  // Toggle Departure Time
  const handleToggleDeparture = (studentId: string) => {
    if (isHoliday) return;
    const nowStr = new Date().toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setRecords((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId || r.status !== "present") return r;
        return {
          ...r,
          departureTime: r.departureTime ? null : nowStr,
        };
      })
    );
  };

  // Toggle Holiday
  const handleToggleHoliday = () => {
    setIsHoliday((prev) => !prev);
  };

  // Schedule view filter: "all" circles vs specific circleId
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const initialDateAdjustedRef = useRef(false);

  // Helper to match circle days (supports numbers 0-6 and Arabic day strings)
  const isDayMatch = (circleDay: number | string, dayIndex: number, targetDayName: string) => {
    if (typeof circleDay === "number") {
      return circleDay === dayIndex;
    }
    const num = Number(circleDay);
    if (!isNaN(num) && num >= 0 && num <= 6) {
      return num === dayIndex;
    }
    const c = String(circleDay)
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .toLowerCase();
    const t = targetDayName
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .toLowerCase();
    return c.includes(t) || t.includes(c);
  };

  // Sessions of the current week across all circles (Sunday to Saturday)
  // ONLY includes real scheduled days defined in circle.days
  const weekSessions = useMemo(() => {
    const selectedD = new Date(date + "T12:00:00");
    const dayOfWeek = selectedD.getDay(); // 0 is Sunday
    // Start of week (Sunday)
    const sunday = new Date(selectedD);
    sunday.setDate(sunday.getDate() - dayOfWeek);

    interface WeekSession {
      key: string;
      circleId: string;
      circleName: string;
      time: string;
      dayName: string;
      dateStr: string;
      displayDate: string;
      isSelected: boolean;
      dayIndex: number;
    }

    const allSessions: WeekSession[] = [];

    // Loop through the 7 days of the week (Sunday to Saturday)
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayName = DAYS_AR[i];
      const displayDate = new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "long",
      }).format(d);

      // Circles meeting on this day strictly based on their configured days
      const dayCircles = circles.filter((c) =>
        c.days && c.days.some((cd) => isDayMatch(cd, i, dayName))
      );

      dayCircles.forEach((c) => {
        allSessions.push({
          key: `${c._id}-${iso}`,
          circleId: c._id,
          circleName: c.name,
          time: c.time || "٤:٠٠ م",
          dayName,
          dateStr: iso,
          displayDate,
          isSelected: c._id === selectedCircleId && iso === date,
          dayIndex: i,
        });
      });
    }

    // Sort chronologically by dateStr, then circleName
    allSessions.sort((a, b) => {
      const dateCmp = a.dateStr.localeCompare(b.dateStr);
      if (dateCmp !== 0) return dateCmp;
      return a.circleName.localeCompare(b.circleName, "ar");
    });

    return allSessions;
  }, [date, circles, selectedCircleId]);

  // Auto-align date to the first valid session on load if today has no session
  useEffect(() => {
    if (initialDateAdjustedRef.current || weekSessions.length === 0) return;

    // Check if current date is already a session for selectedCircleId
    const isCurrentDateSession = weekSessions.some(
      (s) => s.circleId === selectedCircleId && s.dateStr === date
    );

    if (!isCurrentDateSession) {
      const todayIso = new Date().toISOString().split("T")[0];
      // Look for upcoming sessions today or later for selectedCircleId
      const upcomingCircleSessions = weekSessions.filter(
        (s) => s.circleId === selectedCircleId && s.dateStr >= todayIso
      );
      // Or any session for selectedCircleId
      const circleSessions = weekSessions.filter((s) => s.circleId === selectedCircleId);
      // Or any upcoming session
      const allUpcoming = weekSessions.filter((s) => s.dateStr >= todayIso);

      const target =
        upcomingCircleSessions[0] ||
        circleSessions[0] ||
        allUpcoming[0] ||
        weekSessions[0];

      if (target) {
        setDate(target.dateStr);
        setSelectedCircleId(target.circleId);
      }
    }

    initialDateAdjustedRef.current = true;
  }, [weekSessions, selectedCircleId, date]);

  // Filtered sessions based on scheduleFilter ("all" vs specific circleId)
  const displayedWeekSessions = useMemo(() => {
    if (scheduleFilter === "all") {
      return weekSessions;
    }
    return weekSessions.filter((s) => s.circleId === scheduleFilter);
  }, [weekSessions, scheduleFilter]);

  // Sort: Present students with order first, then unrecorded / absent / excused
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.studentName.localeCompare(b.studentName, "ar");
    });
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return sortedRecords.filter((r) => {
      // Filter by status tab
      if (filter === "حاضرة" && r.status !== "present") return false;
      if (filter === "غائبة" && r.status !== "absent") return false;
      if (filter === "معتذرة" && r.status !== "excused") return false;

      // Filter by search query
      if (
        searchQuery.trim() &&
        !r.studentName.includes(searchQuery.trim()) &&
        !r.phone?.includes(searchQuery.trim())
      ) {
        return false;
      }
      return true;
    });
  }, [sortedRecords, filter, searchQuery]);

  const formattedDateArabic = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(date + "T12:00:00"));
    } catch {
      return date;
    }
  }, [date]);

  const shortDateArabic = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "long",
      }).format(new Date(date + "T12:00:00"));
    } catch {
      return date;
    }
  }, [date]);

  // Generate copyable text report (قائمة الحضور والغياب وحجز الأدوار للواتساب)
  const generatedReportText = useMemo(() => {
    const circleName = currentCircle?.name || "حلقة حفظ ربع البقره";
    const teacherName = currentCircle?.teacherName || (currentCircle as any)?.notes || "سماح ابو الخير";
    const supervisor = supervisorName || "أمل طاهر";

    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dayName = DAYS_AR[dt.getUTCDay()] || "";
    const formattedDateHeader = `*${dayName} ${d}/ ${m}/ ${y}*`;

    // 1. الحاضرات وحجز الأدوار
    // يتم الترتيب وفق رقم الدور المسجل (order) التزاماً بالدور
    const presentRecords = records
      .filter((r) => r.status === "present")
      .sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.studentName.localeCompare(b.studentName, "ar");
      });

    const presentByOrder = new Map<number, (typeof records)[0]>();
    presentRecords.forEach((r, idx) => {
      const ord = r.order ?? idx + 1;
      presentByOrder.set(ord, r);
    });

    const totalSlots = Math.max(records.length, 12);
    const presentLines: string[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      const student = presentByOrder.get(i);
      if (student) {
        const recitedMark = student.hasRecited ? " ✅" : "";
        presentLines.push(`🌷${i}-${student.studentName}${recitedMark}`);
      } else {
        presentLines.push(`🌷${i}- `);
      }
    }

    // 2. المعتذرات
    const excusedRecords = records
      .filter((r) => r.status === "excused")
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));
    const excusedLines: string[] = [];
    if (excusedRecords.length > 0) {
      excusedRecords.forEach((r, idx) => {
        excusedLines.push(`🌷${idx + 1}- ${r.studentName}`);
      });
    } else {
      excusedLines.push("لا يوجد معتذرات");
    }

    // 3. الغياب
    const absentRecords = records
      .filter((r) => r.status === "absent")
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));
    const absentLines: string[] = [];
    if (absentRecords.length > 0) {
      absentRecords.forEach((r, idx) => {
        absentLines.push(`🌷${idx + 1}- ${r.studentName}`);
      });
    } else {
      absentLines.push("لا يوجد غياب");
    }

    const cleanCircleName = circleName.startsWith("حلقة") ? circleName : `حلقة ${circleName}`;

    return `قائمه الحضور والغياب وحجز الأدوار
🌸🌷 ~ـــــــــ📚❁📚ــــــــــ~🌷🌸
        *بسـمـ الله الرحمـن الرحيـمـ*
                  *معهد الاتقان* 
      *تحت إشراف الشيخة الفاضلة*
             ♥️ *عواطف أم عمر*♥️
*المجازة بالقراءات العشر الصغري والكبري* 
                    *قسم الحفظ*
           

*نبدأ بعون اللّـه ${cleanCircleName}.*

*للمعلمـــة :..👑* *${teacherName}* 
 *المشرفه ** *${supervisor}**

${formattedDateHeader}

     *لآلــــ💎ـــــئ حلقتنا المتــــ💎ـــميزات*

${presentLines.join("\n")}



🌸🌷 ~ـــــــــ📚❁📚ــــــــــ~🌷🌸
✍🏻 *المعتذرات*:
${excusedLines.join("\n")}


🌸🌷 ~ـــــــــ📚❁📚ــــــــــ~🌷🌸
*الغياب* 😥 
${absentLines.join("\n")}



✨ 💞 ✨ 💞 ✨ 💞 ✨ 💞 ✨ 💞 ✨
🔗 رابط الزوم
🌸🌷`;
  }, [currentCircle, supervisorName, date, records]);

  // Sync edited report text
  useEffect(() => {
    setEditedReportText(generatedReportText);
  }, [generatedReportText, isReportOpen]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(editedReportText || generatedReportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      alert("يرجى تحديد النص ونسخه يدوياً.");
    }
  };

  const handleResetReportText = () => {
    setEditedReportText(generatedReportText);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) {
    return (
      <div
        dir="rtl"
        className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-h-screen"
        style={{
          backgroundColor: cream,
          color: "#263C32",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="w-36 h-3 bg-slate-200/60 rounded-md animate-pulse" />
            <div className="w-48 h-8 bg-slate-300/70 rounded-xl animate-pulse" />
            <div className="w-56 h-3.5 bg-slate-200/60 rounded-md animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="w-28 h-10 bg-slate-200/70 rounded-xl animate-pulse" />
            <div className="w-28 h-10 bg-[#184E3D]/30 rounded-xl animate-pulse" />
          </div>
        </div>

        <div className="h-16 bg-[#EAF0E6] border border-[#DDE6D7] rounded-2xl animate-pulse" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#E6E9E2] rounded-2xl animate-pulse" />
          ))}
        </div>

        <div className="h-32 bg-white border border-[#E6E9E2] rounded-2xl animate-pulse" />

        <div className="h-96 bg-white border border-[#E6E9E2] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full"
      style={{
        backgroundColor: cream,
        color: "#263C32",
        minHeight: "100vh",
      }}
    >
      {/* 1. SCREEN VIEW */}
      <div className="no-print space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs text-[#7C857D] font-medium mb-1">
              بسم الله، نبدأ يوماً مباركاً
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#184E3D] m-0">
              متابعة الحلقة
            </h1>
            <div className="text-xs sm:text-sm text-[#7C857D] mt-1 font-medium">
              خطوات بسيطة، ومتابعة تصنع أثراً.
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Quick Circle Switcher */}
            {circles.length > 1 && (
              <div className="w-48 sm:w-56">
                <CustomSelect
                  value={selectedCircleId}
                  onChange={(val) => setSelectedCircleId(val as string)}
                  options={circles.map((c) => ({
                    value: c._id,
                    label: c.name,
                    icon: <LuBookOpen className="w-3.5 h-3.5 text-[#184E3D]" />,
                  }))}
                  icon={<LuBookOpen className="w-4 h-4" />}
                  placeholder="اختر الحلقة"
                />
              </div>
            )}

            {/* Auto-Save Status Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6E9E2] text-xs font-medium shadow-2xs select-none">
              {saveStatus === "saving" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[#7C857D] font-bold">جاري الحفظ تلقائيًا...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="text-[#184E3D] font-bold">تم الحفظ تلقائيًا ✓</span>
                </>
              ) : saveStatus === "error" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-600 font-bold">تعذّر الحفظ التلقائي</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 opacity-60" />
                  <span className="text-[#7C857D]">حفظ تلقائي مفعّل</span>
                </>
              )}
            </div>

            {/* WhatsApp List Report Button */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <FaWhatsapp className="w-4 h-4 text-emerald-200" />
              <span>قائمة الحضور وحجز الأدوار</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold">
            {errorMessage}
          </div>
        )}

        {/* Circle Info Banner */}
        <div className="bg-[#EAF0E6] border border-[#DDE6D7] rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <strong className="text-base sm:text-lg font-bold text-[#184E3D]">
              {currentCircle?.name || "حلقة أهل القرآن"}
            </strong>
            <span className="text-xs text-[#7C857D] mr-3 font-medium">
              حفظ ومراجعة • {records.length} طالبات
            </span>
          </div>
          <div className="text-xs sm:text-sm text-[#184E3D] font-bold">
            المواعيد: {formatCircleDays(currentCircle?.days) || "الأحد، الثلاثاء، الخميس"} •{" "}
            {currentCircle?.time || "٤:٠٠ مساءً"}
          </div>
        </div>

        {/* 4 Statistics Cards (matching exact design) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: إجمالي الطالبات */}
          <div className="bg-white border border-[#E6E9E2] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#7C857D] font-medium">
              <span>إجمالي الطالبات</span>
              <Icon kind="users" size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#184E3D] my-1">
              {stats.total.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-[#7C857D]">طالبات في الحلقة</div>
          </div>

          {/* Card 2: الحاضرات (Featured DARK GREEN card) */}
          <div className="bg-[#184E3D] text-white border border-[#184E3D] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#D8E6DD] font-medium">
              <span>الحاضرات</span>
              <Icon kind="check" size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white my-1">
              {stats.present.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-[#C0D6CA]">حضور اليوم</div>
          </div>

          {/* Card 3: بانتظار التسميع */}
          <div className="bg-white border border-[#E6E9E2] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#7C857D] font-medium">
              <span>بانتظار التسميع</span>
              <Icon kind="book" size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#184E3D] my-1">
              {stats.waiting.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-[#7C857D]">حسب ترتيب الحضور</div>
          </div>

          {/* Card 4: أتممن التسميع */}
          <div className="bg-white border border-[#E6E9E2] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#7C857D] font-medium">
              <span>أتممن التسميع</span>
              <Icon kind="report" size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#184E3D] my-1">
              {stats.heard.toLocaleString("ar-EG")}
            </div>
            <div className="text-[11px] text-[#7C857D]">بارك الله فيهنّ</div>
          </div>
        </div>

        {/* Weekly Schedule: جدول هذا الأسبوع */}
        <div className="bg-white border border-[#E6E9E2] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <strong className="text-sm sm:text-base font-bold text-[#184E3D]">
                جدول هذا الأسبوع
              </strong>

              {/* Filter Pills with ALL Existing Circles */}
              {circles.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* All Circles Pill */}
                  <button
                    type="button"
                    onClick={() => setScheduleFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      scheduleFilter === "all"
                        ? "bg-[#184E3D] text-white shadow-xs"
                        : "bg-[#F6F5F0] text-[#7C857D] hover:bg-[#EAE8DE] hover:text-[#184E3D] border border-[#E6E9E2]"
                    }`}
                  >
                    جميع الحلقات ({weekSessions.length})
                  </button>

                  {/* Individual Circle Pills for EVERY existing circle */}
                  {circles.map((c) => {
                    const circleSessionCount = weekSessions.filter(
                      (s) => s.circleId === c._id
                    ).length;
                    const isActive = scheduleFilter === c._id;

                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setScheduleFilter(c._id);
                          setSelectedCircleId(c._id);
                          // Auto switch date to that circle's session if needed
                          const circleSessions = weekSessions.filter(
                            (s) => s.circleId === c._id
                          );
                          if (
                            circleSessions.length > 0 &&
                            !circleSessions.some((s) => s.dateStr === date)
                          ) {
                            setDate(circleSessions[0].dateStr);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          isActive
                            ? "bg-[#184E3D] text-white shadow-xs"
                            : "bg-[#F6F5F0] text-[#7C857D] hover:bg-[#EAE8DE] hover:text-[#184E3D] border border-[#E6E9E2]"
                        }`}
                      >
                        <LuBookOpen className="w-3.5 h-3.5 opacity-80 shrink-0" />
                        <span>{c.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-[#E6E9E2] text-[#7C857D]"
                          }`}
                        >
                          {circleSessionCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-xs text-[#7C857D] font-medium hidden sm:inline">
                تاريخ الأسبوع:
              </span>
              <input
                suppressHydrationWarning
                aria-label="اختيار تاريخ الجلسة"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E6E9E2] text-xs font-bold text-[#184E3D] bg-white focus:outline-none focus:border-[#184E3D] cursor-pointer"
              />
            </div>
          </div>

          {/* Sessions cards row */}
          {displayedWeekSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#7C857D] bg-[#FAFBF7] rounded-xl border border-dashed border-[#E6E9E2]">
              لا توجد حلقات مجدولة في هذا الأسبوع.
            </div>
          ) : (
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1">
              {displayedWeekSessions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setDate(s.dateStr);
                    setSelectedCircleId(s.circleId);
                  }}
                  className={`flex-1 min-w-[150px] sm:min-w-[185px] p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    s.isSelected
                      ? "bg-[#F0F5EC] border-[#72977D] shadow-xs ring-1 ring-[#184E3D]/15"
                      : "bg-white border-[#E6E9E2] hover:bg-[#FAFBF7]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <strong className="text-xs sm:text-sm font-bold text-[#184E3D]">
                      {s.dayName}
                    </strong>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        s.isSelected
                          ? "bg-[#184E3D] text-white"
                          : "text-[#7C857D] bg-[#F6F5F0]"
                      }`}
                    >
                      {s.isSelected ? "الحلقة المختارة" : "موعد حلقة"}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-[#184E3D] mt-1.5 truncate flex items-center gap-1.5">
                    <LuBookOpen className="w-3.5 h-3.5 text-[#7C857D] shrink-0" />
                    <span className="truncate">{s.circleName}</span>
                  </div>

                  <div className="text-[11px] text-[#7C857D] mt-1 font-medium flex items-center justify-between">
                    <span>{s.displayDate}</span>
                    <span className="text-[10px]">{s.time}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Attendance & Recitation Card */}
        <div className="bg-white border border-[#E6E9E2] rounded-2xl shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-[#E6E9E2] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <strong className="text-base sm:text-lg font-bold text-[#184E3D]">
                سجل الحضور والتسميع
              </strong>
              <div className="text-xs text-[#7C857D] mt-0.5 font-medium" suppressHydrationWarning>
                {shortDateArabic} • ترتيب الدور يُسجّل تلقائيًا عند الحضور
              </div>
            </div>

            <button
              onClick={handleToggleHoliday}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isHoliday
                  ? "bg-[#F4EEDD] border-[#cbbca1] text-[#7B6541]"
                  : "bg-white border-[#E6E9E2] text-[#184E3D] hover:bg-[#F0F5EC]"
              }`}
            >
              {isHoliday ? "إلغاء الإجازة" : "تحديد اليوم إجازة"}
            </button>
          </div>

          {/* Holiday Notice Banner */}
          {isHoliday && (
            <div className="p-3.5 bg-[#F4EEDD] text-[#7B6541] border-b border-[#E6E9E2] text-xs font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LuTriangleAlert className="w-4 h-4 text-[#7B6541] shrink-0" />
                <span>
                  هذا اليوم إجازة / عطلة رسمية للحلقة{holidayReason ? ` (${holidayReason})` : ""}؛ أُوقف التسجيل واستُبعد اليوم من التقارير الإحصائية.
                </span>
              </div>
              {holidayReason && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#e2d5bd] text-[#5e4b2d] font-bold shrink-0">
                  {holidayReason}
                </span>
              )}
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#E6E9E2]/60">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(["الكل", "حاضرة", "غائبة", "معتذرة"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    filter === f
                      ? "bg-[#184E3D] text-white border-[#184E3D] shadow-2xs"
                      : "bg-white text-[#7C857D] border-transparent hover:bg-[#F0F5EC]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <input
              suppressHydrationWarning
              aria-label="بحث باسم الطالبة"
              type="text"
              placeholder="بحث باسم الطالبة…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 rounded-lg border border-[#E6E9E2] text-xs text-[#184E3D] bg-white focus:outline-none focus:border-[#184E3D] w-full sm:w-56"
            />
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="p-12 text-center text-[#7C857D] text-sm">
              جاري تحميل سجل الحضور...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-[#7C857D] text-sm space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF0E6] flex items-center justify-center text-[#184E3D] mx-auto">
                <LuUsers className="w-7 h-7" />
              </div>
              <p className="font-bold text-[#184E3D]">لا توجد طالبات في هذه الحلقة</p>
              <p className="text-xs">يرجى إضافة طالبات للحلقة من صفحة الطالبات.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm min-w-[700px] border-collapse">
                <thead>
                  <tr className="bg-[#F8F9F5] text-[#7C857D] text-xs font-bold border-b border-[#E6E9E2]">
                    <th className="py-3 px-5 w-2/6">الطالبة</th>
                    <th className="py-3 px-4 text-center w-1/6">الحضور</th>
                    <th className="py-3 px-4 text-center w-20 sm:w-24">الدور</th>
                    <th className="py-3 px-4 text-center w-1/6">التسميع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E9E2]">
                  {filteredRecords.map((r, idx) => {
                    const isPresent = r.status === "present";
                    const isExcused = r.status === "excused";
                    const isAbsent = r.status === "absent";
                  

                    const statusArabic = isPresent
                      ? "حاضرة"
                      : isExcused
                      ? "معتذرة"
                      : isAbsent
                      ? "غائبة"
                      : "لم يُسجّل";

                    const firstLetter = r.studentName.trim().charAt(0) || "ط";
                    const avatarBg = idx % 2 === 0 ? "#EDF2E9" : "#F2EDDF";

                    return (
                      <tr
                        key={r.studentId}
                        className={`transition-colors hover:bg-[#F9FAF7] ${
                          isHoliday ? "opacity-50" : ""
                        }`}
                      >
                        {/* 1. الطالبة */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              style={{ backgroundColor: avatarBg, color: G }}
                              className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs"
                            >
                              {firstLetter}
                            </span>
                            <span className="font-bold text-[#182B23] text-sm">
                              {r.studentName}
                            </span>
                          </div>
                        </td>

                        {/* 2. الحضور (Custom Dropdown Pill) */}
                        <td className="py-3.5 px-4 text-center">
                          <CustomSelect
                            variant="status"
                            disabled={isHoliday}
                            value={statusArabic}
                            onChange={(newVal) =>
                              handleStatusChange(r.studentId, newVal as any)
                            }
                            options={[
                              { value: "لم يُسجّل", label: "لم يُسجّل" },
                              { value: "حاضرة", label: "حاضرة" },
                              { value: "غائبة", label: "غائبة" },
                              { value: "معتذرة", label: "معتذرة" },
                            ]}
                          />
                        </td>

                        {/* 3. الدور (حقل قابل للتعديل مع ترحيل تلقائي للأدوار) */}
                        <td className="py-2.5 px-3 text-center">
                          {isPresent ? (
                            <div className="inline-flex items-center justify-center">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                disabled={isHoliday}
                                value={r.order ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    setRecords((prev) =>
                                      prev.map((rec) =>
                                        rec.studentId === r.studentId
                                          ? { ...rec, order: null }
                                          : rec
                                      )
                                    );
                                  } else {
                                    const parsed = parseInt(val, 10);
                                    if (!isNaN(parsed) && parsed > 0) {
                                      setRecords((prev) =>
                                        prev.map((rec) =>
                                          rec.studentId === r.studentId
                                            ? { ...rec, order: parsed }
                                            : rec
                                        )
                                      );
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (isNaN(val) || val < 1) {
                                    // إذا تم تفريغ الحقل نُسكنها في نهاية أدوار الحاضرات
                                    const others = records
                                      .filter(
                                        (rec) =>
                                          rec.status === "present" &&
                                          rec.studentId !== r.studentId &&
                                          rec.order !== null
                                      )
                                      .map((rec) => rec.order as number);
                                    const nextOrd =
                                      others.length > 0 ? Math.max(...others) + 1 : 1;
                                    handleReorderStudent(r.studentId, nextOrd);
                                  } else {
                                    handleReorderStudent(r.studentId, val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="w-12 h-8 text-center font-bold text-xs rounded-lg border border-[#d2e3dc] bg-white text-[#184E3D] hover:border-[#184E3D] focus:border-[#184E3D] focus:ring-1 focus:ring-[#184E3D] focus:outline-hidden transition-all shadow-2xs cursor-text"
                                title="انقر لتعديل رقم الدور (سيتم ترحيل باقي الأدوار تلقائياً)"
                              />
                            </div>
                          ) : (
                            <span className="text-[#7C857D] font-bold select-none text-xs">—</span>
                          )}
                        </td>

                        {/* 4. التسميع */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={isHoliday || !isPresent}
                            onClick={() => handleToggleRecited(r.studentId)}
                            className={`inline-flex items-center gap-1.5 cursor-pointer select-none transition-opacity ${
                              !isPresent || isHoliday
                                ? "opacity-35 cursor-not-allowed"
                                : "hover:opacity-85"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                r.hasRecited
                                  ? "bg-[#184E3D] border-[#184E3D] text-white"
                                  : "bg-white border-slate-300 text-transparent"
                              }`}
                            >
                              <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span
                              className={`text-xs ${
                                r.hasRecited
                                  ? "text-[#184E3D] font-bold"
                                  : "text-[#7C857D] font-normal"
                              }`}
                            >
                              {r.hasRecited ? "تم التسميع" : "لم تسمّع"}
                            </span>
                          </button>
                        </td>                      
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-3.5 sm:p-4 border-t border-[#E6E9E2] flex items-center justify-between text-xs text-[#7C857D] font-medium bg-[#FAFBF7]">
            <div className="flex items-center gap-2">
              <span>التسجيل تلقائي • يمكنكِ تعديل أي حالة</span>
              {saveStatus === "saved" && (
                <span className="text-[#184E3D] font-bold">✓ تم الحفظ تلقائيًا</span>
              )}
            </div>
            <span>{records.length} طالبات</span>
          </div>
        </div>

        {/* Bottom Reminder Note */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-dashed border-[#CFDAC9] bg-[#F7F8F0] text-xs text-[#7C857D] font-medium">
          تذكير لطيف: بعد انتهاء الحلقة، راجعي التسميع والواجب ثم انسخي التقرير لمشاركته مع الإدارة.
        </div>
      </div>

      {/* 2. REPORT MODAL (Copyable WhatsApp & Administrative Text Report) */}
      {isReportOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E6E9E2] max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E6E9E2] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                  <FaWhatsapp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#184E3D]">
                    قائمة الحضور والغياب وحجز الأدوار
                  </h3>
                  <p className="text-xs text-[#7C857D]">
                    رسالة واتساب منسقة بحسب أدوار التسميع والمحاضرات والمعتذرات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                className="text-[#7C857D] hover:text-[#184E3D] p-1.5 rounded-xl hover:bg-[#F0F5EC] transition-colors cursor-pointer"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleResetReportText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E9E2] text-xs font-bold text-[#7C857D] hover:text-[#184E3D] hover:bg-[#F0F5EC] transition-colors cursor-pointer"
              >
                <LuRefreshCw className="w-3.5 h-3.5" />
                <span>إعادة ضبط النص</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E9E2] text-xs font-bold text-[#184E3D] hover:bg-[#F0F5EC] transition-colors cursor-pointer"
              >
                <LuPrinter className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            </div>

            {/* Textarea containing copyable and editable text */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <textarea
                aria-label="نص القائمة القابل للنسخ والتعديل"
                value={editedReportText}
                onChange={(e) => setEditedReportText(e.target.value)}
                dir="rtl"
                className="w-full h-80 sm:h-96 md:h-[420px] p-4 rounded-2xl border border-[#E6E9E2] bg-[#FAFBF7] text-xs sm:text-sm text-[#184E3D] font-mono leading-relaxed focus:outline-hidden focus:border-[#184E3D] resize-none selection:bg-emerald-100 selection:text-emerald-900 overflow-y-auto"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E6E9E2] shrink-0">
              <span className="text-xs text-[#7C857D]">
                جاهز للمشاركة المباشرة عبر واتساب أو التعديل عليه.
              </span>
              <button
                onClick={handleCopyReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#184E3D] hover:bg-[#123e30] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all"
              >
                {copied ? (
                  <>
                    <LuCheck className="w-4 h-4 text-emerald-200" />
                    <span>تم النسخ بنجاح! ✓</span>
                  </>
                ) : (
                  <>
                    <LuCopy className="w-4 h-4" />
                    <span>نسخ القائمة للواتساب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRINT-ONLY A4 SESSION SHEET */}
      <div className="print-only p-4 font-sans text-black" dir="rtl">
        <div className="text-center pb-6 border-b-2 border-black mb-6 space-y-2">
          <h1 className="text-2xl font-black">كشف حضور وتسميع حلقة التحفيظ</h1>
          <div className="flex justify-between items-center text-sm font-bold pt-2">
            <span>الحلقة: {currentCircle?.name || "حلقة القرآن"}</span>
            <span>التاريخ: {formattedDateArabic}</span>
            <span>التوقيت: {currentCircle?.time || "٤:٠٠ م"}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold mb-6 border border-black p-2 bg-slate-50">
          <div>إجمالي الطالبات: {stats.total}</div>
          <div>الحاضرات: {stats.present}</div>
          <div>أتممن التسميع: {stats.heard}</div>
          <div>المعتذرات / الغائبات: {stats.excused + stats.absent}</div>
        </div>

        <table className="w-full text-right border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-xs font-bold">
              <th className="border border-black p-2 text-center w-14">الدور</th>
              <th className="border border-black p-2">اسم الطالبة</th>
              <th className="border border-black p-2 text-center w-24">الحضور</th>
              <th className="border border-black p-2 text-center w-28">التسميع</th>
              <th className="border border-black p-2 text-center w-24">الواجب</th>
              <th className="border border-black p-2 text-center w-24">الانصراف</th>
              <th className="border border-black p-2 text-center w-36">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((r) => (
              <tr key={r.studentId} className="border-b border-black">
                <td className="border border-black p-2 text-center font-bold">
                  {r.order ?? "—"}
                </td>
                <td className="border border-black p-2 font-bold">{r.studentName}</td>
                <td className="border border-black p-2 text-center">
                  {r.status === "present"
                    ? "حاضرة"
                    : r.status === "excused"
                    ? "معتذرة"
                    : r.status === "absent"
                    ? "غائبة"
                    : "لم يُسجّل"}
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  {r.status === "present"
                    ? r.hasRecited
                      ? "✓ تم التسميع"
                      : "لم تسمّع"
                    : "—"}
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  {r.status === "present"
                    ? r.homeworkCompleted
                      ? "✓ مكتمل"
                      : "غير مكتمل"
                    : "—"}
                </td>
                <td className="border border-black p-2 text-center font-mono text-xs">
                  {r.departureTime || "—"}
                </td>
                <td className="border border-black p-2 text-center text-xs text-slate-500"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 flex justify-between items-center text-sm font-bold pt-8 border-t border-black">
          <div>توقيع المشرفة / المعلمة: .......................................</div>
          <div>نظام الإتقان لإدارة الحلقات</div>
        </div>
      </div>
    </div>
  );
}
