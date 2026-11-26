"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
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
  icon,
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  }>({ top: 0, left: 0, width: 160, placement: "bottom" });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const computeMenuPosition = useCallback(
    (menuHeight?: number) => {
      if (!triggerRef.current) return null;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const minWidth = variant === "status" ? 155 : Math.max(triggerRect.width, 180);
      const menuWidth = Math.min(minWidth, viewportWidth - 32);

      // Align right edge with trigger right edge in RTL, falling back gracefully within viewport
      let left = triggerRect.right - menuWidth;
      if (left + menuWidth > viewportWidth - 16) {
        left = viewportWidth - menuWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }

      const estimatedHeight =
        menuHeight ?? Math.min(Math.max(options.length, 1) * 38 + 16, 256);
      const spaceBelow = viewportHeight - triggerRect.bottom - 12;
      const spaceAbove = triggerRect.top - 12;

      const shouldFlipUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const placement: "bottom" | "top" = shouldFlipUp ? "top" : "bottom";
      const top = shouldFlipUp
        ? Math.max(12, triggerRect.top - estimatedHeight - 6)
        : triggerRect.bottom + 6;

      return { top, left, width: menuWidth, placement };
    },
    [options.length, variant]
  );

  // Refine position synchronously before browser paint using actual rendered menu height
  useLayoutEffect(() => {
    if (isOpen && menuRef.current) {
      const actualHeight = menuRef.current.getBoundingClientRect().height;
      const refined = computeMenuPosition(actualHeight);
      if (refined) {
        setMenuPos(refined);
      }
    }
  }, [isOpen, computeMenuPosition]);

  // Click outside & Escape handling
  useEffect(() => {
    if (!isOpen && !isClosing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    // Close on outer scroll so dropdown doesn't detach
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return; // Allow scrolling inside the menu itself
      }
      handleClose();
    };

    const handleResize = () => {
      handleClose();
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
  }, [isOpen, isClosing]);

  const handleClose = () => {
    if (disabled || isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 130); // Match animation duration
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      handleClose();
    } else {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      const initialPos = computeMenuPosition();
      if (initialPos) {
        setMenuPos(initialPos);
      }
      setIsClosing(false);
      setIsOpen(true);
    }
  };

  const handleSelect = (val: T) => {
    onChange(val);
    handleClose();
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
          ref={triggerRef}
          suppressHydrationWarning
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-label={ariaLabel || `الحالة: ${selectedOption?.label || valStr}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
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

        {(isOpen || isClosing) && mounted && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                dir="rtl"
                className={`bg-white border border-[#E6E9E2] rounded-2xl shadow-2xl p-1.5 space-y-0.5 ${
                  isClosing
                    ? "dropdown-out"
                    : menuPos.placement === "top"
                    ? "dropdown-in-up"
                    : "dropdown-in-down"
                } ${menuClassName}`}
                style={{
                  position: "fixed",
                  top: `${menuPos.top}px`,
                  left: `${menuPos.left}px`,
                  width: `${menuPos.width}px`,
                  zIndex: 99999,
                }}
                role="listbox"
                aria-label={ariaLabel}
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
                      role="option"
                      aria-selected={isSelected}
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
        ref={triggerRef}
        suppressHydrationWarning
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
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

      {(isOpen || isClosing) && mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              dir="rtl"
              className={`max-h-64 overflow-y-auto bg-white border border-[#E6E9E2] rounded-2xl shadow-2xl p-1.5 space-y-0.5 ${
                isClosing
                  ? "dropdown-out"
                  : menuPos.placement === "top"
                  ? "dropdown-in-up"
                  : "dropdown-in-down"
              } ${menuClassName}`}
              style={{
                position: "fixed",
                top: `${menuPos.top}px`,
                left: `${menuPos.left}px`,
                width: `${menuPos.width}px`,
                zIndex: 99999,
              }}
              role="listbox"
              aria-label={ariaLabel}
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
                      role="option"
                      aria-selected={isSelected}
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