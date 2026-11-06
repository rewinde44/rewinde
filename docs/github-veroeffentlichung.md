# Rewinde auf GitHub und Cloudflare Pages veröffentlichen

Diese Anleitung verwendet für den ersten Upload ausschließlich den Browser. Git, GitHub Desktop und ein eigener Server sind dafür nicht erforderlich. Du benötigst dein GitHub-Konto, anschließend ein Cloudflare-Konto und das vorbereitete Quellcodepaket. Eine eigene Domain ist optional.

Stand der verlinkten Anbieter-Dokumentation: 6. November 2026. Einzelne Schaltflächen können je nach Sprache der Oberfläche anders heißen.

## 1. Das richtige Paket wählen

Der vorbereitete Upload-Ordner liegt im lokalen Projekt unter `outputs/github/rewinde/`. Alternativ das bereitgestellte Archiv `outputs/rewinde-github.zip` über **Rechtsklick → Alle extrahieren** entpacken.

Öffne den Ordner, in dem unmittelbar `README.md`, `package.json`, `public`, `scripts` und `tests` liegen. Das ist die Wurzel des Quellcodepakets. Genau dessen Inhalt wird hochgeladen. Die ZIP-Datei selbst wird nicht als Quellcode hochgeladen.

Das Paket enthält außerdem `.github`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.node-version`, `.dockerignore`, Dokumentation und die MIT-Lizenz. Bei Bedarf im Explorer unter **Ansicht → Anzeigen → Ausgeblendete Elemente** einschalten. Dateiendungen ebenfalls anzeigen lassen, damit beispielsweise `package.json` erkennbar ist.

Der ursprüngliche Arbeitsordner kann private Sicherungen in `data/` und Exporte in `outputs/` enthalten. Verwende deshalb den vorbereiteten Upload-Ordner. GitHubs Browser-Upload filtert die Dateien nicht für dich anhand deiner lokalen `.gitignore`.

## 2. E-Mail-Adresse bei GitHub verbergen

Vor dem ersten Upload auf GitHub oben rechts das Profilbild öffnen, **Settings → Emails** aufrufen und **Keep my email addresses private** einschalten. GitHub verwendet dann bei Änderungen im Browser seine No-Reply-Adresse. Dein Profilname und Benutzername bleiben öffentlich sichtbar. [GitHub: Commit-E-Mail einstellen](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address).

Für diesen Browser-Upload musst du keinen lokalen Git-Autor konfigurieren. Falls du später GitHub Desktop oder Git verwendest, dort ebenfalls deinen gewünschten öffentlichen Namen und die von GitHub angezeigte No-Reply-Adresse einstellen. Diese Einstellung ändert keine bereits veröffentlichten Commits rückwirkend.

## 3. Repository anlegen

Ein Repository ist der Projektordner auf GitHub, einschließlich seiner Änderungshistorie.

1. Auf [GitHub](https://github.com/) anmelden und [New repository](https://github.com/new) öffnen.
2. Als **Owner** dein neutrales Profil wählen.
3. Bei **Repository name** `rewinde` eingeben.
4. Als **Description** beispielsweise eintragen: `Browserbasierte Prozessanalyse mit Rückwärtsverkettung. Lokale Datenhaltung und Export ohne Datenbank.`
5. **Public** wählen, damit der Quellcode als Referenz zugänglich ist.
6. **Add a README file** ausgeschaltet lassen. Keine `.gitignore`-Vorlage und keine zusätzliche Lizenz auswählen; diese Dateien sind bereits vorbereitet.
7. **Create repository** anklicken.

Danach hat dein Projekt eine Adresse nach dem Muster `https://github.com/DEIN-NUTZERNAME/rewinde`. Deinen tatsächlichen Benutzernamen verwenden. [GitHub: Neues Repository erstellen](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

## 4. Quellcode hochladen

1. Im leeren Repository den Link **uploading an existing file** öffnen. Bei einem bereits gefüllten Repository heißt der Weg **Add file → Upload files**.
2. Im Explorer den Upload-Ordner aus Schritt 1 öffnen. Sämtliche darin enthaltenen Dateien und Unterordner markieren und in das Uploadfeld ziehen.
3. Vor dem Speichern kontrollieren: `README.md` und `package.json` müssen direkt in der Repository-Wurzel liegen. `public/app.js` muss unter `public/` erscheinen. Es darf kein zusätzlicher äußerer Ordner wie `rewinde/public/` entstehen.
4. Prüfen, dass `.github/workflows/ci.yml`, `.gitignore` und die anderen Punktdateien vorhanden sind. `data/`, `outputs/`, `dist/`, `.git/` und `.env` gehören nicht in diesen Upload.
5. Als Commit-Nachricht `Erste Veröffentlichung von Rewinde` eingeben und mit **Commit changes** beziehungsweise der angezeigten Speicheraktion bestätigen.

Ein Commit ist ein gespeicherter Änderungsstand. GitHub erlaubt beim Browser-Upload bis zu 100 Dateien gleichzeitig; das vorbereitete Paket bleibt darunter. [GitHub: Dateien hochladen](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

Nach dem Upload sollte die README unter der Dateiliste erscheinen. Das Repository allein betreibt die Anwendung noch nicht als Website.

## 5. Automatische Prüfungen ansehen

Im Repository **Actions** öffnen. Der vorbereitete Workflow **Tests und Build** führt die Tests, den Website-Build und die Quellcode-Paketierung mit Node.js 22 und 24 aus. Er benötigt keine selbst angelegten Secrets und veröffentlicht nichts.

Nach Abschluss sollten beide Prüfjobs grün sein. Bei einem Fehler den Job und den roten Schritt öffnen. Die Einträge zeigen den Fehler und die betroffene Datei. Die Einbindung der offiziellen Aktionen folgt deren Dokumentation: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node).

## 6. Repository-Link in Rewinde eintragen

1. Im Repository `public/project.js` öffnen.
2. Den Stift für **Edit this file** anklicken.
3. Die leere URL durch die tatsächliche Repository-Adresse ersetzen:

```js
export const REPOSITORY_URL = 'https://github.com/DEIN-NUTZERNAME/rewinde';
```

4. Anführungszeichen und Semikolon beibehalten. Mit der Nachricht `Repository-Link hinterlegen` speichern.

Cloudflare erzeugt beim Build daraus auch die eigene Datenschutzseite. Wenn du lokal weiterarbeitest, dieselbe Änderung in deinem lokalen `public/project.js` übernehmen oder den neuen Stand von GitHub herunterladen, damit ein späterer Upload sie nicht wieder entfernt. `public/datenschutz.html` wird vom Build erzeugt; den Inhalt der Hinweise bei Bedarf in `public/privacy.js` bearbeiten.

## 7. Cloudflare Pages mit GitHub verbinden

1. Bei [Cloudflare](https://dash.cloudflare.com/) anmelden beziehungsweise ein Konto anlegen.
2. **Workers & Pages → Create application → Pages** öffnen.
3. **Import an existing Git repository** beziehungsweise **Connect to Git** wählen.
4. GitHub verbinden. Wenn die Repository-Auswahl angeboten wird, **Only select repositories** und ausschließlich `rewinde` auswählen. Die Freigabe dient dem Abruf und automatischen Bau dieses Projekts.
5. `rewinde` wählen und **Begin setup** öffnen.

Für diese Veröffentlichung die Git-Integration verwenden. So werden spätere Änderungen aus GitHub automatisch übernommen. [Cloudflare: Git-Integration](https://developers.cloudflare.com/pages/get-started/git-integration/).

## 8. Build konfigurieren und veröffentlichen

| Feld | Wert für Rewinde |
| --- | --- |
| Project name | `rewinde` oder ein verfügbarer Name |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `node scripts/build-static.mjs` |
| Build output directory | `dist` |
| Root directory | Leer lassen, Repository-Wurzel |

Falls GitHub einen anderen Standard-Branch anzeigt, diesen statt `main` wählen. Der Build muss im Ordner mit `package.json` starten. Der Code benötigt keine Zugangsschlüssel, keine Datenbank und keinen laufenden Node-Server bei Cloudflare. `.node-version` legt Node.js 24 für die Build-Umgebung fest. [Cloudflare: Build-Umgebung](https://developers.cloudflare.com/pages/configuration/build-image/).

**Save and Deploy** anklicken. Nach erfolgreichem Build erscheint eine Adresse nach dem Muster `https://DEIN-PROJEKT.pages.dev`. Cloudflare veröffentlicht die gebauten Dateien aus `dist/`. `dist` wird nicht manuell auf GitHub hochgeladen. [Cloudflare: Statische Websites](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).

## 9. Die veröffentlichte Anwendung testen

Die neue HTTPS-Adresse öffnen und mit fiktiven Daten prüfen:

1. Einen Prozess mit Ergebnis anlegen und einen Vorgänger ergänzen.
2. Eine Ressource zuordnen und den Schritt speichern.
3. Die Seite neu laden: Der gespeicherte Prozess muss wieder erscheinen.
4. In den Einstellungen eine JSON-Sicherung herunterladen.
5. Prozessdokumentation exportieren und die Datenschutzhinweise aufrufen.

Der Browser-Speicher deiner lokalen Adresse wird nicht automatisch auf `pages.dev` übertragen. Für deine tägliche Arbeit den Arbeitsbereich auf der lokalen Adresse exportieren und auf der neuen Adresse importieren. Ein vollständiger Arbeitsbereichimport ersetzt nach Bestätigung den dortigen Bestand. Vorher sichern. Andere Besucher starten mit einem eigenen leeren Arbeitsbereich und sehen deine Prozesse nicht.

## 10. Als Referenz sichtbar machen

Im GitHub-Repository rechts im Bereich **About** über das Zahnrad die Cloudflare-Adresse als Website eintragen. Als Themen passen beispielsweise `process-analysis`, `backward-chaining`, `javascript`, `local-first` und `workflow-documentation`. Kontrollieren, dass die README angezeigt und die MIT-Lizenz erkannt wird.

Im Lebenslauf kann die Referenz so aussehen:

> Rewinde – Webanwendung zur Geschäftsprozessanalyse mit Rückwärtsverkettung. Vertikaler Prozesseditor, Ressourcen- und Datenflussmodellierung, lokale Browserdatenhaltung und Dokumentationsexporte. JavaScript, HTML, CSS, automatisierte Tests und statisches Hosting.

Darunter die echte Live-Adresse und den Repository-Link ergänzen. Aussagen zu eigenen Fähigkeiten und Leistungen an das anpassen, was du selbst erklären und vorführen kannst.

## 11. Spätere Änderungen veröffentlichen

Einzelne Textdateien können auf GitHub über den Stift bearbeitet werden. Für größere Änderungen im lokalen Projekt zuerst `npm test`, `npm run build` und `npm run package:github` ausführen. Die geänderten Dateien aus dem neuen Upload-Ordner unter denselben Pfaden hochladen. Neue oder entfernte Dateien berücksichtigen; ein Upload löscht alte Dateien nicht automatisch. Für regelmäßige Entwicklung erleichtert ein geklontes Repository mit GitHub Desktop die Synchronisierung.

Cloudflare startet bei Änderungen am konfigurierten Produktions-Branch einen neuen Build. Unter **Deployments** den erfolgreichen Abschluss prüfen, dann die Live-Seite neu laden. Ein App-Update auf derselben Domain löscht die gespeicherten Prozesse nicht automatisch; regelmäßige eigene Sicherungen bleiben erforderlich.

## Häufige Probleme

| Problem | Prüfen |
| --- | --- |
| Repository auf GitHub enthält nur eine ZIP-Datei | Archiv lokal entpacken und dessen Inhalt hochladen. |
| `package.json` oder das Build-Skript wird nicht gefunden | Quellcode liegt möglicherweise in einem zusätzlichen Unterordner; Root directory und Repository-Struktur prüfen. |
| Cloudflare findet `dist` nicht | Build command exakt übernehmen und Build-Protokoll auf Fehler prüfen. |
| Die Website zeigt Quelltextdateien statt der App | Als Build output directory muss `dist` eingetragen sein. |
| GitHub Actions startet nicht | `.github/workflows/ci.yml` muss vorhanden sein; unter Actions auf eine gegebenenfalls angezeigte Aktivierung achten. |
| Prozesse fehlen online | Andere Adresse oder anderes Browserprofil bedeutet einen anderen Speicherbereich. Per JSON übertragen. |
| Node.js wird lokal nicht gefunden | Node.js installieren und Terminal beziehungsweise Startfenster neu öffnen. |

Das Quellcodepaket ist technisch für die Veröffentlichung vorbereitet. Rechtliche Anforderungen an eine öffentliche Projektseite richten sich weiterhin nach ihrem tatsächlichen Betrieb; sie werden durch den Upload oder einen Repository-Link nicht automatisch erfüllt.
