"use client";

import { format } from "date-fns";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

type PickerShellProps = {
  children: React.ReactNode;
  className?: string;
  id: string;
  label?: string;
};

type DatePickerProps = {
  buttonClassName?: string;
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  value: string;
};

type TimePickerProps = DatePickerProps & {
  defaultTime?: string;
};

type DateTimePickerProps = Omit<TimePickerProps, "defaultTime"> & {
  defaultTime?: string;
};

function parseDateValue(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matched) {
    return undefined;
  }

  const [, year, month, day] = matched;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseTimeValue(value: string, fallback = "18:00") {
  const matched = value.match(/(?:T)?(\d{2}):(\d{2})/);
  if (!matched) {
    return fallback;
  }

  return `${matched[1]}:${matched[2]}`;
}

function formatDateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDateTimeValue(date: Date, time: string) {
  return `${formatDateValue(date)}T${time}`;
}

function formatDisplayDate(date: Date) {
  return format(date, "yyyy年M月d日");
}

function PickerShell({ children, className, id, label }: PickerShellProps) {
  if (!label) {
    return children;
  }

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
    </Field>
  );
}

function TimeGrid({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [hour, minute] = value.split(":").map(Number);

  function selectTime(nextHour = hour, nextMinute = minute) {
    onChange(
      `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(
        2,
        "0",
      )}`,
    );
  }

  return (
    <div className="grid w-[290px] grid-cols-[1fr_92px] gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">小时</div>
        <div className="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto pr-1">
          {HOURS.map((item) => (
            <Button
              key={item}
              onClick={() => selectTime(item)}
              size="xs"
              type="button"
              variant={item === hour ? "default" : "ghost"}
            >
              {String(item).padStart(2, "0")}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">分钟</div>
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-1">
          {MINUTES.map((item) => (
            <Button
              key={item}
              onClick={() => selectTime(hour, item)}
              size="xs"
              type="button"
              variant={item === minute ? "default" : "ghost"}
            >
              {String(item).padStart(2, "0")}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminDatePicker({
  buttonClassName,
  className,
  clearable = true,
  disabled,
  id,
  label,
  onChange,
  placeholder = "选择日期",
  readOnly,
  value,
}: DatePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const isDisabled = disabled || readOnly;

  const control = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn("justify-start font-normal", buttonClassName)}
          disabled={isDisabled}
          id={controlId}
          type="button"
          variant="outline"
        >
          <CalendarIcon data-icon="inline-start" />
          {selectedDate ? formatDisplayDate(selectedDate) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          defaultMonth={selectedDate}
          mode="single"
          onSelect={(nextDate) => {
            if (!nextDate) {
              return;
            }

            onChange(formatDateValue(nextDate));
            setOpen(false);
          }}
          selected={selectedDate}
        />
        {clearable && value ? (
          <div className="border-t p-2">
            <Button
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              清空
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );

  return (
    <PickerShell className={className} id={controlId} label={label}>
      {control}
    </PickerShell>
  );
}

export function AdminTimePicker({
  buttonClassName,
  className,
  clearable = false,
  defaultTime = "18:00",
  disabled,
  id,
  label,
  onChange,
  placeholder = "选择时间",
  readOnly,
  value,
}: TimePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const currentTime = value ? parseTimeValue(value, defaultTime) : defaultTime;
  const isDisabled = disabled || readOnly;

  const control = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn("justify-start font-normal", buttonClassName)}
          disabled={isDisabled}
          id={controlId}
          type="button"
          variant="outline"
        >
          <ClockIcon data-icon="inline-start" />
          {value ? currentTime : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <TimeGrid onChange={onChange} value={currentTime} />
        {clearable && value ? (
          <div className="mt-3 border-t pt-2">
            <Button
              className="w-full"
              onClick={() => onChange("")}
              size="sm"
              type="button"
              variant="ghost"
            >
              清空
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );

  return (
    <PickerShell className={className} id={controlId} label={label}>
      {control}
    </PickerShell>
  );
}

export function AdminDateTimePicker({
  buttonClassName,
  className,
  clearable = false,
  defaultTime = "18:00",
  disabled,
  id,
  label,
  onChange,
  placeholder = "选择日期时间",
  readOnly,
  value,
}: DateTimePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const selectedDate = parseDateValue(value);
  const currentTime = parseTimeValue(value, defaultTime);
  const isDisabled = disabled || readOnly;

  function updateDate(nextDate: Date | undefined) {
    if (!nextDate) {
      return;
    }

    onChange(formatDateTimeValue(nextDate, currentTime));
  }

  function updateTime(nextTime: string) {
    onChange(formatDateTimeValue(selectedDate ?? new Date(), nextTime));
  }

  const control = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn("justify-start font-normal", buttonClassName)}
          disabled={isDisabled}
          id={controlId}
          type="button"
          variant="outline"
        >
          <CalendarIcon data-icon="inline-start" />
          {selectedDate ? (
            `${formatDisplayDate(selectedDate)} ${currentTime}`
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <div className="flex flex-col gap-4 lg:flex-row">
          <Calendar
            defaultMonth={selectedDate}
            mode="single"
            onSelect={updateDate}
            selected={selectedDate}
          />
          <TimeGrid onChange={updateTime} value={currentTime} />
        </div>
        {clearable && value ? (
          <div className="mt-3 border-t pt-2">
            <Button
              className="w-full"
              onClick={() => onChange("")}
              size="sm"
              type="button"
              variant="ghost"
            >
              清空
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );

  return (
    <PickerShell className={className} id={controlId} label={label}>
      {control}
    </PickerShell>
  );
}
