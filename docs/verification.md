# Prüfstand

Version 0.4.1 · Stand: 6. November 2026.

## Automatisierte Prüfungen

`npm test`: **32 Tests bestanden**. Geprüft werden:

- Prozessmodell mit genau einem Ergebnis, gültigen gemeinsamen Voraussetzungen und kreisfreien Verbindungen.
- Ablehnung ungültiger IDs, Ressourcenverweise, Zeiten und Importstrukturen.
- Vertikale Anordnung mit parallelen Schritten.
- Migration bisheriger Statusfelder sowie Input-/Output-Texte ohne Verlust fachlicher Angaben.
- Browserpersistenz, konkurrierende Tabs, blockierter und voller Speicher sowie beschädigte Daten.
- Vollständiger JSON-Rundlauf und begrenzte Löschung der eigenen Browserdaten.
- Teilformulare ohne Verlust von Angaben aus anderen Schrittmenüs.
- HTML-Berichte mit maskierten Nutzereingaben und ohne externe Inhalte.
- Statische HTTP-Auslieferung, restriktive Header und fehlende Daten-/Upload-API.
- Quellcodepaket ohne private Daten, Exporte oder Git-Historie; Punktdateien bleiben enthalten.
- Ablehnung unbekannter Dateien im Paket-Zielordner ohne Löschen vorhandener Inhalte.

`npm run build` erstellt 18 öffentliche Dateien. `npm run package:github` erstellt das Quellcodepaket anhand einer expliziten Dateiliste. Alle JavaScript-Dateien wurden auf Syntaxfehler geprüft. Windows-Startskript und Container-Konfiguration verwenden keine rechnerbezogenen Laufzeitpfade.

Der GitHub-Workflow führt Tests und beide Paketierungen mit Node.js 22 und 24 aus. Ein tatsächlicher Lauf auf GitHub erfolgt erst nach dem Upload. Lokal wurde Node.js 24 verwendet.

## Manuelle Browserprüfung

Der bestehende Prüfstand der Arbeitsfläche umfasst 674 × 668 und 1280 × 720 Pixel. Unter einer separaten lokalen Adresse wurden allgemeine Angaben, Potenzialbewertung, neue und bestehende Ressourcen, Input-/Output-Verwendung, Tabwechsel, Tastaturnavigation, Pflichtfeldprüfung sowie Speichern und Neuladen geprüft. Beim Wechsel der Menüs blieben ungespeicherte Angaben erhalten. Es ist jeweils nur das ausgewählte Konfigurationsmenü sichtbar.

Die zuletzt geprüfte Hauptansicht zeigt alle vier bestehenden Prozesse in der Übersicht und keine einzelnen Prozessverknüpfungen in der Seitenleiste. Datenschutzhinweise sind erreichbar und verwenden denselben Inhalt wie die eigene Datenschutzseite. Die Repository-Adresse ist noch nicht konfiguriert; entsprechend erscheint kein leerer Projektlink. Vorhandene Nutzerprozesse wurden bei diesen Prüfungen nicht verändert.

## Grenzen

Docker, öffentliches Cloudflare-Deployment, tatsächliche Hostingkonfiguration und eine abschließende rechtliche Prüfung sind nicht ausgeführt. Druck/PDF verwendet die Browserdruckfunktion; der HTML-Bericht ist automatisiert geprüft. Namens-, Marken- und Domainrechte wurden nicht geprüft. Eine Quellcodeprüfung kann nicht garantieren, dass keine weiteren Fehler existieren.
