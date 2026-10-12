# Release-Blocker (Stand 12.10.2026)

Diese Punkte müssen vor einer **öffentlichen Veröffentlichung** (Deployment auf aboutexport.com) erledigt sein.
Sie blockieren nicht den Merge der PRs nach `main`, solange nicht deployt wird.

Es wurden **keine** Angaben erfunden. Wo eine Information fehlt, steht sie hier – nicht als Platzhalter auf der Website.

## 1. Impressum (`src/pages/impressum.astro`)

| # | Punkt | Status |
|---|---|---|
| L1 | Vollständiger Vor- und Nachname des Inhabers (§ 5 DDG, Einzelunternehmen) fehlt | **offen – Blocker** |
| L2 | Rechtsform prüfen („A Brand of Braum Consulting“ ist keine Rechtsform) | **offen – Blocker** |
| L3 | Steuerliche Pflichtangaben: USt-IdNr. (§ 27a UStG) bzw. W-IdNr., **falls vorhanden**, ergänzen. Ohne USt-IdNr. entfällt die Angabe. Persönliche Steuer-ID **nicht** wieder einsetzen. | **offen – Blocker** |
| L4 | Erklärung zur Verbraucherstreitbeilegung: erforderlich/gewünscht? (§ 36 VSBG nur > 10 Beschäftigte, B2B-Angebot) | offen – prüfen |
| L5 | Persönliche Steuer-ID entfernt | erledigt (12.10.2026) |

## 2. Datenschutzerklärung (`src/pages/datenschutz.astro`)

| # | Punkt | Status |
|---|---|---|
| D1 | Hosting-Anbieter (Name, Anschrift) ergänzen | **offen – Blocker** |
| D2 | Serverstandort angeben | **offen – Blocker** |
| D3 | SMTP-/E-Mail-Anbieter (Name, Anschrift) ergänzen | **offen – Blocker** |
| D4 | Auftragsverarbeitungsverträge (Art. 28 DSGVO) mit Hoster und SMTP-Anbieter abschließen | **offen – Blocker** |
| D5 | Log-Retention: Text nennt „höchstens 30 Tage“ – gegen tatsächliche Konfiguration von Reverse Proxy/Hoster prüfen | **offen – Blocker** |
| D6 | Drittlandtransfers: Text sagt „nicht vorgesehen“ – nach Anbieterwahl verifizieren | **offen – Blocker** |
| D7 | Waitlist: Rechtsgrundlage (Art. 6 Abs. 1 lit. b DSGVO) und Speicherdauer bestätigen | offen – prüfen |
| D8 | Gesamter Text ist ein Entwurf („Stand: Oktober 2026 (Entwurf)“), nicht rechtlich geprüft | **offen – Blocker** |
| D9 | AGB/Nutzungsbedingungen – vor dem kommerziellen Launch erforderlich | offen (Launch 2027) |

Die internen Prüfhinweise wurden von der Website entfernt (`ReviewNote` gelöscht). Diese Tabelle ersetzt sie.

## 3. Steuer-ID in der Git-Historie

Die persönliche Steuer-ID stand in `src/pages/impressum.astro` und ist im aktuellen Stand entfernt. Sie ist aber in
der **Historie** enthalten (öffentliches Repository):

- **`src/pages/impressum.astro`:** in allen Commits seit `0a3cbb5` (Einführung, liegt auf `main`) bis
  einschließlich `2f4793f` (PR #1) bzw. `88b2d2b` (PR #2).
- **`docs/release-blockers.md`:** versehentlich im Bereinigungsbeispiel dieser Datei in `9c21240`, `cedbb19`,
  `7215821` (PR #1) sowie `a1d72b9`, `4bcfa22` (PR #2); im aktuellen Stand entfernt.

Prüfen (lokal, ID nicht in Dateien speichern): `git log --all --oneline -S "<Steuer-ID>"`.
`git filter-repo --replace-text` (unten) erfasst beide Fundstellen.

Zusätzlich hält GitHub die PR-Refs (`refs/pull/1/head`, `refs/pull/2/head`) – die kann man selbst nicht umschreiben.

### Empfohlenes Vorgehen (erst nach ausdrücklicher Freigabe, nicht automatisiert)

1. **Sofortmaßnahme (reversibel):** Repository auf *private* stellen (Settings → General → Danger Zone →
   Change visibility). Stoppt die weitere öffentliche Abrufbarkeit, ohne die Historie anzufassen.
2. **Nach dem Merge beider PRs** (damit keine offenen PRs auf alte SHAs zeigen):
   ```bash
   # frischer Mirror-Clone, nie im Arbeits-Clone
   git clone --mirror https://github.com/braum-me/aboutexport.com.git ae-mirror.git
   cd ae-mirror.git
   # Steuer-ID nur lokal eintragen – niemals in eine Datei im Repository schreiben
   read -r -p 'Steuer-ID (wie im alten Impressum): ' TAXID
   printf '%s==>[entfernt]\n' "$TAXID" > ../replacements.txt
   git filter-repo --replace-text ../replacements.txt
   git grep -n -F "$TAXID" $(git rev-list --all) || echo "sauber"
   rm ../replacements.txt
   git push --force --mirror origin   # Force-Push – nur mit Freigabe
   ```
3. **GitHub Support** kontaktieren („Remove sensitive data“), damit gecachte Ansichten und die PR-Refs gelöscht
   werden. Ablauf: <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository>
4. Alle lokalen Clones neu klonen; Forks prüfen (Settings → Insights → Forks).

Hinweis: Eine bereits veröffentlichte Steuer-ID lässt sich nicht „zurückholen“ (Clones, Caches). Die Steuer-ID
ist allein wenig missbrauchsanfällig, sollte aber nicht öffentlich stehen. Ob ein Austausch beim Finanzamt nötig
ist: nein, die Steuer-ID ist lebenslang fest.

## 4. Repository-Einstellungen (manuell)

| # | Punkt | Status |
|---|---|---|
| R1 | Default-Branch ist `claude/gifted-rubin-gua47p` statt `main` → Settings → General → Default branch → `main`. Mit den verfügbaren Tools nicht änderbar. | **offen – vor Merge** |
| R2 | Branch Protection für `main`: CI-Checks als „required“ markieren (Settings → Branches) | empfohlen |

## 5. Inhalte

| # | Punkt | Status |
|---|---|---|
| C1 | Produkt-Visualisierungen sind Konzeptdarstellungen (gekennzeichnet) – echte Screenshots zum Launch | offen (Launch) |
| C2 | BAFA-Artikel: regulatorische Aussagen fachlich prüfen, Quellen-Linktexte korrigieren, Stockfoto-Lizenz | offen |
| C3 | Vision-Artikel: Quellenumfang abgleichen | offen |
| C4 | Unbestätigte Konditionen (dauerhafter Rabatt, nur erste Anmeldungen, 14 Tage Test) | erledigt (neutralisiert) |
