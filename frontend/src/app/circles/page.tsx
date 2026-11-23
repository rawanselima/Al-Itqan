"use client";

import { useEffect, useState } from "react";
import { api, Circle, getDayName } from "@/lib/api";
import { LuPlus, LuBookOpen, LuPencil, LuTrash2, LuX } from "react-icons/lu";

const DAYS_OF_WEEK = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCircles = async () => {
    try {
      setLoading(true);
      const data = await api.getCircles();
      setCircles(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ في تحميل الحلقات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircles();
  }, []);

  const openAddModal = () => {
    setEditingCircle(null);
    setName("");
    setTeacherName("");
    setSelectedDays(["الإثنين", "الخميس"]);
    setTime("04:00 م");
    setNotes("");
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (circle: Circle) => {
    setEditingCircle(circle);
    setName(circle.name);
    setTeacherName(circle.teacherName || "");
    setSelectedDays(Array.isArray(circle.days) ? circle.days.map(getDayName) : []);
    setTime(circle.time || "");
    setNotes(circle.notes || "");
    setError("");
    setIsModalOpen(true);
  };

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى إدخال اسم الحلقة");
      return;
    }
    if (selectedDays.length === 0) {
      setError("يرجى اختيار يوم واحد على الأقل للحلقة");
      return;
    }
    if (!time.trim()) {
      setError("يرجى تحديد وقت الحلقة");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editingCircle) {
        await api.updateCircle(editingCircle._id, {
          name,
          teacherName,
          days: selectedDays,
          time,
          notes,
        });
      } else {
        await api.createCircle({
          name,
          teacherName,
          days: selectedDays,
          time,
          notes,
        });
      }
      setIsModalOpen(false);
      await loadCircles();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (circle: Circle) => {
    if (
      !confirm(
        `هل أنت متأكد من حذف حلقة "${circle.name}"؟ سيتم أيضاً حذف الطالبات المرتبطات بها.`
      )
    ) {
      return;
    }
    try {
      await api.deleteCircle(circle._id);
      await loadCircles();
    } catch (err: any) {
      alert(err.message || "فشل حذف الحلقة");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">إدارة الحلقات</h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            إضافة وتعديل حلقات التحفيظ وتحديد أيام وساعة الانعقاد
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-hover transition-all cursor-pointer"
        >
          <LuPlus className="w-4 h-4" />
          <span>إضافة حلقة جديدة</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">جاري تحميل الحلقات...</div>
      ) : circles.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-surface rounded-2xl sm:rounded-3xl border border-dashed border-surface-border space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-primary mx-auto">
            <LuBookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-text-main">لا توجد حلقات مسجلة حتى الآن</h3>
          <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto">
            ابدأ بإضافة الحلقة الأولى لتتمكن من تسجيل الطالبات ومتابعة الحضور والواجبات.
          </p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover cursor-pointer"
          >
            إضافة الحلقة الأولى
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {circles.map((circle) => (
            <div
              key={circle._id}
              className="bg-surface rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-surface-border shadow-xs flex flex-col justify-between hover:border-primary transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-text-main group-hover:text-primary transition-colors">
                      {circle.name}
                    </h3>
                    {circle.teacherName && (
                      <div className="text-xs text-text-muted mt-0.5">
                        المعلمة: <span className="font-bold text-text-main">{circle.teacherName}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-light text-primary">
                    {circle.time}
                  </span>
                </div>

                {/* Days Badges */}
                <div className="space-y-1.5">
                  <span className="text-xs text-text-muted font-medium">أيام الانعقاد:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(circle.days || []).map((day) => (
                      <span
                        key={String(day)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-beige text-text-main border border-surface-border"
                      >
                        {getDayName(day)}
                      </span>
                    ))}
                  </div>
                </div>

                {circle.notes && (
                  <p className="text-xs text-text-muted bg-beige/60 p-2.5 rounded-xl border border-surface-border">
                    {circle.notes}
                  </p>
                )}

                <div className="text-xs text-text-muted pt-2 border-t border-surface-border flex items-center justify-between">
                  <span>الطالبات المقيدات:</span>
                  <span className="font-bold text-primary bg-primary-light px-2 py-0.5 rounded-md">
                    {circle.studentCount || 0} طالبة
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-surface-border">
                <button
                  onClick={() => openEditModal(circle)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border border-surface-border text-text-main hover:bg-beige transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <LuPencil className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(circle)}
                  className="py-2 px-3 text-xs font-bold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center"
                  title="حذف الحلقة"
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-surface-border space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-bold text-text-main">
                {editingCircle ? "تعديل بيانات الحلقة" : "إضافة حلقة جديدة"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-main p-1 cursor-pointer"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">اسم الحلقة *</label>
                <input
                  type="text"
                  placeholder="مثال: حلقة الفردوس، حلقة النور..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm bg-surface"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">اسم المعلمة</label>
                <input
                  type="text"
                  placeholder="مثال: أ/ سماح أبو الخير"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm bg-surface"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-main">أيام الانعقاد *</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-beige text-text-main border-surface-border hover:bg-primary-light"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">ساعة وتوقيت الحلقة *</label>
                <input
                  type="text"
                  placeholder="مثال: 04:30 عصراً أو 05:00 م"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm bg-surface"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">ملاحظات (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل خاصة بالحلقة أو المستوى..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm bg-surface"
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-border text-text-main font-bold text-xs hover:bg-beige cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "جاري الحفظ..." : "حفظ البيانات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
