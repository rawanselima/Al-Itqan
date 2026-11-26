"use client";

import { useForm, UseFormProps, UseFormReturn, FieldPath, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z, ZodSchema } from "zod";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { ReactNode, useEffect } from "react";
import { InputField, TextareaField, SelectField, CheckboxField } from "./FormField";

interface ModalFormProps<T extends FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  schema: ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  children: (form: UseFormReturn<T>) => ReactNode;
  submitText?: string;
  cancelText?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  loading?: boolean;
  className?: string;
  showCloseButton?: boolean;
}

export function ModalForm<T extends FieldValues>({
  isOpen,
  onClose,
  title,
  schema,
  defaultValues,
  onSubmit,
  children,
  submitText = "حفظ",
  cancelText = "إلغاء",
  size = "md",
  loading = false,
  className = "",
  showCloseButton = false,
}: ModalFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as UseFormProps<T>["defaultValues"],
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  // تحديث قيم النموذج ومسح الأخطاء القديمة عند فتح النافذة أو تغير البيانات
  useEffect(() => {
    if (isOpen) {
      form.reset((defaultValues || {}) as UseFormProps<T>["defaultValues"]);
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      onClose();
      form.reset();
    } catch (error) {
      // Error handled by onSubmit
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      className={className}
      showCloseButton={showCloseButton}
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
        {children(form)}

        <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            fullWidth
            loading={loading}
          >
            {loading ? "جاري الحفظ..." : submitText}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Field configuration for SimpleModalForm
export interface SimpleFieldConfig<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  required?: boolean;
  hint?: string;
  rows?: number;
  disabled?: boolean;
}

interface SimpleModalFormProps<T extends FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  schema: ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  fields: SimpleFieldConfig<T>[];
  submitText?: string;
  cancelText?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  loading?: boolean;
  showCloseButton?: boolean;
}

export function SimpleModalForm<T extends FieldValues>({
  isOpen,
  onClose,
  title,
  schema,
  defaultValues,
  onSubmit,
  fields,
  submitText = "حفظ",
  cancelText = "إلغاء",
  size = "md",
  loading = false,
  showCloseButton = false,
}: SimpleModalFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as UseFormProps<T>["defaultValues"],
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  // تحديث قيم النموذج ومسح الأخطاء القديمة عند فتح النافذة أو تغير البيانات
  useEffect(() => {
    if (isOpen) {
      form.reset((defaultValues || {}) as UseFormProps<T>["defaultValues"]);
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      onClose();
      form.reset();
    } catch (error) {
      // Error handled by onSubmit
    }
  };

  const renderField = (field: SimpleFieldConfig<T>) => {
    const { name, label, type = "text", placeholder, options, required, hint, rows = 3, disabled } = field;
    const error = form.formState.errors[name]?.message as string | undefined;

    const commonProps = {
      label,
      error,
      hint,
      required,
      disabled,
      placeholder,
    };

    switch (type) {
      case "textarea":
        return (
          <div key={String(name)} className="space-y-1">
            <TextareaField
              {...commonProps}
              name={name}
              rows={rows}
              control={form.control}
            />
          </div>
        );
      case "select":
        return (
          <div key={String(name)} className="space-y-1">
            <SelectField
              {...commonProps}
              name={name}
              options={options || []}
              control={form.control}
            />
          </div>
        );
      case "checkbox":
        return (
          <div key={String(name)} className="pt-1">
            <CheckboxField
              {...commonProps}
              name={name}
              control={form.control}
            />
          </div>
        );
      default:
        return (
          <div key={String(name)} className="space-y-1">
            <InputField
              {...commonProps}
              name={name}
              type={type}
              control={form.control}
            />
          </div>
        );
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      showCloseButton={showCloseButton}
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
        {fields.map(renderField)}

        <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            fullWidth
            loading={loading}
          >
            {loading ? "جاري الحفظ..." : submitText}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Helper to create form methods for use with Dialog
export function useFormMethods<T extends FieldValues>(schema: ZodSchema<T>, defaultValues?: Partial<T>) {
  return useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as UseFormProps<T>["defaultValues"],
    mode: "onChange",
  });
}

// Re-export FormField components for convenient access
export { InputField, TextareaField, SelectField, CheckboxField } from "./FormField";
export { Dialog } from "./Dialog";
export { Button } from "./Button";