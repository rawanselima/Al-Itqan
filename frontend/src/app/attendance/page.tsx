"use client";

import { useEffect, useState, useMemo } from "react";
import { api, Circle } from "@/lib/api";

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  phone: string;
  status: "present" | "absent" | "excused";
  hasRecited: boolean;
  order: number | null;
  notes?: string;
}

export default function AttendancePage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
        setErrorMessage("فشل في تحميل الحلقات");
      }
    }
    loadCircles();
  }, []);

  // Load Attendance Session when Circle or Date changes
  useEffect(() => {
    if (!selectedCircleId || !date) return;

    async function loadAttendance() {
      try {
        setLoading(true);
        setSuccessMessage("");
        setErrorMessage("");
        const res = await api.getAttendance(selectedCircleId, date);
        setRecords(res.records || []);
      } catch (err: any) {
        setErrorMessage(err.message || "حدث خطأ أثناء تحميل سجل الحضور");
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [selectedCircleId, date]);

  // Selected Circle Details
  const currentCircle = circles.find((c) => c._id === selectedCircleId);

  // Stats calculation
  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const recited = records.filter((r) => r.status === "present" && r.hasRecited).length;
    return { total: records.length, present, absent, excused, recited };
  }, [records]);

  // Handle Changing Attendance Status
  const handleStatusChange = (
    studentId: string,
    newStatus: "present" | "absent" | "excused"
  ) => {
    setRecords((prev) => {
      // Find current max order among present students
      const currentOrders = prev
        .filter((r) => r.status === "present" && r.order !== null)
        .map((r) => r.order as number);
      const nextOrder = currentOrders.length > 0 ? Math.max(...currentOrders) + 1 : 1;

      return prev.map((r) => {
        if (r.studentId !== studentId) return r;

        if (newStatus === "present") {
          // If was not present, assign next order if none exists
          const assignedOrder = r.order || nextOrder;
          return {
            ...r,
            status: "present",
            order: assignedOrder,
          };
        } else {
          // Absent or excused -> reset order and recitation
          return {
            ...r,
            status: newStatus,
            hasRecited: false,
            order: null,
          };
        }
      });
    });
  };

  // Handle Manual Order Override
  const handleOrderChange = (studentId: string, val: string) => {
    const num = val === "" ? null : parseInt(val, 10);
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, order: num } : r))
    );
  };

  // Handle Recitation Toggle
  const handleToggleRecited = (studentId: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, hasRecited: !r.hasRecited } : r
      )
    );
  };

  // Save Attendance to Backend
  const handleSave = async () => {
    if (!selectedCircleId || !date) return;
    try {
      setSaving(true);
      setSuccessMessage("");
      setErrorMessage("");
      await api.saveAttendance(selectedCircleId, date, records);
      setSuccessMessage("✅ تم حفظ سجل الحضور بنجاح!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "فشل حفظ سجل الحضور");
    } finally {
      setSaving(false);
    }
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Records sorted for display & print:
  // Present students with order first (1, 2, 3...), then by name
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.studentName.localeCompare(b.studentName, "ar");
    });
  }, [records]);

  // Date formatted nicely in Arabic
  const formattedDateArabic = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date + "T00:00:00"));

  return (
    <div className="p-8 space-y-6">
      {/* 1. SCREEN VIEW (Hidden when printing) */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">دفتر الحضور والتسميع</h2>
            <p className="text-sm text-slate-500 mt-1">
              تسجيل الحضور بأسبقية الحضور، ومتابعة إنجاز التسميع لكل طالبة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={records.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <span>🖨️</span>
              <span>طباعة كشف الجلسة</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || records.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold shadow-md hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              <span>💾</span>
              <span>{saving ? "جاري الحفظ..." : "حفظ الحضور"}</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold">
            {errorMessage}
          </div>
        )}

        {/* Control Bar: Circle & Date Pickers */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">اختر الحلقة *</label>
              <select
                value={selectedCircleId}
                onChange={(e) => setSelectedCircleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-600"
              >
                {circles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.days.join("، ")}) - {c.time}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">تاريخ الجلسة *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {currentCircle && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>أيام الحلقة المعتمدة:</span>
                <span className="font-bold text-emerald-800">
                  {currentCircle.days.join(" و ")}
                </span>
                <span>- التوقيت:</span>
                <span className="font-bold text-emerald-800">{currentCircle.time}</span>
              </div>
              <div className="font-medium text-slate-400">{formattedDateArabic}</div>
            </div>
          )}
        </div>

        {/* Quick Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
            <span className="text-xs text-slate-400">إجمالي المقيدات</span>
            <p className="text-lg font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-center">
            <span className="text-xs text-emerald-700">الحاضرات</span>
            <p className="text-lg font-bold text-emerald-800">{stats.present}</p>
          </div>
          <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-200 text-center">
            <span className="text-xs text-teal-700">أنجزن التسميع ✨</span>
            <p className="text-lg font-bold text-teal-800">{stats.recited}</p>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 text-center">
            <span className="text-xs text-amber-700">المعتذرات</span>
            <p className="text-lg font-bold text-amber-800">{stats.excused}</p>
          </div>
          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200 text-center">
            <span className="text-xs text-rose-700">الغائبات</span>
            <p className="text-lg font-bold text-rose-800">{stats.absent}</p>
          </div>
        </div>

        {/* Students Attendance List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري تحميل سجل الحضور...</div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
            <div className="text-4xl">👥</div>
            <h3 className="text-base font-bold text-slate-700">لا توجد طالبات في هذه الحلقة</h3>
            <p className="text-xs text-slate-500">
              يرجى إضافة طالبات للحلقة أولاً من صفحة الطالبات.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold">
                قائمة الطالبات (يتم الترتيب التلقائي برقم الأسبقية عند تحديد &quot;حاضرة&quot;)
              </span>
              <span>عدد الطالبات: {records.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {sortedRecords.map((student) => {
                const isPresent = student.status === "present";
                const isAbsent = student.status === "absent";
                const isExcused = student.status === "excused";

                return (
                  <div
                    key={student.studentId}
                    className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                      isPresent
                        ? "bg-emerald-50/30"
                        : isExcused
                        ? "bg-amber-50/20"
                        : "bg-white"
                    }`}
                  >
                    {/* Student Info & Order Badge */}
                    <div className="flex items-center gap-3">
                      {/* Attendance Order Number */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-bold">رقم:</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="-"
                          value={student.order ?? ""}
                          onChange={(e) => handleOrderChange(student.studentId, e.target.value)}
                          className={`w-12 h-9 text-center rounded-xl font-extrabold text-sm border focus:outline-none ${
                            student.order
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}
                          title="ترتيب أسبقية الحضور"
                        />
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                          {student.studentName}
                        </h4>
                        {student.phone && (
                          <span className="text-xs text-slate-400 font-sans" dir="ltr">
                            {student.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attendance Status Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Status: Present */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, "present")}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPresent
                            ? "bg-emerald-700 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-emerald-100/50"
                        }`}
                      >
                        ✓ حاضرة
                      </button>

                      {/* Status: Excused */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, "excused")}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isExcused
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-amber-100/50"
                        }`}
                      >
                        ⚠️ معتذرة
                      </button>

                      {/* Status: Absent */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, "absent")}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAbsent
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-rose-100/50"
                        }`}
                      >
                        ✕ غائبة
                      </button>

                      {/* Recitation Toggle (Only for Present) */}
                      {isPresent && (
                        <button
                          type="button"
                          onClick={() => handleToggleRecited(student.studentId)}
                          className={`mr-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            student.hasRecited
                              ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                              : "bg-white text-teal-800 border-teal-300 hover:bg-teal-50"
                          }`}
                        >
                          {student.hasRecited ? "✨ سمّعت بنجاح" : "لم تُسمّع بعد"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY REPORT (Clean A4 layout) */}
      <div className="print-only p-4 font-sans text-black" dir="rtl">
        {/* Printable Header */}
        <div className="text-center pb-6 border-b-2 border-black mb-6 space-y-2">
          <h1 className="text-2xl font-black">كشف حضور وتسميع حلقة التحفيظ</h1>
          <div className="flex justify-between items-center text-sm font-bold pt-2">
            <span>الحلقة: {currentCircle?.name || "حلقة القرآن"}</span>
            <span>التاريخ: {formattedDateArabic}</span>
            <span>التوقيت: {currentCircle?.time}</span>
          </div>
        </div>

        {/* Print Summary */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold mb-6 border border-black p-2 bg-slate-50">
          <div>إجمالي الطالبات: {stats.total}</div>
          <div>الحاضرات: {stats.present}</div>
          <div>أنجزن التسميع: {stats.recited}</div>
          <div>المعتذرات / الغائبات: {stats.excused + stats.absent}</div>
        </div>

        {/* Printable Table (Strictly ordered by arrival order) */}
        <table className="w-full text-right border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-xs font-bold">
              <th className="border border-black p-2 text-center w-14">الترتيب</th>
              <th className="border border-black p-2">اسم الطالبة</th>
              <th className="border border-black p-2 text-center w-28">حالة الحضور</th>
              <th className="border border-black p-2 text-center w-36">حالة التسميع</th>
              <th className="border border-black p-2 text-center w-40">توقيع المعلمة / ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((r, idx) => (
              <tr key={r.studentId} className="border-b border-black">
                <td className="border border-black p-2 text-center font-bold">
                  {r.order ?? idx + 1}
                </td>
                <td className="border border-black p-2 font-bold">{r.studentName}</td>
                <td className="border border-black p-2 text-center">
                  {r.status === "present"
                    ? "حاضرة"
                    : r.status === "excused"
                    ? "معتذرة"
                    : "غائبة"}
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  {r.status === "present"
                    ? r.hasRecited
                      ? "✓ تم التسميع"
                      : "لم تُسمّع"
                    : "-"}
                </td>
                <td className="border border-black p-2 text-center text-xs text-slate-500"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Printable Footer */}
        <div className="mt-12 flex justify-between items-center text-sm font-bold pt-8 border-t border-black">
          <div>توقيع المشرف / المعلمة: .......................................</div>
          <div>نظام الإتقان لإدارة الحلقات</div>
        </div>
      </div>
    </div>
  );
}
