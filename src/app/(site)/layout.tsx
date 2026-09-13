import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Rahmen der öffentlichen Seite: Marketing, Rechtstexte, Auth und der
 * Einrichtungs-Stepper. Alles, was jemand sieht, bevor er im Dashboard
 * arbeitet.
 *
 * Die Klammer-Gruppe `(site)` taucht in keiner Adresse auf — `/preise`
 * bleibt `/preise`. Sie beantwortet allein die Frage, welcher Rahmen um
 * eine Seite gehört, und trennt damit die Kopfzeile mit „Anmelden" und
 * „Kostenlos testen" von der Kopfzeile des Dashboards, in der ein Betrieb
 * steht.
 *
 * Der Stepper liegt bewusst hier und nicht beim Dashboard: er führt zwar
 * eine angemeldete Person, gehört aber zum Weg hinein, nicht zur
 * laufenden Arbeit. Sein erster Schritt ist ohne Anmeldung erreichbar.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
