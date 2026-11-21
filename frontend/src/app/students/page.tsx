"use client";

import { useEffect, useState } from "react";
import { api, Circle } from "@/lib/api";

interface Student {
  _id: string;
  name: string;
  phone: string;
  circleId: {
    _id: string;
    name: string;
    days?: string[];
    time?: string;
  };
  isActive: boolean;
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
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setPhone(student.phone || "");
    setCircleId(student.circleId?._id || "");
    setError("");
    setIsModalOpen(true);
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
        });
      } else {
        await api.createStudent({
          name,
          phone,
          circleId,
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">إدارة الطالبات</h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل الطالبات وربطهن بالحلقات وتعديل بياناتهن
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={circles.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm shadow-md hover:bg-emerald-800 transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>➕</span>
          <span>إضافة طالبة جديدة</span>
        </button>
      </div>

      {circles.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          ⚠️ يرجى إضافة حلقة أولاً من صفحة الحلقات حتى تتمكن من تسجيل الطالبات وربطهن بها.
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Circle Selector */}
          <select
            value={selectedCircleId}
            onChange={(e) => setSelectedCircleId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="">جميع الحلقات ({circles.length})</option>
            {circles.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.days.join("، ")})
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث باسم الطالبة أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          عدد الطالبات: <span className="text-emerald-700 font-bold">{students.length}</span>
        </div>
      </div>

      {/* Table of Students */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">جاري تحميل بيانات الطالبات...</div>
      ) : students.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="text-4xl">👩‍🎓</div>
          <h3 className="text-base font-bold text-slate-700">لا توجد طالبات مطابقة للبحث</h3>
          <p className="text-xs text-slate-500">قم بإضافة طالبة جديدة أو تغيير فلاتر البحث.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">م</th>
                  <th className="py-4 px-6">اسم الطالبة</th>
                  <th className="py-4 px-6">الحلقة</th>
                  <th className="py-4 px-6">رقم الهاتف</th>
                  <th className="py-4 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {students.map((student, idx) => (
                  <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 text-slate-400 text-xs font-bold">{idx + 1}</td>
                    <td className="py-4 px-6 font-bold text-slate-800">{student.name}</td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold">
                        {student.circleId?.name || "بدون حلقة"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {student.phone ? (
                        <a
                          href={`https://wa.me/${student.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline"
                        >
                          <span>💬</span>
                          <span dir="ltr">{student.phone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          حذف
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingStudent ? "تعديل بيانات الطالبة" : "تسجيل طالبة جديدة"}
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
                <label className="text-xs font-bold text-slate-700">اسم الطالبة *</label>
                <input
                  type="text"
                  placeholder="الاسم ثلاثي أو ثنائي..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">رقم الهاتف / الواتساب</label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">الحلقة *</label>
                <select
                  value={circleId}
                  onChange={(e) => setCircleId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm bg-white"
                  required
                >
                  <option value="">اختر الحلقة...</option>
                  {circles.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.days.join("، ")})
                    </option>
                  ))}
                </select>
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
