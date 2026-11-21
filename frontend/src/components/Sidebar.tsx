"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    name: "لوحة التحكم",
    href: "/",
    icon: (
      <svg className="w-5 h-5 min-w-5 shrink-0" width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: "الحلقات",
    href: "/circles",
    icon: (
      <svg className="w-5 h-5 min-w-5 shrink-0" width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: "الطالبات",
    href: "/students",
    icon: (
      <svg className="w-5 h-5 min-w-5 shrink-0" width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: "الـحضور والتسميع",
    href: "/attendance",
    icon: (
      <svg className="w-5 h-5 min-w-5 shrink-0" width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: "متابعة الواجبات",
    href: "/homework",
    icon: (
      <svg className="w-5 h-5 min-w-5 shrink-0" width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: "التقارير الشهرية",
    href: "/reports",
    icon: (
      <svg className="w-5 h-5 min-w-5 shrink-0" width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print w-64 min-w-[16rem] bg-emerald-900 text-white min-h-screen flex flex-col shadow-xl z-20 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-emerald-800/80 flex items-center gap-3">
        <div className="w-10 h-10 min-w-10 rounded-xl bg-emerald-700/80 flex items-center justify-center font-bold text-xl text-emerald-200 shadow-inner shrink-0">
          📖
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wide text-emerald-50">الإتقان</h1>
          <p className="text-xs text-emerald-300">نظام إدارة الحلقات القرآنية</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20 translate-x-1"
                  : "text-emerald-100/80 hover:bg-emerald-800/60 hover:text-white"
              }`}
            >
              <span className={isActive ? "text-emerald-200" : "text-emerald-300"}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-emerald-800/80 text-center">
        <p className="text-xs text-emerald-400">لوحة المشرف - جاهز للعمل</p>
      </div>
    </aside>
  );
}
