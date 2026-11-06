# Mitarbeit an Rewinde

## Entwicklungsumgebung
Node.js ab Version 22, empfohlen ist Version 24. Es sind keine zusätzlichen Pakete erforderlich.

```sh
npm start
npm test
npm run build
```

Die Anwendung läuft unter http://127.0.0.1:4173/. `npm run dev` startet den Testserver mit automatischem Neustart bei Dateiänderungen; die Browserseite wird manuell neu geladen.

## Änderungen prüfen
Änderungen bitte mit einem konkreten Anwendungsfall und nachvollziehbaren Prüfschritten beschreiben. Bei Änderungen am Datenformat müssen bestehende Browserdaten und JSON-Sicherungen lesbar bleiben. Verwende für Tests und Screenshots ausschließlich fiktive Inhalte.

Für isolierte manuelle Tests kann `node tests/preview-server.mjs` auf Port 4174 verwendet werden. Das ist ein anderer Browser-Speicherbereich als Port 4173. Automatisierte Tests verwenden temporäre Daten.

## Datenkonzept
Prozessdaten bleiben im Browser. Neue Funktionen dürfen keine Netzwerkübertragung von Prozessinhalten, zentrale Datenspeicherung, Telemetrie oder externe Assets einführen. Ressourcen werden über gemeinsame IDs zugeordnet. Das Modell enthält genau ein Ergebnis pro Prozess und bildet notwendige Voraussetzungen als kreisfreien Graphen ab.

## Quellcode und Hosting
`npm run package:github` kopiert die freigegebenen Quelldateien nach `outputs/github/rewinde/`. Neue Projektdateien müssen in die Liste in `scripts/prepare-github.mjs` aufgenommen werden. Neue öffentliche App-Dateien müssen zusätzlich in `scripts/build-static.mjs` stehen. `dist/` ist ausschließlich die gebaute Website.

Beiträge stehen wie das Projekt unter der MIT-Lizenz.
