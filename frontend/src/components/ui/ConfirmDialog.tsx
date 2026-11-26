"use client";

import React from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { LuTriangleAlert, LuTrash2 } from "react-icons/lu";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

/**
 * نافذة تأكيد أنيقة بديلة عن نافذة المتصفح الافتراضية confirm()
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message,
  confirmText = "نعم، تأكيد الحذف",
  cancelText = "إلغاء",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      showCloseButton={!loading}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="space-y-5 text-center sm:text-right">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-rose-100 text-rose-600 border border-rose-200"
                : "bg-amber-100 text-amber-600 border border-amber-200"
            }`}
          >
            {isDanger ? (
              <LuTrash2 className="w-6 h-6" />
            ) : (
              <LuTriangleAlert className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1.5 flex-1">
            <p className="text-sm sm:text-base font-bold text-text-main leading-relaxed">
              {message}
            </p>
            <p className="text-xs text-text-muted">
              لا يمكن التراجع عن هذه الخطوة بعد التأكيد.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "جاري التنفيذ..." : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
