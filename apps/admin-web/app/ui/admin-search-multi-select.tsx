"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AdminSearchMultiSelectOption = {
  disabled?: boolean;
  helper?: string;
  label: string;
  value: string;
};

type AdminSearchMultiSelectProps = {
  contentLabel: string;
  disabled?: boolean;
  emptyText?: string;
  invalid?: boolean;
  onChange: (value: string[]) => void;
  options: AdminSearchMultiSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  value: string[];
};

function formatSelectedText(
  value: string[],
  options: AdminSearchMultiSelectOption[],
  placeholder: string,
) {
  if (value.length === 0) {
    return placeholder;
  }

  const selectedLabels = value
    .map((item) => options.find((option) => option.value === item)?.label)
    .filter(Boolean) as string[];

  if (selectedLabels.length === 0) {
    return `${value.length} 项`;
  }

  if (selectedLabels.length <= 2) {
    return selectedLabels.join("、");
  }

  return `${selectedLabels[0]}等 ${selectedLabels.length} 项`;
}

export function AdminSearchMultiSelect({
  contentLabel,
  disabled = false,
  emptyText = "暂无可选项",
  invalid = false,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "搜索",
  value,
}: AdminSearchMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const filteredOptions = useMemo(() => {
    const nextKeyword = keyword.trim().toLowerCase();
    if (!nextKeyword) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.helper ?? ""}`
        .toLowerCase()
        .includes(nextKeyword),
    );
  }, [keyword, options]);
  const selectedText = formatSelectedText(value, options, placeholder);

  function toggleOption(optionValue: string) {
    if (selected.has(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
      return;
    }

    onChange([...value, optionValue]);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setKeyword("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          aria-invalid={invalid}
          className={cn(
            "h-10 w-full justify-between rounded-xl border-[#dbe6dc] bg-white px-3 text-left font-normal text-[#15261d]",
            value.length === 0 && "text-[#66756d]",
          )}
          disabled={disabled}
          type="button"
          variant="outline"
        >
          <span className="min-w-0 truncate">{selectedText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-[#66756d]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-2">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-[#dbe6dc] bg-white px-2">
          <Search className="h-4 w-4 text-[#66756d]" />
          <input
            aria-label={`搜索${contentLabel}`}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#97a69e]"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={searchPlaceholder}
            value={keyword}
          />
          {keyword ? (
            <button
              className="grid h-6 w-6 place-items-center rounded-md text-[#66756d] hover:bg-[#eff8f1] hover:text-[#1f8f4f]"
              onClick={() => setKeyword("")}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="max-h-64 overflow-auto py-1">
          {filteredOptions.map((option) => {
            const checked = selected.has(option.value);
            return (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-[#eff8f1]",
                  checked && "bg-[#eef8f0] text-[#1f8f4f]",
                  option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                )}
                disabled={option.disabled}
                key={option.value}
                onClick={() => toggleOption(option.value)}
                type="button"
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border border-[#bfd5c6]",
                    checked && "border-[#1f8f4f] bg-[#1f8f4f] text-white",
                  )}
                >
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.helper ? (
                    <span className="block truncate text-xs text-[#66756d]">
                      {option.helper}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          {filteredOptions.length === 0 ? (
            <div className="px-2.5 py-6 text-center text-sm text-[#66756d]">
              {emptyText}
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[#edf2ed] pt-2">
          <span className="text-xs text-[#66756d]">已选 {value.length} 项</span>
          <button
            className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1f8f4f] hover:bg-[#eff8f1] disabled:text-[#97a69e]"
            disabled={value.length === 0}
            onClick={() => onChange([])}
            type="button"
          >
            清空
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
