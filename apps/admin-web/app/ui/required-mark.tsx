import type { ReactNode } from "react";

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="mr-1 text-red-500">
      *
    </span>
  );
}

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span>
      <RequiredMark />
      {children}
    </span>
  );
}
