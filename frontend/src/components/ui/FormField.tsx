"use client";

import {
  ReactNode,
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import {
  Control,
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  UseFormRegister,
  useFormContext,
} from "react-hook-form";
import { CustomSelect } from "@/components/CustomSelect";

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
  id?: string;
}

type RegisterOptions<T extends FieldValues> = {
  register?: UseFormRegister<T>;
  name?: FieldPath<T>;
  control?: unknown;
  rules?: ControllerProps["rules"];
};

type InputFieldProps<T extends FieldValues = FieldValues> = BaseFieldProps &
  RegisterOptions<T> &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
    type?: "text" | "email" | "tel" | "number" | "date" | "password";
    placeholder?: string;
  };

type TextareaFieldProps<T extends FieldValues = FieldValues> = BaseFieldProps &
  RegisterOptions<T> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
    placeholder?: string;
    rows?: number;
    autoResize?: boolean;
  };

export interface SelectOption {
  value: string | number;
  label: string;
  badge?: string;
  icon?: ReactNode;
  dotColor?: string;
}

type SelectFieldProps<T extends FieldValues = FieldValues> = BaseFieldProps &
  RegisterOptions<T> & {
    placeholder?: string;
    options: SelectOption[];
    icon?: ReactNode;
    value?: string | number;
    onChange?: (value: string | number) => void;
  };

type CheckboxFieldProps<T extends FieldValues = FieldValues> = BaseFieldProps &
  RegisterOptions<T> &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
    labelPosition?: "before" | "after";
  };

function useControlledMode<T extends FieldValues>(
  name?: FieldPath<T>,
  register?: UseFormRegister<T>,
  control?: unknown
) {
  const formContext = useFormContext<T>();
  return !!name && (register || control || formContext?.control);
}

function FieldWrapper({
  label,
  error,
  hint,
  required,
  className = "",
  labelClassName = "",
  children,
  fieldId,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
  fieldId: string;
}) {
  // إزالة النجمة المكررة تلقائياً إذا وُجدت في النص مع خاصية required
  const hasTrailingStar = /\*\s*$/.test(label);
  const cleanLabel = label.replace(/\s*\*+\s*$/, "").trim();
  const showStar = Boolean(required || hasTrailingStar);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={fieldId}
        className={`block text-xs font-bold text-text-main ${labelClassName}`}
      >
        {cleanLabel}
        {showStar && (
          <span className="text-rose-500 mr-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-xs text-rose-600 font-bold flex items-center gap-1"
          role="alert"
        >
          <span>•</span>
          <span>{error}</span>
        </p>
      )}
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-[11px] text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClasses = (hasError: boolean, disabled: boolean = false) => `
  w-full px-3.5 py-2.5 rounded-xl border transition-all text-sm bg-surface text-text-main focus:outline-none focus:ring-2
  ${
    hasError
      ? "border-rose-400 text-rose-800 focus:border-rose-500 focus:ring-rose-200/70 bg-rose-50/30"
      : "border-surface-border focus:border-primary focus:ring-primary/15"
  }
  ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}
`;

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      className = "",
      labelClassName = "",
      type = "text",
      placeholder,
      register,
      name,
      control,
      rules,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const isControlled = useControlledMode(name, register, control);
    const formContext = useFormContext();
    const formControl = (control || (register ? undefined : formContext?.control)) as
      | Control<FieldValues>
      | undefined;
    const generatedId = useId();
    const fieldId = id || generatedId;

    if (isControlled && name) {
      return (
        <Controller
          name={name}
          control={formControl}
          rules={rules}
          render={({ field, fieldState }) => {
            const activeError = fieldState.error?.message || error;
            const hasError = Boolean(activeError);
            return (
              <FieldWrapper
                label={label}
                error={activeError}
                hint={hint}
                required={required}
                className={className}
                labelClassName={labelClassName}
                fieldId={fieldId}
              >
                <input
                  id={fieldId}
                  type={type}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={inputClasses(hasError, disabled)}
                  {...props}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ""}
                  aria-invalid={hasError}
                  aria-describedby={
                    hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
                  }
                />
              </FieldWrapper>
            );
          }}
        />
      );
    }

    const hasError = Boolean(error);
    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        className={className}
        labelClassName={labelClassName}
        fieldId={fieldId}
      >
        <input
          ref={ref}
          id={fieldId}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses(hasError, disabled)}
          {...props}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
        />
      </FieldWrapper>
    );
  }
);

InputField.displayName = "InputField";

const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { autoResize?: boolean }
>(({ autoResize, value, className, ...props }, ref) => {
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => localRef.current as HTMLTextAreaElement, []);

  useLayoutEffect(() => {
    if (!autoResize || !localRef.current) return;
    const el = localRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, value]);

  return (
    <textarea
      ref={localRef}
      value={value}
      className={`${className} ${autoResize ? "overflow-hidden" : ""}`}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      className = "",
      labelClassName = "",
      placeholder,
      rows = 3,
      autoResize = false,
      register,
      name,
      control,
      rules,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const isControlled = useControlledMode(name, register, control);
    const formContext = useFormContext();
    const formControl = (control || (register ? undefined : formContext?.control)) as
      | Control<FieldValues>
      | undefined;
    const generatedId = useId();
    const fieldId = id || generatedId;

    const getClasses = (hasError: boolean) => `
      w-full px-3.5 py-2.5 rounded-xl border transition-all text-sm bg-surface text-text-main focus:outline-none focus:ring-2 resize-none
      ${
        hasError
          ? "border-rose-400 text-rose-800 focus:border-rose-500 focus:ring-rose-200/70 bg-rose-50/30"
          : "border-surface-border focus:border-primary focus:ring-primary/15"
      }
      ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}
    `;

    if (isControlled && name) {
      return (
        <Controller
          name={name}
          control={formControl}
          rules={rules}
          render={({ field, fieldState }) => {
            const activeError = fieldState.error?.message || error;
            const hasError = Boolean(activeError);
            return (
              <FieldWrapper
                label={label}
                error={activeError}
                hint={hint}
                required={required}
                className={className}
                labelClassName={labelClassName}
                fieldId={fieldId}
              >
                <AutoResizeTextarea
                  id={fieldId}
                  placeholder={placeholder}
                  rows={rows}
                  disabled={disabled}
                  autoResize={autoResize}
                  className={getClasses(hasError)}
                  {...props}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ""}
                  aria-invalid={hasError}
                  aria-describedby={
                    hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
                  }
                />
              </FieldWrapper>
            );
          }}
        />
      );
    }

    const hasError = Boolean(error);
    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        className={className}
        labelClassName={labelClassName}
        fieldId={fieldId}
      >
        <AutoResizeTextarea
          ref={ref}
          id={fieldId}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          autoResize={autoResize}
          className={getClasses(hasError)}
          {...props}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
        />
      </FieldWrapper>
    );
  }
);

TextareaField.displayName = "TextareaField";

export const SelectField = forwardRef<HTMLDivElement, SelectFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      className = "",
      labelClassName = "",
      placeholder,
      options,
      register,
      name,
      control,
      rules,
      disabled,
      icon,
      id,
      value,
      onChange,
    },
    ref
  ) => {
    const isControlled = useControlledMode(name, register, control);
    const formContext = useFormContext();
    const formControl = (control || (register ? undefined : formContext?.control)) as
      | Control<FieldValues>
      | undefined;
    const generatedId = useId();
    const fieldId = id || generatedId;

    if (isControlled && name) {
      return (
        <Controller
          name={name}
          control={formControl}
          rules={rules}
          render={({ field, fieldState }) => {
            const activeError = fieldState.error?.message || error;
            const hasError = Boolean(activeError);
            return (
              <FieldWrapper
                label={label}
                error={activeError}
                hint={hint}
                required={required}
                className={className}
                labelClassName={labelClassName}
                fieldId={fieldId}
              >
                <div ref={ref}>
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={(val) => {
                      field.onChange(val);
                      field.onBlur();
                    }}
                    options={options}
                    placeholder={placeholder}
                    disabled={disabled}
                    icon={icon}
                    aria-label={label}
                    triggerClassName={
                      hasError
                        ? "!border-rose-400 !text-rose-800 focus:!ring-rose-200/70 !bg-rose-50/30"
                        : "!border-surface-border !text-text-main !font-medium"
                    }
                  />
                </div>
              </FieldWrapper>
            );
          }}
        />
      );
    }

    const hasError = Boolean(error);
    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        className={className}
        labelClassName={labelClassName}
        fieldId={fieldId}
      >
        <div ref={ref}>
          <CustomSelect
            value={value ?? ""}
            onChange={(val) => onChange?.(val)}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            icon={icon}
            aria-label={label}
            triggerClassName={
              hasError
                ? "!border-rose-400 !text-rose-800 focus:!ring-rose-200/70 !bg-rose-50/30"
                : "!border-surface-border !text-text-main !font-medium"
            }
          />
        </div>
      </FieldWrapper>
    );
  }
);

SelectField.displayName = "SelectField";

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  (
    {
      label,
      error,
      hint,
      required,
      className = "",
      labelClassName = "",
      register,
      name,
      control,
      rules,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const isControlled = useControlledMode(name, register, control);
    const formContext = useFormContext();
    const formControl = (control || (register ? undefined : formContext?.control)) as
      | Control<FieldValues>
      | undefined;
    const generatedId = useId();
    const fieldId = id || generatedId;
    const cleanLabel = label.replace(/\s*\*+\s*$/, "").trim();

    if (isControlled && name) {
      return (
        <Controller
          name={name}
          control={formControl}
          rules={rules}
          render={({ field, fieldState }) => {
            const activeError = fieldState.error?.message || error;
            const hasError = Boolean(activeError);
            return (
              <div className={`space-y-1 ${className}`}>
                <div className={labelClassName}>
                  <label
                    htmlFor={fieldId}
                    className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main"
                  >
                    <input
                      id={fieldId}
                      type="checkbox"
                      disabled={disabled}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-border cursor-pointer"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                      aria-invalid={hasError}
                    />
                    <span>
                      {cleanLabel}{" "}
                      {required && (
                        <span className="text-rose-500" aria-hidden="true">
                          *
                        </span>
                      )}
                    </span>
                  </label>
                </div>
                {activeError && (
                  <p className="text-xs text-rose-600 font-bold" role="alert">
                    • {activeError}
                  </p>
                )}
                {hint && !activeError && (
                  <p className="text-[11px] text-text-muted">{hint}</p>
                )}
              </div>
            );
          }}
        />
      );
    }

    const hasError = Boolean(error);
    return (
      <div className={`space-y-1 ${className}`}>
        <div className={labelClassName}>
          <label
            htmlFor={fieldId}
            className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main"
          >
            <input
              ref={ref}
              id={fieldId}
              type="checkbox"
              disabled={disabled}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-border cursor-pointer"
              {...props}
              aria-invalid={hasError}
            />
            <span>
              {cleanLabel}{" "}
              {required && (
                <span className="text-rose-500" aria-hidden="true">
                  *
                </span>
              )}
            </span>
          </label>
        </div>
        {error && (
          <p className="text-xs text-rose-600 font-bold" role="alert">
            • {error}
          </p>
        )}
        {hint && !error && <p className="text-[11px] text-text-muted">{hint}</p>}
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";
