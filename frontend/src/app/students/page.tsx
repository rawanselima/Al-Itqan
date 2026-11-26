"use client";

import { useState, useEffect } from "react";
import { useStudents, useCircles } from "@/hooks";
import { studentSchema, type StudentFormData } from "@/lib/schemas";
import { Button, InputField, SelectField, ModalForm, LoadingState, ConfirmDialog } from "@/components/ui";
import { CustomSelect } from "@/components/CustomSelect";
import {
  LuUserPlus,
  LuTriangleAlert,
  LuGraduationCap,
  LuPencil,
  LuTrash2,
  LuBookOpen,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";
import { formatCircleDays } from "@/lib/api";

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
  const {
    circles,
  } = useCircles();

  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    students,
    isPending,
    createStudent,
    updateStudent,
    deleteStudent,
    toggleWarning,
    isCreating,
    isUpdating,
    isDeleting,
    isTogglingWarning,
  } = useStudents({
    circleId: selectedCircleId || undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentFormData | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const openAddModal = () => {
    setEditingStudent({
      name: "",
      phone: "",
      circleId: selectedCircleId || (circles[0]?._id ?? ""),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent({
      _id: student._id,
      name: student.name,
      phone: student.phone || "",
      circleId: student.circleId?._id || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (data: StudentFormData) => {
    if (editingStudent?._id) {
      await updateStudent({ id: editingStudent._id, data });
    } else {
      await createStudent({
        ...data,
        joinedAt: new Date().toISOString().slice(0, 10),
        warningForRemoval: false,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    await deleteStudent(studentToDelete._id);
    setStudentToDelete(null);
  };

  const handleToggleWarning = async (student: Student) => {
    const newVal = !student.warningForRemoval;
    await toggleWarning({ id: student._id, warningForRemoval: newVal });
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
        <Button
          onClick={openAddModal}
          disabled={circles.length === 0}
          iconLeft={<LuUserPlus className="w-4 h-4" />}
          size="sm"
        >
          إضافة طالبة جديدة
        </Button>
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
            <LuSearch className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              suppressHydrationWarning
              type="text"
              placeholder="ابحث باسم الطالبة أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-9 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm focus:outline-none focus:border-primary bg-surface text-text-main"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                }}
                aria-label="مسح البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-beige cursor-pointer"
              >
                <LuX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-text-muted font-semibold text-center sm:text-right">
          عدد الطالبات: <span className="text-primary font-bold">{students.length}</span>
        </div>
      </div>

      {/* Table of Students */}
      {isPending ? (
        <LoadingState text="جاري تحميل بيانات الطالبات..." />
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
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleWarning(student)}
                          disabled={isTogglingWarning}
                          className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
                            student.warningForRemoval
                              ? "bg-amber-100 text-amber-600 ring-1 ring-amber-300 hover:bg-amber-200/70"
                              : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                          }`}
                          title={student.warningForRemoval ? "إلغاء التحذير بالحذف" : "وضع تحذير بالحذف ⚠️"}
                          aria-label={student.warningForRemoval ? "إلغاء التحذير بالحذف" : "وضع تحذير بالحذف"}
                        >
                          <LuTriangleAlert className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                          title="تعديل الطالبة"
                          aria-label="تعديل الطالبة"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(student)}
                          className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                          title="حذف الطالبة"
                          aria-label="حذف الطالبة"
                        >
                          <LuTrash2 className="w-4 h-4" />
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
      <ModalForm<StudentFormData>
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent?._id ? "تعديل بيانات الطالبة" : "تسجيل طالبة جديدة"}
        schema={studentSchema}
        defaultValues={editingStudent || undefined}
        onSubmit={handleSave}
        submitText="حفظ الطالبة"
        size="md"
        showCloseButton={true}
        loading={isCreating || isUpdating}
      >
        {(form) => (
          <>
            <InputField
              name="name"
              label="اسم الطالبة"
              placeholder="الاسم ثلاثي أو ثنائي..."
              control={form.control}
              required
            />

            <InputField
              name="phone"
              label="رقم الهاتف / الواتساب (اختياري)"
              type="tel"
              dir="ltr"
              placeholder="01xxxxxxxxx"
              control={form.control}
            />

            <SelectField
              name="circleId"
              label="الحلقة"
              placeholder="اختر الحلقة..."
              options={circles.map((c) => ({
                value: c._id,
                label: c.teacherName?.trim() || c.name,
                badge: formatCircleDays(c.days),
              }))}
              icon={<LuBookOpen className="w-4 h-4 text-primary" />}
              control={form.control}
              required
            />
          </>
        )}
      </ModalForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الطالبة"
        message={`هل أنتِ متأكدة من حذف الطالبة "${studentToDelete?.name || ""}"؟`}
        confirmText="نعم، حذف الطالبة"
        loading={isDeleting}
      />
    </div>
  );
}