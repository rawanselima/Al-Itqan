"use client";

import React, { useState, useEffect } from "react";
import { api, Circle, Holiday, Settings } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import { Dialog, Button, InputField, TextareaField, LoadingState, ConfirmDialog } from "@/components/ui";
import { showToast } from "@/lib/toast";
import {
  LuSettings,
  LuCalendarOff,
  LuSave,
  LuTrash2,
  LuPlus,
  LuCheck,
} from "react-icons/lu";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  circles: Circle[];
  initialTab?: "settings" | "holidays";
}

export function SettingsModal({
  isOpen,
  onClose,
  circles = [],
  initialTab = "settings",
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "holidays">(initialTab);

  // Settings State
  const [settings, setSettings] = useState<Settings>({
    supervisorName: "امل طاهر",
    introText: "",
    outroText: "",
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Holidays State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [newCircleId, setNewCircleId] = useState<string>("");
  const [newFrom, setNewFrom] = useState<string>("");
  const [newTo, setNewTo] = useState<string>("");
  const [newReason, setNewReason] = useState<string>("");
  const [holidayError, setHolidayError] = useState<string>("");
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState(false);

  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }

  // Load settings & holidays when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoadingSettings(true);
      setLoadingHolidays(true);
      try {
        const [settingsData, holidaysData] = await Promise.all([
          api.getSettings(),
          api.getHolidays(),
        ]);
        if (!cancelled) {
          setSettings(settingsData);
          setHolidays(holidaysData);
        }
      } catch (err) {
        console.error("فشل تحميل الإعدادات أو الإجازات:", err);
      } finally {
        if (!cancelled) {
          setLoadingSettings(false);
          setLoadingHolidays(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      showToast.error(err instanceof Error ? err.message : "فشل حفظ الإعدادات");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolidayError("");

    if (!newFrom || !newTo) {
      setHolidayError("يرجى تحديد تاريخ البداية وتاريخ النهاية");
      return;
    }
    if (newFrom > newTo) {
      setHolidayError("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية");
      return;
    }

    try {
      setAddingHoliday(true);
      const created = await api.createHoliday({
        circleId: newCircleId ? newCircleId : null,
        from: newFrom,
        to: newTo,
        reason: newReason.trim(),
      });
      setHolidays((prev) => [...prev, created].sort((a, b) => a.from.localeCompare(b.from)));
      setNewFrom("");
      setNewTo("");
      setNewReason("");
      setNewCircleId("");
    } catch (err: unknown) {
      setHolidayError(err instanceof Error ? err.message : "فشل إضافة الإجازة");
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleConfirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    try {
      setDeletingHoliday(true);
      await api.deleteHoliday(holidayToDelete._id);
      setHolidays((prev) => prev.filter((h) => h._id !== holidayToDelete._id));
      showToast.success("تم حذف الإجازة بنجاح ✓");
      setHolidayToDelete(null);
    } catch (err: unknown) {
      showToast.error(err instanceof Error ? err.message : "فشل حذف الإجازة");
    } finally {
      setDeletingHoliday(false);
    }
  };

  const maybeWrapped = circles as unknown as { circles?: Circle[] };
  const safeCircles: Circle[] = Array.isArray(circles)
    ? circles
    : Array.isArray(maybeWrapped?.circles)
    ? maybeWrapped.circles
    : [];

  const circleOptions = [
    { value: "", label: "جميع الحلقات (إجازة عامة)" },
    ...safeCircles.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === "settings" ? "إعدادات المنصة والتقارير" : "إدارة الإجازات والعطلات"}
      size="lg"
      showCloseButton={true}
      className="h-[88vh]"
      bodyClassName="p-0 flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tab Navigation */}
        <div className="flex border-b border-surface-border bg-surface px-6 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <LuSettings className="w-4 h-4" />
            <span>نصوص التقارير والمشرفة</span>
          </button>
          <button
            onClick={() => setActiveTab("holidays")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "holidays"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <LuCalendarOff className="w-4 h-4" />
            <span>الإجازات الرسمية ({holidays.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
          {activeTab === "settings" ? (
            /* TAB 1: SETTINGS */
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {loadingSettings ? (
                <LoadingState text="جاري تحميل الإعدادات..." />
              ) : (
                <>
                  <div className="space-y-1.5">
                    <InputField
                      label="اسم المشرفة (يظهر في مقدمة التقارير)"
                      name="supervisorName"
                      value={settings.supervisorName}
                      onChange={(e) => setSettings({ ...settings, supervisorName: e.target.value })}
                      placeholder="مثال: امل طاهر"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <TextareaField
                      label="مقدمة رسالة الواتساب (الدعاء والبسملة)"
                      name="introText"
                      value={settings.introText || ""}
                      onChange={(e) => setSettings({ ...settings, introText: e.target.value })}
                      placeholder="التقرير الأسبوعي والشهري&#10;‏﷽&#10;۝ إِنَّ اللَّهَ وَمَلائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ..."
                      rows={6}
                      autoResize
                      className="font-arabic leading-relaxed"
                    />
                    <p className="text-[11px] text-text-muted">
                      هذا النص يظهر في أول الرسالة مباشرة قبل أسماء الطالبات.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <TextareaField
                      label="خاتمة رسالة الواتساب"
                      name="outroText"
                      value={settings.outroText || ""}
                      onChange={(e) => setSettings({ ...settings, outroText: e.target.value })}
                      placeholder="جزاكم الله خيراً وبارك في همتكم العالية..."
                      rows={4}
                      autoResize
                      className="font-arabic"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      iconLeft={savingSettings ? undefined : <LuSave className="w-4 h-4" />}
                      loading={savingSettings}
                    >
                      {saveSuccess ? (
                        <>
                          <LuCheck className="w-4 h-4 text-emerald-300" />
                          <span>تم الحفظ بنجاح!</span>
                        </>
                      ) : (
                        "حفظ الإعدادات"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          ) : (
            /* TAB 2: HOLIDAYS */
            <div className="space-y-6">
              {/* Form to Add Holiday */}
              <form
                onSubmit={handleAddHoliday}
                className="p-4 rounded-2xl bg-surface-hover/40 border border-surface-border space-y-3"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                  <LuPlus className="w-4 h-4 text-primary" />
                  <span>إضافة إجازة أو عطلة جديدة</span>
                </div>

                {holidayError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
                    {holidayError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-main">الحلقة المتأثرة</label>
                    <CustomSelect
                      value={newCircleId}
                      onChange={setNewCircleId}
                      options={circleOptions}
                    />
                  </div>
                  <div className="space-y-1">
                    <InputField
                      label="سبب الإجازة (اختياري)"
                      name="reason"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      placeholder="مثال: إجازة عيد الفطر، ظروف طارئة..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <InputField
                      label="من تاريخ"
                      name="from"
                      type="date"
                      value={newFrom}
                      onChange={(e) => setNewFrom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <InputField
                      label="إلى تاريخ"
                      name="to"
                      type="date"
                      value={newTo}
                      onChange={(e) => setNewTo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    type="submit"
                    disabled={addingHoliday}
                    iconLeft={<LuPlus className="w-4 h-4" />}
                    loading={addingHoliday}
                  >
                    {addingHoliday ? "جاري الإضافة..." : "حفظ الإجازة"}
                  </Button>
                </div>
              </form>

              {/* List of Holidays */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-muted">
                  قائمة الإجازات المسجلة ({holidays.length})
                </h4>

                {loadingHolidays ? (
                  <LoadingState text="جاري تحميل الإجازات..." size="md" className="py-6" />
                ) : holidays.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl border border-dashed border-surface-border text-xs text-text-muted">
                    لا توجد أي إجازات مسجلة حالياً.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {holidays.map((h) => {
                      const circleName =
                        typeof h.circleId === "object" && h.circleId !== null
                          ? h.circleId.name
                          : safeCircles.find((c) => c._id === h.circleId)?.name || "جميع الحلقات (عامة)";

                      return (
                        <div
                          key={h._id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-surface-border hover:border-primary/30 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  !h.circleId
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {circleName}
                              </span>
                              {h.reason && (
                                <span className="text-xs font-bold text-text-main">
                                  {h.reason}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted">
                              من <span className="font-semibold text-text-main">{h.from}</span> إلى{" "}
                              <span className="font-semibold text-text-main">{h.to}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHolidayToDelete(h)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="حذف الإجازة"
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Holiday Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(holidayToDelete)}
        onClose={() => setHolidayToDelete(null)}
        onConfirm={handleConfirmDeleteHoliday}
        title="تأكيد حذف الإجازة"
        message={`هل أنتِ متأكدة من حذف الإجازة (${holidayToDelete?.from || ""} إلى ${holidayToDelete?.to || ""})؟`}
        confirmText="نعم، حذف الإجازة"
        loading={deletingHoliday}
      />
    </Dialog>
  );
}