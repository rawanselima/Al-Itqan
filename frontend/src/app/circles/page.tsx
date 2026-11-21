"use client";

import { useEffect, useState } from "react";
import { api, Circle } from "@/lib/api";

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
    setSelectedDays(["الإثنين", "الخميس"]);
    setTime("04:00 م");
    setNotes("");
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (circle: Circle) => {
    setEditingCircle(circle);
    setName(circle.name);
    setSelectedDays(circle.days || []);
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
          days: selectedDays,
          time,
          notes,
        });
      } else {
        await api.createCircle({
          name,
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">إدارة الحلقات</h2>
          <p className="text-sm text-slate-500 mt-1">
            إضافة وتعديل حلقات التحفيظ وتحديد أيام وساعة الانعقاد
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm shadow-md hover:bg-emerald-800 transition-all cursor-pointer"
        >
          <span>➕</span>
          <span>إضافة حلقة جديدة</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">جاري تحميل الحلقات...</div>
      ) : circles.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
          <div className="text-5xl">📖</div>
          <h3 className="text-lg font-bold text-slate-700">لا توجد حلقات مسجلة حتى الآن</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            ابدأ بإضافة الحلقة الأولى لتتمكن من تسجيل الطالبات ومتابعة الحضور والواجبات.
          </p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800"
          >
            إضافة الحلقة الأولى
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {circles.map((circle) => (
            <div
              key={circle._id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-extrabold text-lg text-slate-800 group-hover:text-emerald-700 transition-colors">
                    {circle.name}
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                    {circle.time}
                  </span>
                </div>

                {/* Days Badges */}
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-medium">أيام الانعقاد:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {circle.days.map((day) => (
                      <span
                        key={day}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>

                {circle.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                    {circle.notes}
                  </p>
                )}

                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>الطالبات المقيدات:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {circle.studentCount || 0} طالبة
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(circle)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ✏️ تعديل
                </button>
                <button
                  onClick={() => handleDelete(circle)}
                  className="py-2 px-3 text-xs font-bold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                  title="حذف الحلقة"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingCircle ? "تعديل بيانات الحلقة" : "إضافة حلقة جديدة"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">اسم الحلقة *</label>
                <input
                  type="text"
                  placeholder="مثال: حلقة الفردوس، حلقة النور..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">أيام الانعقاد *</label>
                <div className="grid grid-cols-3 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ساعة وتوقيت الحلقة *</label>
                <input
                  type="text"
                  placeholder="مثال: 04:30 عصراً أو 05:00 م"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل خاصة بالحلقة أو المستوى..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
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
