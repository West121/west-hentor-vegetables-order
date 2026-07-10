"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_SELECT_VALUE = "__ADMIN_SELECT_EMPTY__";

export type AdminSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type AdminSelectProps = {
  ariaInvalid?: boolean;
  className?: string;
  contentLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  value: string;
};

function toSelectValue(value: string) {
  return value === "" ? EMPTY_SELECT_VALUE : value;
}

function fromSelectValue(value: string) {
  return value === EMPTY_SELECT_VALUE ? "" : value;
}

export function AdminSelect({
  ariaInvalid,
  className,
  contentLabel,
  disabled,
  onChange,
  options,
  placeholder,
  triggerClassName = "!h-11 !min-h-11 w-full border-[#dbe6dc] bg-white",
  value,
}: AdminSelectProps) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(nextValue) => onChange(fromSelectValue(nextValue))}
      value={toSelectValue(value)}
    >
      <SelectTrigger
        aria-invalid={ariaInvalid}
        className={[triggerClassName, className].filter(Boolean).join(" ")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" position="popper">
        <SelectGroup>
          {contentLabel ? <SelectLabel>{contentLabel}</SelectLabel> : null}
          {options.map((option) => (
            <SelectItem
              disabled={option.disabled}
              key={option.value || EMPTY_SELECT_VALUE}
              value={toSelectValue(option.value)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
