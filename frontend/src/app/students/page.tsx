"use client";

import { useEffect, useState } from "react";
import { api, Circle, formatCircleDays } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import {
  LuUserPlus,
  LuTriangleAlert,
  LuGraduationCap,
  LuPencil,
  LuTrash2,
  LuX,
  LuBookOpen,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";

interface Student {
  _id: string;
  name: string;
  phone: string;
  circleId: {
    _id: string;
    name: string;
    days?: (string | number)[];
    time?: string;
  };
  isActive: boolean;
  joinedAt?: string;
  leftAt?: string | null;
  warningForRemoval?: boolean;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [circleId, setCircleId] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [warningForRemoval, setWarningForRemoval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [circlesData, studentsData] = await Promise.all([
        api.getCircles(),
        api.getStudents({
          circleId: selectedCircleId || undefined,
          search: search || undefined,
        }),
      ]);
      setCircles(circlesData);
      setStudents(studentsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCircleId, search]);

  const openAddModal = () => {
    setEditingStudent(null);
    setName("");
    setPhone("");
    setCircleId(selectedCircleId || (circles[0]?._id ?? ""));
    setJoinedAt(new Date().toISOString().slice(0, 10));
    setWarningForRemoval(false);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setPhone(student.phone || "");
    setCircleId(student.circleId?._id || "");
    setJoinedAt(student.joinedAt || new Date().toISOString().slice(0, 10));
    setWarningForRemoval(Boolean(student.warningForRemoval));
    setError("");
    setIsModalOpen(true);
  };

  const handleToggleWarning = async (student: Student) => {
    try {
      const newVal = !student.warningForRemoval;
      await api.updateStudent(student._id, { warningForRemoval: newVal });
      setStudents((prev) =>
        prev.map((s) => (s._id === student._id ? { ...s, warningForRemoval: newVal } : s))
      );
    } catch {
      alert("فشل تحديث علامة التحذير بالحذف");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى إدخال اسم الطالبة");
      return;
    }
    if (!circleId) {
      setError("يرجى اختيار الحلقة الخاصة بالطالبة");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editingStudent) {
        await api.updateStudent(editingStudent._id, {
          name,
          phone,
          circleId,
          joinedAt,
          warningForRemoval,
        });
      } else {
        await api.createStudent({
          name,
          phone,
          circleId,
          joinedAt,
          warningForRemoval,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ الطالبة");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`هل أنت متأكد من حذف الطالبة "${student.name}"؟`)) {
      return;
    }
    try {
      await api.deleteStudent(student._id);
      await loadData();
    } catch (err: any) {
      alert(err.message || "فشل حذف الطالبة");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">إدارة الطالبات</h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            تسجيل الطالبات وربطهن بالحلقات وتعديل بياناتهن
          </p>
        </div>
        <button
          suppressHydrationWarning
          onClick={openAddModal}
          disabled={circles.length === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer"
        >
          <LuUserPlus className="w-4 h-4" />
          <span>إضافة طالبة جديدة</span>
        </button>
      </div>

      {circles.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <LuTriangleAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>يرجى إضافة حلقة أولاً من صفحة الحلقات حتى تتمكن من تسجيل الطالبات وربطهن بها.</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-xs flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Circle Selector */}
          <div className="w-full sm:w-64">
            <CustomSelect
              value={selectedCircleId}
              onChange={(val) => setSelectedCircleId(val as string)}
              options={[
                { value: "", label: `جميع الحلقات (${circles.length})` },
                ...circles.map((c) => ({
                  value: c._id,
                  label: c.name,
                  badge: formatCircleDays(c.days),
                })),
              ]}
              icon={<LuBookOpen className="w-4 h-4 text-primary" />}
            />
          </div>

          {/* Search Box */}
          <div className="relative flex-1">
            <input
              suppressHydrationWarning
              type="text"
              placeholder="ابحث باسم الطالبة أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm focus:outline-none focus:border-primary bg-surface text-text-main"
            />
          </div>
        </div>

        <div className="text-xs text-text-muted font-semibold text-center sm:text-right">
          عدد الطالبات: <span className="text-primary font-bold">{students.length}</span>
        </div>
      </div>

      {/* Table of Students */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">جاري تحميل بيانات الطالبات...</div>
      ) : students.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-surface rounded-2xl sm:rounded-3xl border border-dashed border-surface-border space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-primary mx-auto">
            <LuGraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-text-main">لا توجد طالبات مطابقة للبحث</h3>
          <p className="text-xs text-text-muted">قم بإضافة طالبة جديدة أو تغيير فلاتر البحث.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl sm:rounded-3xl border border-surface-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm min-w-[500px]">
              <thead className="bg-beige/70 text-text-muted text-xs font-bold border-b border-surface-border">
                <tr>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 w-12">م</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6">اسم الطالبة</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6">الحلقة</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6">رقم الهاتف</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-center w-28">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-medium text-text-main">
                {students.map((student, idx) => (
                  <tr key={student._id} className="hover:bg-beige/40 transition-colors">
                    <td className="py-3 sm:py-4 px-3 sm:px-6 text-text-muted text-xs font-bold">{idx + 1}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6 font-bold text-text-main">
                      <div className="flex items-center gap-2">
                        <span>{student.name}</span>
                        {student.warningForRemoval && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                            ⚠️ تحذير بالحذف
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-primary-light text-primary text-xs font-bold">
                        {student.circleId?.name || "بدون حلقة"}
                      </span>
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6">
                      {student.phone ? (
                        <a
                          href={`https://wa.me/${student.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                        >
                          <FaWhatsapp className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span dir="ltr">{student.phone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleWarning(student)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                            student.warningForRemoval
                              ? "bg-amber-100 border-amber-300 text-amber-900"
                              : "border-surface-border text-text-muted hover:bg-beige"
                          }`}
                          title={student.warningForRemoval ? "إلغاء التحذير بالحذف" : "وضع تحذير بالحذف ⚠️"}
                        >
                          <LuTriangleAlert className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openEditModal(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-surface-border hover:bg-beige transition-colors cursor-pointer"
                        >
                          <LuPencil className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <LuTrash2 className="w-3 h-3" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-surface-border space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-bold text-text-main">
                {editingStudent ? "تعديل بيانات الطالبة" : "تسجيل طالبة جديدة"}
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
                <label className="text-xs font-bold text-text-main">اسم الطالبة *</label>
                <input
                  type="text"
                  placeholder="الاسم ثلاثي أو ثنائي..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm bg-surface"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">رقم الهاتف / الواتساب</label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm text-right bg-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">الحلقة *</label>
                <CustomSelect
                  placeholder="اختر الحلقة..."
                  value={circleId}
                  onChange={(val) => setCircleId(val as string)}
                  options={circles.map((c) => ({
                    value: c._id,
                    label: c.name,
                    badge: formatCircleDays(c.days),
                  }))}
                  icon={<LuBookOpen className="w-4 h-4 text-primary" />}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main">تاريخ الانضمام للحلقة</label>
                <input
                  type="date"
                  value={joinedAt}
                  onChange={(e) => setJoinedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border focus:outline-none focus:border-primary text-sm bg-surface font-mono"
                />
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main">
                  <input
                    type="checkbox"
                    checked={warningForRemoval}
                    onChange={(e) => setWarningForRemoval(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-border cursor-pointer"
                  />
                  <span>وضع علامة تحذير بالحذف (⚠️) في التقارير</span>
                </label>
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
                  {saving ? "جاري الحفظ..." : "حفظ الطالبة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
