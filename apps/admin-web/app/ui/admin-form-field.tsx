"use client";

import type { ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { RequiredLabel } from "./required-mark";

type AdminFormFieldProps = {
  children: (invalid: boolean) => ReactNode;
  className?: string;
  description?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  label: ReactNode;
  required?: boolean;
};

export function AdminFormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  required = false,
}: AdminFormFieldProps) {
  const invalid = Boolean(error);

  return (
    <Field className={cn("gap-1.5", className)} data-invalid={invalid}>
      <FieldLabel htmlFor={htmlFor} className="text-sm font-medium">
        {required ? <RequiredLabel>{label}</RequiredLabel> : label}
      </FieldLabel>
      {children(invalid)}
      {description ? (
        <FieldDescription className="text-xs">{description}</FieldDescription>
      ) : null}
      {invalid ? <FieldError errors={[{ message: error ?? "" }]} /> : null}
    </Field>
  );
}
