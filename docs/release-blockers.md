# Release-Blocker (Stand 13.10.2026)

Diese Punkte müssen vor einer **öffentlichen Veröffentlichung** (Deployment auf aboutexport.com) erledigt sein.
Sie blockieren nicht den Merge der PRs nach `main`, solange nicht deployt wird.

Maschinelle Prüfung der Pflichtangaben: `npm run release:check` (schlägt fehl, solange Werte in
`src/config/legal.ts` offen sind). Go-live-Ablauf: [`docs/go-live.md`](go-live.md), Setup: [`docs/deployment.md`](deployment.md).

Es wurden **keine** Angaben erfunden. Wo eine Information fehlt, steht sie hier – nicht als Platzhalter auf der Website.

## 1. Impressum (`src/pages/impressum.astro`)

| # | Punkt | Status |
|---|---|---|
| L1 | Vollständiger Vor- und Nachname des Inhabers (§ 5 DDG, Einzelunternehmen) – `legal.operator.owner` | **offen – Blocker** |
| L2 | Betreiber Braum Consulting, Einzelunternehmen (Angabe 13.10.2026); AboutExport als Marke | erledigt – Anschrift vor Go-live bestätigen |
| L3 | USt-IdNr. (§ 27a UStG) **nur falls vorhanden** – `legal.vatId` oder `legal.noVatId = true`. Persönliche Steuer-ID **nicht** einsetzen. | **offen – Blocker** |
| L4 | Erklärung zur Verbraucherstreitbeilegung: erforderlich/gewünscht? (§ 36 VSBG nur > 10 Beschäftigte, B2B-Angebot) | offen – prüfen |
| L5 | Persönliche Steuer-ID entfernt | erledigt (12.10.2026) |

## 2. Datenschutzerklärung (`src/pages/datenschutz.astro`)

| # | Punkt | Status |
|---|---|---|
| D1 | VPS-Anbieter (Name, Anschrift) – `legal.hosting` | **offen – Blocker** |
| D2 | Serverstandort – `legal.hosting.serverLocation` | **offen – Blocker** |
| D3 | SMTP: Brevo (Sendinblue SAS) und Cloudflare (DNS/Proxy/Email Routing) eingetragen; Ziel-Postfach-Anbieter fehlt – `legal.mailbox` | **offen – Blocker** (Postfach) |
| D4 | Auftragsverarbeitungsverträge (Art. 28 DSGVO): VPS-Hoster, Brevo, Cloudflare, Postfach-Anbieter | **offen – Blocker** |
| D5 | Log-Retention des Reverse Proxy – `legal.logRetentionDays`, passend zur Proxy-Konfiguration (App loggt keine IPs) | **offen – Blocker** |
| D6 | Drittlandtransfer USA über Cloudflare (EU-U.S. DPF) im Text ergänzt; Postfach-Anbieter noch zu prüfen | teilweise erledigt |
| D7 | Waitlist: Rechtsgrundlage (Art. 6 Abs. 1 lit. b DSGVO) und Speicherdauer bestätigen | offen – prüfen |
| D8 | Texte sind ein Entwurf zur rechtlichen Freigabe, nicht rechtlich geprüft | **offen – Blocker** |
| D9 | AGB/Nutzungsbedingungen – vor dem kommerziellen Launch erforderlich | offen (Launch 2027) |

Die internen Prüfhinweise wurden von der Website entfernt (`ReviewNote` gelöscht). Diese Tabelle ersetzt sie.

## 3. Steuer-ID in der Git-Historie

**Bereinigt am 13.10.2026.** Die persönliche Steuer-ID wurde mit `git filter-repo --replace-text` aus allen
Commits von `main`, `claude/gifted-rubin-gua47p` (PR #1) und `claude/sweet-bardeen-r6yjlw` (PR #2) entfernt
(betroffen waren `src/pages/impressum.astro` und frühere Stände dieser Datei). Die Branches wurden per
`--force-with-lease` aktualisiert; alle Commit-SHAs vor dem 13.10.2026 haben sich dadurch geändert.
Ein Backup des alten Stands liegt ausschließlich lokal und nicht öffentlich.

Verbleibend außerhalb unserer Kontrolle:

| # | Punkt | Status |
|---|---|---|
| H1 | GitHub hält alte Objekte über PR-Refs (`refs/pull/*`), Caches und direkte Commit-URLs der alten SHAs vorerst erreichbar → GitHub Support „Remove sensitive data“ beauftragen | **offen – manuell** |
| H2 | Bestehende lokale Clones (auch anderer Sessions) enthalten die alte Historie → nicht mehr pushen, neu klonen | offen |
| H3 | Forks: zum Zeitpunkt der Bereinigung keine vorhanden | erledigt |

Hinweis: Bereits veröffentlichte Daten lassen sich aus fremden Clones oder Caches nicht zuverlässig entfernen.

## 4. Repository-Einstellungen (manuell)

| # | Punkt | Status |
|---|---|---|
| R1 | Default-Branch auf `main` umgestellt | erledigt (13.10.2026) |
| R2 | Branch Protection für `main`: CI-Checks als „required“ markieren (Settings → Branches) | empfohlen |

## 5. Inhalte

| # | Punkt | Status |
|---|---|---|
| C1 | Produkt-Visualisierungen sind Konzeptdarstellungen (gekennzeichnet) – echte Screenshots zum Launch | offen (Launch) |
| C2 | BAFA-Artikel: regulatorische Aussagen fachlich prüfen, Quellen-Linktexte korrigieren, Stockfoto-Lizenz | offen |
| C3 | Vision-Artikel: Quellenumfang abgleichen | offen |
| C4 | Unbestätigte Konditionen (dauerhafter Rabatt, nur erste Anmeldungen, 14 Tage Test) | erledigt (neutralisiert) |
