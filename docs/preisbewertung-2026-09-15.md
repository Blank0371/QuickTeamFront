# Preisbewertung QuickTeam — 15. September 2026

## Empfehlung

Für Neukunden nach Beseitigung der Launch-Hindernisse **39 / 69 / 99 Euro netto pro Betrieb und Monat** bei unveränderten Grenzen von 15 / 30 / 50 Mitarbeitern testen. Die aktuellen 29 / 49 / 69 Euro sind günstig, besonders bei größeren Teams. Die Empfehlung ist eine Marktpositionierung, kein Nachweis tatsächlicher Zahlungsbereitschaft. Preise und Stripe-Produkte wurden nicht geändert.

| Tarif | Heute | Vorschlag | Erhöhung | Preis pro Kopf bei voller Belegung |
|---|---:|---:|---:|---:|
| Low, bis 15 | 29 € | 39 € | 34,5 % | 2,60 € |
| Medium, bis 30 | 49 € | 69 € | 40,8 % | 2,30 € |
| Business, bis 50, ein Standort | 69 € | 99 € | 43,5 % | 1,98 € |

Aktuelle Preise: src/lib/site.ts; Grenzen: src/i18n/de.ts. Monatlich kündbar, 14 Tage Test. Mehrere Standorte und mehr als 50 Mitarbeiter individuell. Low würde ich mittelfristig in Starter umbenennen; das ist eine Empfehlung, keine vorgenommene Produktänderung.

## Vergleich öffentlich zugänglicher Anbieterangaben

Abruf 15.09.2026, Listenpreise ohne individuell verhandelte Rabatte. Funktionsumfang, Mindestabnahmen und Vertragslaufzeiten unterscheiden sich. Keine Verkaufsanfragen versendet.

| Anbieter/Tarif | Veröffentlichter Preis | Einordnung |
|---|---|---|
| Aplano Basic | 2 €/Mitarbeiter/Monat | Schichtplanung, Abwesenheiten, Urlaubskonten und Tausch; preisgünstiger Vergleich für einfache Planung. |
| Aplano Pro | 4,50 €/Mitarbeiter/Monat | Zusätzlich u. a. automatische Planung, Verfügbarkeiten, Zeiterfassung, API und Checklisten. |
| Staffomatic Basic | 2,40 €/Mitarbeiter/Monat, mindestens 10 | Planung mit nur einem Administrator. |
| Staffomatic Professional | 4,80 €/Mitarbeiter/Monat, mindestens 10 | Mehrere Planer, Verfügbarkeiten und Zeiterfassung. |
| Papershift Premium | Darstellung für 16 Mitarbeiter: 96 € bzw. 86,40 € bei jährlicher Zahlweise, jeweils plus 39 € Grundgebühr | Dienstplanung und automatische Schichtzuweisung; jährliche Bindung laut Fußnote beachten. |
| Shiftbase Basic | 30 €/Monat inklusive 6 Mitarbeiter, danach 4 €/Monat zusätzlich | Beinhaltet u. a. Zeiterfassung, Tausch und Verfügbarkeiten. |
| Shiftbase Premium | 72 €/Monat inklusive 12 Mitarbeiter, danach 5 €/Monat zusätzlich | Automatische Planung als Early Access sowie breitere Kosten-/Personalwerkzeuge. |
| Planday / gastromatic | Für den Vergleich kein verlässlich auslesbarer konkreter Eurobetrag / Preis auf Anfrage | Nicht mit geratenen Zahlen in den Preisvergleich eingerechnet. |

Quellen: [Aplano](https://www.aplano.de/preise), [Staffomatic](https://docs.staffomatic.com/de/agb-bedingungen-abrechnungspl%C3%A4ne-abonnement), [Papershift](https://www.papershift.com/preise), [Shiftbase](https://www.shiftbase.com/de/preise), [Planday](https://www.planday.com/de/preise), [gastromatic](https://www.gastromatic.com/de/preise/).

## Rechenbeispiele pro Monat

Eigene Berechnung aus den Anbieterangaben, ohne Jahresrabatte, nicht funktionsgleich:

| Teamgröße | QuickTeam heute | Vorschlag | Aplano Basic | Aplano Pro | Staffomatic Professional | Shiftbase Basic |
|---|---:|---:|---:|---:|---:|---:|
| 15 | 29 € | 39 € | 30 € | 67,50 € | 72 € | 66 € |
| 30 | 49 € | 69 € | 60 € | 135 € | 144 € | 126 € |
| 50 | 69 € | 99 € | 100 € | 225 € | 240 € | 206 € |

Die Staffel bleibt bei hoher Belegung attraktiv. Bei nur fünf Mitarbeitern ist ein 39-Euro-Paket dagegen 7,80 Euro pro Kopf: Dort konkurriert ihr auch mit Aplano Core (0,50 Euro pro Kopf) und Shiftbase Free (bis 15, begrenzte Funktionen). Nicht als billigste Lösung vermarkten. Automatische Planung, schneller Ersatz und einfache Einführung müssen den Unterschied für den Gastrobetrieb erlebbar machen.

## Was höhere Preise rechtfertigt — und was sie begrenzt

Der Nutzen liegt in weniger Planungsaufwand und weniger kurzfristiger Abstimmung, nicht in den Serverkosten. Beispielrechnung, keine gemessene Kundenersparnis: Spart ein Betrieb drei Stunden monatlich zu intern 30 Euro, sind das 90 Euro. Für 99 Euro müssten Nutzen oder Zeitersparnis entsprechend höher sein. Solche Werte mit Pilotbetrieben messen, nicht als garantierte Werbeaussage verwenden.

Die Konkurrenz hat zum Teil Zeiterfassung, Lohnschnittstellen, größere Integrationsangebote und etablierte Supportabläufe. QuickTeam bietet nach den eigenen AGB keine vollständige Arbeitszeiterfassung. Daher würde ich aktuell nicht sofort auf 79 / 129 / 199 Euro gehen. Erst belastbare Referenzen, stabile Nutzung und nachgewiesener Automatisierungsnutzen erlauben eine deutlich stärkere Positionierung.

## Vorgehen

1. Mit 39 / 69 / 99 Euro in Gesprächen mit 10–15 passenden Gastrobetrieben prüfen; noch keine automatische Preiserhöhung bestehender Verträge.
2. Pro Betrieb Ausgangsaufwand, Einrichtungsaufwand, tatsächlich gesparte Zeit, Nutzung nach vier Wochen und Zahlungsbereitschaft erfassen. Aussagen durch bezahlte Abschlüsse überprüfen.
3. Falls ein Einführungspreis gewünscht ist, z. B. 29 / 49 / 69 für die ersten sechs Monate anbieten und den späteren Regelpreis bereits beim Abschluss eindeutig nennen. Kein lebenslanges Niedrigpreisversprechen.
4. Unterstützung begrenzen und transparent beschreiben. Optionales persönliches Onboarding gesondert kalkulieren; keine Gebühren für gesetzlich geschuldete Exporte oder Datenschutzrechte.
5. Erst nach Entscheidung Website, Checkout und Stripe gemeinsam umstellen. Die neue AGB verlangt für bestehende Nettopreisänderungen Zustimmung.

Ohne reale Kosten für Support, Vertrieb, Abwanderung und Solver-Nutzung ist keine belastbare Gewinnmarge berechenbar. Gegenüber den aktuellen Tarifen ist der Vorschlag trotzdem ein vernünftiger erster Markttest.
