"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Circle } from "@/lib/api";

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

  const currentDayName = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(new Date());

  // Filter circles that meet today
  const todaysCircles = circles.filter((c) =>
    c.days.some((d) => d.includes(currentDayName) || currentDayName.includes(d))
  );

  return (
    <div className="p-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-emerald-800 to-teal-700 text-white rounded-3xl p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/50 text-emerald-100 text-xs font-semibold backdrop-blur-sm">
            <span>📅</span>
            <span>{todayArabic}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">مرحباً بك في نظام الإتقان</h2>
          <p className="text-emerald-100 text-sm max-w-xl">
            إدارة الحلقات القرآنية، تسجيل الحضور والتسميع بأسبقية الحضور، ومتابعة الواجبات الأسبوعية والتقارير الشهرية بكل سهولة وإتقان.
          </p>
        </div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">إجمالي الحلقات</span>
            <p className="text-3xl font-bold text-slate-800">{loading ? "..." : circles.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
            📚
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">إجمالي الطالبات المسجلات</span>
            <p className="text-3xl font-bold text-slate-800">{loading ? "..." : studentsCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl font-bold">
            👩‍🎓
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">حلقات اليوم ({currentDayName})</span>
            <p className="text-3xl font-bold text-emerald-700">
              {loading ? "..." : todaysCircles.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
            ⏰
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/attendance"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              📋
            </div>
            <div>
              <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                تسجيل الحضور والتسميع
              </h4>
              <p className="text-xs text-slate-500 mt-1">تسجيل حضور حلقة اليوم وترتيب التسميع</p>
            </div>
          </Link>

          <Link
            href="/homework"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              ✍️
            </div>
            <div>
              <h4 className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                متابعة الواجبات
              </h4>
              <p className="text-xs text-slate-500 mt-1">تتبع أداء الواجب اليومي من السبت للخميس</p>
            </div>
          </Link>

          <Link
            href="/students"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              ➕
            </div>
            <div>
              <h4 className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                إضافة طالبة جديدة
              </h4>
              <p className="text-xs text-slate-500 mt-1">تسجيل طالبة جديدة وربطها بحلقتها</p>
            </div>
          </Link>

          <Link
            href="/reports"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              📊
            </div>
            <div>
              <h4 className="font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                التقرير الشهري والطباعة
              </h4>
              <p className="text-xs text-slate-500 mt-1">استخراج وطباعة تقرير الحضور والواجبات</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Today's Circles Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>حلقات اليوم ({currentDayName})</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {todaysCircles.length} حلقة
            </span>
          </h3>
          <Link href="/circles" className="text-sm font-semibold text-emerald-700 hover:underline">
            عرض كل الحلقات &larr;
          </Link>
        </div>

        {todaysCircles.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p>لا توجد حلقات مجدولة لليوم ({currentDayName}). يمكنك تصفح باقي الحلقات من القائمة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysCircles.map((circle) => (
              <div
                key={circle._id}
                className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-slate-800 text-base">{circle.name}</h4>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                      {circle.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    الطالبات المسجلات: <span className="font-bold text-slate-700">{circle.studentCount || 0}</span>
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-emerald-100">
                  <Link
                    href={`/attendance?circleId=${circle._id}`}
                    className="flex-1 py-2 text-center rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
                  >
                    تسجيل الحضور الآن
                  </Link>
                  <Link
                    href={`/homework?circleId=${circle._id}`}
                    className="flex-1 py-2 text-center rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
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
