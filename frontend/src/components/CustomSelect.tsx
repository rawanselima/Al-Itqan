"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { LuChevronDown, LuCheck } from "react-icons/lu";

export interface DropdownOption<T = string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  dotColor?: string;
}

const DEFAULT_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  حاضرة: {
    bg: "bg-[#EBF4EB]",
    text: "text-[#184E3D]",
    border: "border-[#d2e3dc]",
    dot: "bg-[#184E3D]",
  },
  غائبة: {
    bg: "bg-[#F9EEEB]",
    text: "text-[#A66B61]",
    border: "border-[#f2dedb]",
    dot: "bg-[#A66B61]",
  },
  معتذرة: {
    bg: "bg-[#F5F0E1]",
    text: "text-[#8A611C]",
    border: "border-[#e8dfc7]",
    dot: "bg-[#8A611C]",
  },
  "لم يُسجّل": {
    bg: "bg-[#FAFAF7]",
    text: "text-[#7C857D]",
    border: "border-[#E6E9E2]",
    dot: "bg-[#7C857D]",
  },
};

interface CustomSelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  variant?: "default" | "status" | "compact";
  direction?: "auto" | "down" | "up";
  icon?: React.ReactNode;
  "aria-label"?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "اختر...",
  disabled = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  variant = "default",
  direction = "auto",
  icon,
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    right: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update fixed position of the floating menu
  const updateMenuPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const estHeight = variant === "status" ? 160 : Math.min(240, options.length * 42 + 20);
    const spaceBelow = window.innerHeight - rect.bottom;

    // Prefer downward unless very close to viewport bottom
    const shouldOpenUpward =
      direction === "up" ||
      (direction === "auto" && spaceBelow < estHeight + 10 && rect.top > estHeight);

    let top = shouldOpenUpward
      ? rect.top - estHeight - 4
      : rect.bottom + 4;

    if (top < 8) top = 8;

    // Align with right edge in RTL
    const right = Math.max(8, window.innerWidth - rect.right);
    const width = Math.max(variant === "status" ? 140 : 200, rect.width);

    setMenuCoords({
      top,
      right,
      width,
    });
  };

  // Click outside & Escape handling
  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    // Close on outer scroll so dropdown doesn't detach
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return; // Allow scrolling inside the menu itself
      }
      setIsOpen(false);
    };

    const handleResize = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  // 1. STATUS VARIANT (Used for Attendance pills: حاضرة، غائبة، معتذرة، لم يُسجّل)
  if (variant === "status") {
    const valStr = String(value);
    const color =
      DEFAULT_STATUS_COLORS[valStr] || {
        bg: "bg-[#FAFAF7]",
        text: "text-[#7C857D]",
        border: "border-[#E6E9E2]",
        dot: "bg-[#7C857D]",
      };

    return (
      <div
        ref={containerRef}
        className={`relative inline-block text-right ${className}`}
      >
        <button
          suppressHydrationWarning
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-label={ariaLabel || `الحالة: ${selectedOption?.label || valStr}`}
          className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
            color.bg
          } ${color.text} ${color.border} ${
            disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-xs active:scale-98"
          } ${triggerClassName}`}
        >
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />
            <span>{selectedOption?.label || valStr}</span>
          </span>
          <LuChevronDown
            className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && mounted && menuCoords && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                style={{
                  position: "fixed",
                  top: `${menuCoords.top}px`,
                  right: `${menuCoords.right}px`,
                  minWidth: `${menuCoords.width}px`,
                  zIndex: 99999,
                }}
                className={`bg-white border border-[#E6E9E2] rounded-2xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
              >
                {options.map((opt) => {
                  const optColor = DEFAULT_STATUS_COLORS[String(opt.value)] || {
                    bg: "bg-[#FAFAF7]",
                    text: "text-[#7C857D]",
                    border: "border-[#E6E9E2]",
                    dot: "bg-[#7C857D]",
                  };
                  const isSelected = opt.value === value;

                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-right ${
                        isSelected
                          ? `${optColor.bg} ${optColor.text}`
                          : `text-[#263C32] hover:${optColor.bg} hover:${optColor.text}`
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${optColor.dot} shrink-0`} />
                        <span>{opt.label}</span>
                      </span>
                      {isSelected && <LuCheck className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>,
              document.body
            )
          : null}
      </div>
    );
  }

  // 2. DEFAULT / FORM VARIANT (Circles, Months, General filters)
  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-right ${className}`}
    >
      <button
        suppressHydrationWarning
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[#E6E9E2] bg-white text-xs sm:text-sm font-bold text-[#184E3D] hover:border-[#184E3D]/40 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#184E3D]/15 ${
          disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-[#7C857D] shrink-0">{icon}</span>}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F6F5F0] text-[#7C857D] font-medium shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <LuChevronDown
          className={`w-4 h-4 text-[#7C857D] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && mounted && menuCoords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: `${menuCoords.top}px`,
                right: `${menuCoords.right}px`,
                width: `${menuCoords.width}px`,
                zIndex: 99999,
              }}
              className={`max-h-64 overflow-y-auto bg-white border border-[#E6E9E2] rounded-2xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
            >
              {options.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#7C857D]">
                  لا توجد خيارات متاحة
                </div>
              ) : (
                options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer text-right ${
                        isSelected
                          ? "bg-[#EBF4EB] text-[#184E3D]"
                          : "text-[#263C32] hover:bg-[#F6F5F0] hover:text-[#184E3D]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        {opt.dotColor && (
                          <span
                            className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0`}
                          />
                        )}
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F6F5F0] text-[#7C857D] font-medium shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <LuCheck className="w-4 h-4 text-[#184E3D] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default CustomSelect;
