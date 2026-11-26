"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { LuTriangleAlert, LuRefreshCw, LuX } from "react-icons/lu";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center">
            <LuTriangleAlert className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className="font-bold text-rose-800 mb-2">حدث خطأ غير متوقع</h3>
          <p className="text-rose-600 text-sm mb-4">
            {this.state.error?.message || "يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى"}
          </p>
          <Button variant="primary" onClick={this.handleRetry} iconLeft={<LuRefreshCw className="w-4 h-4" />}>
            إعادة المحاولة
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple error display component for inline errors
 */
export function ErrorDisplay({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center justify-between gap-3">
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-100 transition-colors">
          <LuX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Loading skeleton components
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/60 rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-surface-border shadow-xs animate-pulse space-y-4">
      <div className="h-4 w-3/4 bg-slate-200/60 rounded" />
      <div className="h-8 w-1/4 bg-slate-300/70 rounded-xl" />
      <div className="h-4 w-1/2 bg-slate-200/60 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number } = {}) {
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <div className="bg-white border border-surface-border rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-beige/70 px-4 py-3 border-b border-surface-border">
        <div className="grid gap-4" style={gridStyle}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-300/60 rounded" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-surface-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="grid gap-4" style={gridStyle}>
              {Array.from({ length: cols }).map((_, j) => (
                <div key={j} className="h-5 bg-slate-200/60 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}