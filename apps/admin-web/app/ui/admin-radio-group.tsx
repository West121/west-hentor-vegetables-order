"use client";

import { cn } from "@/app/lib/cn";

export type AdminRadioOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type AdminRadioGroupProps<TValue extends string> = {
  disabled?: boolean;
  name: string;
  onChange: (value: TValue) => void;
  options: Array<AdminRadioOption<TValue>>;
  value: TValue;
};

export function AdminRadioGroup<TValue extends string>({
  disabled = false,
  name,
  onChange,
  options,
  value,
}: AdminRadioGroupProps<TValue>) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {options.map((option) => (
        <label
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-medium text-[#405248]",
            disabled && "cursor-not-allowed opacity-60",
          )}
          key={option.value}
        >
          <input
            checked={value === option.value}
            className="h-4 w-4 accent-[#1f8f4f]"
            disabled={disabled}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
