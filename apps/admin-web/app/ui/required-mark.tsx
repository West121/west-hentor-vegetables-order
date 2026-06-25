import type { ReactNode } from "react";

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-red-500">
      *
    </span>
  );
}

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span>
      {children}
      <RequiredMark />
    </span>
  );
}
