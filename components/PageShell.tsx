import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}
