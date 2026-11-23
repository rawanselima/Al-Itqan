import type { Metadata } from "next";
import { Baloo_Bhaijaan_2 } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { Providers } from "./providers";
import "./globals.css";

const baloo = Baloo_Bhaijaan_2({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

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
    <html lang="ar" dir="rtl" className={`h-full ${baloo.variable}`} suppressHydrationWarning>
      <body className={`min-h-screen flex flex-col lg:flex-row bg-beige text-text-main antialiased ${baloo.className}`} suppressHydrationWarning>
        {/* Responsive Navigation / Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto font-sans bg-beige w-full">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
