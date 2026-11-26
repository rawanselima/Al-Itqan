"use client";

import React from "react";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-3.5 h-3.5 border-2",
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-11 h-11 border-[3.5px]",
  xl: "w-14 h-14 border-4",
};

/**
 * مؤشر تحميل مخصص متناسق مع هوية منصة الإتقان
 */
export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="جاري التحميل"
      className={`inline-block rounded-full border-[#d2e3dc] border-t-[#184E3D] animate-spin shrink-0 ${sizeMap[size]} ${className}`}
    />
  );
}

interface LoadingStateProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * حالة تحميل موحدة بتصميم أنيق في منتصف المحتوى
 */
export function LoadingState({
  text = "جاري التحميل...",
  size = "lg",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 px-4 text-center ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#184E3D]/10 blur-sm scale-125" />
        <Spinner size={size} className="relative" />
      </div>
      {text && (
        <p className="text-xs sm:text-sm font-bold text-[#64756D] animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
