"use client";

import { useState } from "react";
import { useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { useCircles } from "@/hooks";
import { getDayName, type Circle } from "@/lib/api";
import { circleSchema, type CircleFormData } from "@/lib/schemas";
import {
  Button,
  InputField,
  TextareaField,
  ModalForm,
  LoadingState,
  ConfirmDialog,
} from "@/components/ui";
import { LuPlus, LuBookOpen, LuPencil, LuTrash2, LuCheck } from "react-icons/lu";

const CIRCLE_DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 6, label: "السبت" },
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
];

const ARABIC_DAY_TO_NUMBER: Record<string, number> = {
  "الأحد": 0, "الاحد": 0, "أحد": 0, "احد": 0,
  "الإثنين": 1, "الاثنين": 1, "إثنين": 1, "اثنين": 1,
  "الثلاثاء": 2, "الثلاثا": 2, "ثلاثاء": 2,
  "الأربعاء": 3, "الاربعاء": 3, "أربعاء": 3, "اربعاء": 3,
  "الخميس": 4, "خميس": 4,
  "الجمعة": 5, "جمعة": 5, "الجمعه": 5,
  "السبت": 6, "سبت": 6,
};

function normalizeDaysToNumbers(days?: Array<string | number>): number[] {
  if (!Array.isArray(days)) return [];
  const normalized: number[] = [];
  for (const d of days) {
    let num: number | null = null;
    if (typeof d === "number" && d >= 0 && d <= 6) {
      num = d;
    } else if (typeof d === "string") {
      const trimmed = d.trim();
      if (trimmed in ARABIC_DAY_TO_NUMBER) {
        num = ARABIC_DAY_TO_NUMBER[trimmed];
      } else {
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 6) {
          num = parsed;
        }
      }
    }
    if (num !== null && !normalized.includes(num)) {
      normalized.push(num);
    }
  }
  return normalized;
}

function CircleDaysField({
  control,
  setValue,
  error,
}: {
  control: Control<CircleFormData>;
  setValue: UseFormSetValue<CircleFormData>;
  error?: string;
}) {
  const watchedDays = useWatch({ control, name: "days" });
  const selectedDays = normalizeDaysToNumbers(
    watchedDays as Array<string | number> | undefined,
  );

  const toggleDay = (dayValue: number) => {
    const nextDays = selectedDays.includes(dayValue)
      ? selectedDays.filter((d) => d !== dayValue)
      : [...selectedDays, dayValue];
    setValue("days", nextDays, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-text-main">
        أيام الحلقة <span className="text-rose-500">*</span>
      </label>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {CIRCLE_DAY_OPTIONS.map((day) => {
          const isSelected = selectedDays.includes(day.value);
          return (
            <Button
              key={day.value}
              type="button"
              variant={isSelected ? "primary" : "secondary"}
              size="xs"
              aria-pressed={isSelected}
              className="py-2 px-2 text-xs"
              iconLeft={isSelected ? <LuCheck className="w-3.5 h-3.5" /> : undefined}
              onClick={() => toggleDay(day.value)}
            >
              {day.label}
            </Button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-rose-600 font-bold" role="alert">
          • {error}
        </p>
      )}
    </div>
  );
}

export default function CirclesPage() {
  const {
    circles,
    isPending,
    createCircle,
    updateCircle,
    deleteCircle,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCircles();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<CircleFormData | null>(
    null,
  );
  const [circleToDelete, setCircleToDelete] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const openAddModal = () => {
    setEditingCircle({
      name: "",
      teacherName: "",
      days: [1, 4],
      time: "04:00 م",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (circle: Circle | CircleFormData) => {
    const displayName = circle.teacherName?.trim() || circle.name || "";
    setEditingCircle({
      ...circle,
      name: displayName,
      teacherName: displayName,
      days: normalizeDaysToNumbers(circle.days),
      notes: circle.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (data: CircleFormData) => {
    const teacherTitle = data.name.trim();
    const payload = {
      ...data,
      name: teacherTitle,
      teacherName: teacherTitle,
      days: normalizeDaysToNumbers(data.days),
    };
    if (editingCircle?._id) {
      await updateCircle({ id: editingCircle._id, data: payload });
    } else {
      await createCircle(payload);
    }
  };

  const handleConfirmDelete = async () => {
    if (!circleToDelete) return;
    await deleteCircle(circleToDelete._id);
    setCircleToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">
            إدارة الحلقات
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            إضافة وتعديل حلقات التحفيظ وتحديد أيام وساعة الانعقاد
          </p>
        </div>
        <Button
          onClick={openAddModal}
          iconLeft={<LuPlus className="w-4 h-4" />}
          size="sm"
        >
          إضافة حلقة جديدة
        </Button>
      </div>

      {/* Content */}
      {isPending ? (
        <LoadingState text="جاري تحميل الحلقات..." />
      ) : circles.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-surface rounded-2xl sm:rounded-3xl border border-dashed border-surface-border space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-primary mx-auto">
            <LuBookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-text-main">
            لا توجد حلقات مسجلة حتى الآن
          </h3>
          <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto">
            ابدأ بإضافة الحلقة الأولى لتتمكن من تسجيل الطالبات ومتابعة الحضور
            والورد.
          </p>
          <Button
            onClick={openAddModal}
            size="sm"
            iconLeft={<LuPlus className="w-4 h-4" />}
          >
            إضافة الحلقة الأولى
          </Button>
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
                    <span className="text-[11px] text-text-muted font-bold">
                      المعلمة
                    </span>
                    <h3 className="font-extrabold text-base sm:text-lg text-text-main group-hover:text-primary transition-colors">
                      {circle.teacherName?.trim() || circle.name}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-light text-primary">
                    {circle.time}
                  </span>
                </div>

                {/* Days Badges */}
                <div className="space-y-1.5">
                  <span className="text-xs text-text-muted font-medium">
                    أيام الحلقه:
                  </span>
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
                <Button
                  variant="secondary"
                  size="xs"
                  className="flex-1"
                  onClick={() => openEditModal(circle)}
                  iconLeft={<LuPencil className="w-3.5 h-3.5" />}
                >
                  تعديل
                </Button>
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() =>
                    setCircleToDelete({
                      _id: circle._id,
                      name: circle.teacherName?.trim() || circle.name,
                    })
                  }
                  iconLeft={<LuTrash2 className="w-4 h-4" />}
                  title="حذف الحلقة"
                >
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <ModalForm<CircleFormData>
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCircle?._id ? "تعديل بيانات الحلقة" : "إضافة حلقة جديدة"}
        schema={circleSchema}
        defaultValues={editingCircle || undefined}
        onSubmit={handleSave}
        submitText="حفظ البيانات"
        size="md"
        showCloseButton={true}
        loading={isCreating || isUpdating}
      >
        {(form) => (
          <>
            <InputField
              name="name"
              label="اسم المعلمة"
              placeholder="مثال: أ/ سماح أبو الخير"
              control={form.control}
              required
            />

            <CircleDaysField
              control={form.control}
              setValue={form.setValue}
              error={form.formState.errors.days?.message as string | undefined}
            />

            <InputField
              name="time"
              label="ساعة وتوقيت الحلقة"
              placeholder="مثال: 04:30 عصراً أو 05:00 م"
              control={form.control}
              required
            />

            <TextareaField
              name="notes"
              label="ملاحظات (اختياري)"
              placeholder="أي تفاصيل خاصة بالحلقة أو المستوى..."
              rows={2}
              control={form.control}
            />
          </>
        )}
      </ModalForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(circleToDelete)}
        onClose={() => setCircleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الحلقة"
        message={`هل أنتِ متأكدة من حذف حلقة المعلمة "${circleToDelete?.name || ""}"؟ سيتم تعطيل جميع الطالبات المرتبطات بها.`}
        confirmText="نعم، حذف الحلقة"
        loading={isDeleting}
      />
    </div>
  );
}
