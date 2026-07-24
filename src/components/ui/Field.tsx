import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const baseInputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <input ref={ref} className={cn(baseInputClass, error && "border-red-400", className)} {...props} />
    </FieldWrapper>
  )
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <textarea ref={ref} className={cn(baseInputClass, "min-h-24 resize-y", error && "border-red-400", className)} {...props} />
    </FieldWrapper>
  )
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, children, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <select ref={ref} className={cn(baseInputClass, "bg-white", error && "border-red-400", className)} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
);
Select.displayName = "Select";
