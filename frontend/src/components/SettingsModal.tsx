"use client";

import React, { useState, useEffect } from "react";
import { api, Circle, Holiday, Settings } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";
import {
  LuX,
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
  circles,
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

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadSettings();
      loadHolidays();
    }
  }, [isOpen, initialTab]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error("فشل تحميل الإعدادات:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const data = await api.getHolidays();
      setHolidays(data);
    } catch (err) {
      console.error("فشل تحميل الإجازات:", err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || "فشل حفظ الإعدادات");
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
    } catch (err: any) {
      setHolidayError(err.message || "فشل إضافة الإجازة");
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("هل أنتِ متأكدة من حذف هذه الإجازة؟")) return;
    try {
      await api.deleteHoliday(id);
      setHolidays((prev) => prev.filter((h) => h._id !== id));
    } catch (err: any) {
      alert(err.message || "فشل حذف الإجازة");
    }
  };

  if (!isOpen) return null;

  const circleOptions = [
    { value: "", label: "جميع الحلقات (إجازة عامة)" },
    ...circles.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-surface border border-surface-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              {activeTab === "settings" ? (
                <LuSettings className="w-5 h-5" />
              ) : (
                <LuCalendarOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-text-main">
                {activeTab === "settings" ? "إعدادات المنصة والتقارير" : "إدارة الإجازات والعطلات"}
              </h3>
              <p className="text-xs text-text-muted">
                {activeTab === "settings"
                  ? "تخصيص اسم المشرفة والرسائل الترحيبية ونصوص الواتساب"
                  : "تحديد أيام العطلات والإجازات الرسمية للحلقات"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-border bg-surface px-6 pt-2 gap-2">
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "settings" ? (
            /* TAB 1: SETTINGS */
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {loadingSettings ? (
                <div className="text-center py-8 text-text-muted">جاري تحميل الإعدادات...</div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">
                      اسم المشرفة (يظهر في مقدمة التقارير)
                    </label>
                    <input
                      type="text"
                      value={settings.supervisorName}
                      onChange={(e) =>
                        setSettings({ ...settings, supervisorName: e.target.value })
                      }
                      placeholder="مثال: امل طاهر"
                      className="w-full px-4 py-2.5 rounded-xl border border-surface-border bg-surface-hover/30 text-sm focus:outline-hidden focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">
                      مقدمة رسالة الواتساب (الدعاء والبسملة)
                    </label>
                    <textarea
                      rows={5}
                      value={settings.introText || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, introText: e.target.value })
                      }
                      placeholder="التقرير الأسبوعي والشهري&#10;‏﷽&#10;۝ إِنَّ اللَّهَ وَمَلائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ..."
                      className="w-full px-4 py-2.5 rounded-xl border border-surface-border bg-surface-hover/30 text-sm font-arabic focus:outline-hidden focus:border-primary leading-relaxed"
                    />
                    <p className="text-[11px] text-text-muted">
                      هذا النص يظهر في أول الرسالة مباشرة قبل أسماء الطالبات.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">
                      خاتمة رسالة الواتساب
                    </label>
                    <textarea
                      rows={3}
                      value={settings.outroText || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, outroText: e.target.value })
                      }
                      placeholder="جزاكم الله خيراً وبارك في همتكم العالية..."
                      className="w-full px-4 py-2.5 rounded-xl border border-surface-border bg-surface-hover/30 text-sm font-arabic focus:outline-hidden focus:border-primary"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {savingSettings ? (
                        <span>جاري الحفظ...</span>
                      ) : saveSuccess ? (
                        <>
                          <LuCheck className="w-4 h-4 text-emerald-300" />
                          <span>تم الحفظ بنجاح!</span>
                        </>
                      ) : (
                        <>
                          <LuSave className="w-4 h-4" />
                          <span>حفظ الإعدادات</span>
                        </>
                      )}
                    </button>
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
                  <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
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
                    <label className="text-xs font-bold text-text-main">سبب الإجازة (اختياري)</label>
                    <input
                      type="text"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      placeholder="مثال: إجازة عيد الفطر، ظروف طارئة..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-sm focus:outline-hidden focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-main">من تاريخ *</label>
                    <input
                      type="date"
                      value={newFrom}
                      onChange={(e) => setNewFrom(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-surface text-sm focus:outline-hidden focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-main">إلى تاريخ *</label>
                    <input
                      type="date"
                      value={newTo}
                      onChange={(e) => setNewTo(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-surface text-sm focus:outline-hidden focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={addingHoliday}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                  >
                    <LuPlus className="w-4 h-4" />
                    <span>{addingHoliday ? "جاري الإضافة..." : "حفظ الإجازة"}</span>
                  </button>
                </div>
              </form>

              {/* List of Holidays */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-muted">
                  قائمة الإجازات المسجلة ({holidays.length})
                </h4>

                {loadingHolidays ? (
                  <div className="text-center py-6 text-xs text-text-muted">جاري تحميل الإجازات...</div>
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
                          : circles.find((c) => c._id === h.circleId)?.name || "جميع الحلقات (عامة)";

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
                            onClick={() => handleDeleteHoliday(h._id)}
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
    </div>
  );
}
