"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuBookOpen,
  LuLayoutDashboard,
  LuLayers,
  LuUsers,
  LuClipboardCheck,
  LuBookOpenCheck,
  LuFileSpreadsheet,
  LuMenu,
  LuX,
  LuSettings,
} from "react-icons/lu";
import { api, Circle } from "@/lib/api";
import { SettingsModal } from "@/components/SettingsModal";

const navItems = [
  {
    name: "لوحة التحكم",
    href: "/",
    icon: <LuLayoutDashboard className="w-5 h-5 min-w-5 shrink-0" />,
  },
  {
    name: "الحلقات",
    href: "/circles",
    icon: <LuLayers className="w-5 h-5 min-w-5 shrink-0" />,
  },
  {
    name: "الطالبات",
    href: "/students",
    icon: <LuUsers className="w-5 h-5 min-w-5 shrink-0" />,
  },
  {
    name: "الـحضور والتسميع",
    href: "/attendance",
    icon: <LuClipboardCheck className="w-5 h-5 min-w-5 shrink-0" />,
  },
  {
    name: "متابعة الواجبات",
    href: "/homework",
    icon: <LuBookOpenCheck className="w-5 h-5 min-w-5 shrink-0" />,
  },
  {
    name: "التقارير الشهرية",
    href: "/reports",
    icon: <LuFileSpreadsheet className="w-5 h-5 min-w-5 shrink-0" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    api.getCircles().then(setCircles).catch(() => {});
  }, []);

  // Close drawer automatically on route navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 1. Mobile Top Header Bar (Visible on mobile/tablet, hidden on lg screens) */}
      <header className="no-print lg:hidden sticky top-0 z-30 bg-primary text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold text-base text-white">
            <LuBookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight">الإتقان</h1>
            <p className="text-[10px] text-white/70">نظام إدارة الحلقات</p>
          </div>
        </div>

        {/* Hamburger Menu Toggle Button */}
        <button
          suppressHydrationWarning
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="القائمة الرئيسية"
        >
          {isOpen ? <LuX className="w-5 h-5" /> : <LuMenu className="w-5 h-5" />}
        </button>
      </header>

      {/* 2. Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* 3. Sidebar Drawer (Slide-over on mobile, static pinned on desktop) */}
      <aside
        className={`no-print fixed inset-y-0 right-0 z-50 w-72 max-w-[80vw] bg-primary text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-l border-primary-hover lg:static lg:translate-x-0 lg:w-64 lg:min-w-[16rem] lg:shadow-xl shrink-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-10 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-inner shrink-0">
              <LuBookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">الإتقان</h1>
              <p className="text-xs text-white/70">نظام إدارة الحلقات القرآنية</p>
            </div>
          </div>

          {/* Close button inside drawer for mobile */}
          <button
            suppressHydrationWarning
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-hover text-white shadow-md translate-x-1 border-r-4 border-white font-bold"
                    : "text-white/80 hover:bg-primary-hover/50 hover:text-white"
                }`}
              >
                <span className={isActive ? "text-white" : "text-white/70"}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <LuSettings className="w-4 h-4" />
            <span>الإعدادات والإجازات</span>
          </button>
          <p className="text-center text-[11px] text-white/60">لوحة المشرف - أمل طاهر</p>
        </div>
      </aside>

      {/* Settings & Holidays Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        circles={circles}
      />
    </>
  );
}
