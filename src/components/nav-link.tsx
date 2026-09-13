"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nur wegen `usePathname` eine Client-Komponente. Der Header selbst
 * bleibt dadurch eine Server Component.
 */
export function NavLink({ href, children }: { href: string; children: string }) {
  const pathname = usePathname();
  const aktiv = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={aktiv ? "page" : undefined}
      className="relative py-2 text-sm font-medium text-muted transition-colors hover:text-text aria-[current=page]:text-text"
    >
      {children}
      {aktiv ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-signal"
        />
      ) : null}
    </Link>
  );
}
