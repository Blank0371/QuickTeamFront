import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Nur Metadaten: der Stepper setzt eine Anmeldung voraus und gehört nicht
 * in den Index. Die Schrittseiten setzen `robots` selbst; diese Ebene
 * deckt `/einrichtung` und jeden künftigen Schritt ohne eigenen Eintrag.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EinrichtungLayout({ children }: { children: ReactNode }) {
  return children;
}
