"use client";

import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AdminTooltipProps = {
  children: ReactNode;
  content: ReactNode;
};

type AdminOverflowTextProps = {
  children: ReactNode;
  className?: string;
  content?: ReactNode;
};

export function AdminTooltip({ children, content }: AdminTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AdminOverflowText({
  children,
  className,
  content,
}: AdminOverflowTextProps) {
  const tooltipContent = content ?? children;

  return (
    <AdminTooltip content={tooltipContent}>
      <span className={cn("block max-w-full truncate", className)}>
        {children}
      </span>
    </AdminTooltip>
  );
}
