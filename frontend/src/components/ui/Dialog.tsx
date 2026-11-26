"use client";

import { ReactNode, forwardRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  bodyClassName?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeClasses = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[95vw]",
};

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      size = "md",
      className = "",
      bodyClassName = "p-5 sm:p-6 overflow-y-auto flex-1 min-h-0",
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      setMounted(true);
      return () => {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
        }
        document.body.style.overflow = "";
      };
    }, []);

    useEffect(() => {
      if (!mounted) return;

      if (isOpen) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setShouldRender(true);
        setIsClosing(false);
        previousActiveElement.current = document.activeElement as HTMLElement;
        document.body.style.overflow = "hidden";
        requestAnimationFrame(() => {
          contentRef.current?.focus();
        });
      } else if (shouldRender) {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
          document.body.style.overflow = "";
          previousActiveElement.current?.focus();
        }, 180);
      }
    }, [isOpen, mounted, shouldRender]);

    useEffect(() => {
      if (!isOpen || !closeOnEscape || isClosing) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, closeOnEscape, onClose, isClosing]);

    if (!mounted || !shouldRender) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    const setMergedRef = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const dialogContent = (
      <div
        className={`no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs ${
          isClosing ? "dialog-overlay-out" : "dialog-overlay-in"
        }`}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div
          ref={setMergedRef}
          tabIndex={-1}
          className={`w-full ${sizeClasses[size]} max-h-[92vh] flex flex-col bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden focus:outline-hidden ${
            isClosing ? "dialog-panel-out" : "dialog-panel-in"
          } ${className}`}
          dir="rtl"
        >
          <div className="px-6 py-4 border-b border-surface-border bg-surface-hover/30 flex items-center justify-between shrink-0">
            <h3 id="dialog-title" className="font-extrabold text-lg sm:text-xl text-text-main">
              {title}
            </h3>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <LuX className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className={bodyClassName}>
            {children}
          </div>
        </div>
      </div>
    );

    return createPortal(dialogContent, document.body);
  }
);

Dialog.displayName = "Dialog";