"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Circle } from "@/lib/api";
import { Spinner, LoadingState } from "@/components/ui";
import {
  LuCalendar,
  LuBookOpen,
  LuGraduationCap,
  LuClock,
  LuClipboardCheck,
  LuPenTool,
  LuUserPlus,
  LuChartBar,
} from "react-icons/lu";

export default function DashboardPage() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [circlesData, studentsData] = await Promise.all([
          api.getCircles().catch(() => []),
          api.getStudents().catch(() => []),
        ]);
        setCircles(circlesData);
        setStudentsCount(studentsData.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const todayArabic = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const currentDayOfWeek = new Date().getDay(); // 0=الأحد ... 6=السبت
  const currentDayName = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(new Date());

  const todaysCircles = circles.filter((c) =>
    c.days.some((d) => {
      if (typeof d === "number") return d === currentDayOfWeek;
      const dStr = String(d);
      return dStr.includes(currentDayName) || currentDayName.includes(dStr);
    })
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-primary text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
            <LuCalendar className="w-3.5 h-3.5" />
            <span>{todayArabic}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">مرحباً بك في نظام الإتقان</h2>
          <p className="text-white/80 text-xs sm:text-sm max-w-xl">
            إدارة الحلقات القرآنية، تسجيل الحضور والتسميع بأسبقية الحضور، ومتابعة الواجبات الأسبوعية والتقارير الشهرية بكل سهولة وإتقان.
          </p>
        </div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-surface-border shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-medium text-text-muted">إجمالي الحلقات</span>
            <p className="text-2xl sm:text-3xl font-bold text-text-main">{loading ? <Spinner size="sm" /> : circles.length}</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center">
            <LuBookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-surface-border shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-medium text-text-muted">إجمالي الطالبات المسجلات</span>
            <p className="text-2xl sm:text-3xl font-bold text-text-main">{loading ? <Spinner size="sm" /> : studentsCount}</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center">
            <LuGraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-surface-border shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-medium text-text-muted">حلقات اليوم ({currentDayName})</span>
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {loading ? <Spinner size="sm" /> : todaysCircles.length}
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center">
            <LuClock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-text-main">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/attendance"
            className="group bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <LuClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-main group-hover:text-primary transition-colors text-sm sm:text-base">
                تسجيل الحضور والتسميع
              </h4>
              <p className="text-xs text-text-muted mt-1">تسجيل حضور حلقة اليوم وترتيب التسميع</p>
            </div>
          </Link>

          <Link
            href="/homework"
            className="group bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <LuPenTool className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-main group-hover:text-primary transition-colors text-sm sm:text-base">
                متابعة الواجبات
              </h4>
              <p className="text-xs text-text-muted mt-1">تتبع أداء الواجب اليومي من السبت للخميس</p>
            </div>
          </Link>

          <Link
            href="/students"
            className="group bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <LuUserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-main group-hover:text-primary transition-colors text-sm sm:text-base">
                إضافة طالبة جديدة
              </h4>
              <p className="text-xs text-text-muted mt-1">تسجيل طالبة جديدة وربطها بحلقتها</p>
            </div>
          </Link>

          <Link
            href="/reports"
            className="group bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <LuChartBar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-main group-hover:text-primary transition-colors text-sm sm:text-base">
                التقرير الشهري والطباعة
              </h4>
              <p className="text-xs text-text-muted mt-1">استخراج وطباعة تقرير الحضور والواجبات</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Today's Circles Section */}
      <div className="bg-surface rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-surface-border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-text-main flex items-center gap-2">
            <span>حلقات اليوم ({currentDayName})</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-light text-primary">
              {todaysCircles.length} حلقة
            </span>
          </h3>
          <Link href="/circles" className="text-xs sm:text-sm font-semibold text-primary hover:underline">
            عرض كل الحلقات &larr;
          </Link>
        </div>

        {loading ? (
          <LoadingState text="جاري تحميل حلقات اليوم..." />
        ) : todaysCircles.length === 0 ? (
          <div className="text-center py-8 text-text-muted bg-beige/60 rounded-2xl border border-dashed border-surface-border text-xs sm:text-sm">
            <p>لا توجد حلقات مجدولة لليوم ({currentDayName}). يمكنك تصفح باقي الحلقات من القائمة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysCircles.map((circle) => (
              <div
                key={circle._id}
                className="p-4 sm:p-5 rounded-2xl border border-primary-subtle bg-primary-light/40 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-text-main text-sm sm:text-base">{circle.name}</h4>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-white">
                      {circle.time}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    الطالبات المسجلات: <span className="font-bold text-text-main">{circle.studentCount || 0}</span>
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-primary-subtle">
                  <Link
                    href={`/attendance?circleId=${circle._id}`}
                    className="flex-1 py-2 text-center rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
                  >
                    تسجيل الحضور
                  </Link>
                  <Link
                    href={`/homework?circleId=${circle._id}`}
                    className="flex-1 py-2 text-center rounded-xl bg-surface border border-surface-border text-text-main text-xs font-bold hover:bg-beige transition-colors"
                  >
                    الواجبات
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
