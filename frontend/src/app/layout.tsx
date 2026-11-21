import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام الإتقان | إدارة الحلقات القرآنية",
  description: "نظام متكامل لإدارة الحلقات القرآنية، تتبع الحضور والتسميع، ومتابعة الواجبات اليومية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full flex bg-slate-50 text-slate-800 antialiased font-sans">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
