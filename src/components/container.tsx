import type { ReactNode } from "react";

/**
 * Einziger horizontaler Rhythmus der Seite. 20px Rand ab 375px, 32px ab
 * Tablet — damit Fliesstext auf dem Handy nicht am Displayrand klebt.
 */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
  );
}
