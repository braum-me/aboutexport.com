# Blog-Migration WordPress → Astro

Stand: 12.10.2026 · Quelle: Live-Website https://aboutexport.com (WordPress REST API `wp-json/wp/v2`, Yoast-Sitemaps)

## Inventur

| WP-ID | URL (unverändert) | Titel | Veröffentlicht (UTC) | Geändert (UTC) | Kategorie | Status |
|---|---|---|---|---|---|---|
| 2181 | `/bafa-exportkontrolle-april-2026/` | Keine Schonfrist mehr: Was die neuen BAFA-Regeln für Ihre Export Compliance bedeuten | 2026-04-04 19:22:53 | 2026-04-04 19:31:36 | Regulierung & Recht | migriert |
| 2165 | `/aboutexport-waitlist-early-access/` | AboutExport öffnet die Waitlist – sichern Sie sich jetzt Ihren frühen Zugang | 2026-04-04 17:02:33 | 2026-04-04 17:06:38 | Produktnews | migriert |
| 2033 | `/vision-export-compliance-monitoring/` | Warum wir AboutExport gebaut haben – und was wir gemeinsam daraus machen | 2026-04-04 10:12:22 | 2026-04-04 19:58:29 | Produktnews | migriert |

Weitere Inhalte geprüft: keine Entwürfe öffentlich abrufbar, Post-Type `portfolio` leer, keine Tags, keine weiteren
Seiten außer Startseite. Die API meldet `X-WP-Total: 3`.

Maschinenlesbare Inventur inkl. SEO-Titel, Meta-Beschreibung und Original-Bild-URL:
`tests/fixtures/blog/wordpress-inventory.json`. Klartext der Originale: `tests/fixtures/blog/*.txt`.

## Was übernommen wurde

- **Inhalt:** per pandoc aus dem WordPress-HTML nach Markdown (`src/content/blog/*.md`). Ein E2E-Test vergleicht den
  gerenderten Artikeltext Wort für Wort mit dem Original zuzüglich der dokumentierten Korrekturen.
- **Daten:** Original-Veröffentlichungs- und Änderungsdatum (UTC) aus WordPress; keine automatische Aktualisierung.
- **SEO:** Yoast-Titel (`seoTitle`, unverändert) und Yoast-Meta-Beschreibung (`description`), Excerpt, Kategorie.
- **Beitragsbilder:** lokal unter `public/images/blog/` (WebP für die Seite, 1200×630-JPEG für Open Graph).
- **Autor:** WordPress-Benutzer `aboutadmin`; alle Artikel sind mit „Das AboutExport Team“ gezeichnet → `author: AboutExport Team`.

## Technische Anpassungen (keine inhaltlichen Änderungen)

| Änderung | Grund |
|---|---|
| Links `https://aboutexport.com/#waitlist` → `/#waitlist` | gleiches Ziel, relative interne Links |
| `<a target="_blank">`-HTML → Markdown-Links | externe Links erhalten `target`/`rel` automatisch (`src/lib/external-links-plugin.mjs`) |
| Trennlinien als `---` | Markdown-Äquivalent zu `<hr>` |
| Alt-Texte der Beitragsbilder neu | Original leer bzw. unzutreffend („Export Control Alerts Dashboard“ bei einem Logo-Bild) |
| Smart Punctuation deaktiviert | Originaltext zeichengenau erhalten |

## URLs und Weiterleitungen

| Alte URL | Neue URL | Status |
|---|---|---|
| `/<slug>/` (3 Artikel) | unverändert | 200 |
| `/blog/` | unverändert | 200 |
| `/category/news/`, `/category/regulierung/` | unverändert | 200 |
| `/feed/` | unverändert (RSS 2.0) | 200 |
| `/category/export-compliance/` | `/blog/` | 301 (Kategorie ohne Beiträge) |
| `/category/maerkte-regionen/` | `/blog/` | 301 (Kategorie ohne Beiträge) |
| `/author/aboutadmin/` | `/blog/` | 301 (Autorenarchiv entfällt) |
| `/Datenschutz/` | `/datenschutz/` | 301 |
| URLs ohne Slash | mit Slash | 301 (wie WordPress) |

Nicht übernommen: WordPress-Kurzlinks (`/?p=<id>`), Anhang-Seiten und `/wp-content/uploads/…`-Bild-URLs.

## Historische Inhalte

- **Regulierungsmeldung** (BAFA): sichtbarer Hinweis „Historische Regulierungsmeldung · Stand 4. April 2026“, keine Rechtsberatung.
- **Produktnews:** Hinweis „Archivbeitrag · Planungsstand“ mit Verweis auf aktuelle Preise/FAQ.
- Der Originaltext bleibt unverändert; überholte Aussagen werden nur markiert.

## Nachträgliche Korrekturen (12.10.2026, freigegeben)

Veröffentlichungsdatum unverändert. `updatedDate` auf das Korrekturdatum gesetzt, WordPress-Änderungsdatum unter
`legacy.modifiedDate` erhalten. Jede Änderung steht als `from`/`to` unter `corrections` im Frontmatter; die
Zusammenfassung erscheint im Artikel als „Nachträglich aktualisiert … Ursprünglich veröffentlicht am …“.

| Artikel | Original | Korrigiert |
|---|---|---|
| Waitlist | „Jede Region kostet 49 € pro Monat und Nutzer“ | „Jede Region kostet 49 € pro Monat“ |
| Waitlist | `info@aboutexport.de` | `info@aboutexport.com` |
| Waitlist | „…befindet sich in der finalen Entwicklungsphase einer ersten Validierungsversion.“ | „…befindet sich in der Entwicklung einer ersten Validierungsversion; der Launch ist für 2027 geplant.“ |
| Vision | „Wir befinden uns in der finalen Entwicklungsphase einer ersten Validierungsversion des Produkts.“ | „Wir befinden uns in der Entwicklung einer ersten Validierungsversion des Produkts; der Launch ist für 2027 geplant.“ |

### Zweite Korrekturrunde (12.10.2026): nicht bestätigte Produktaussagen

Verbindlich bestätigt sind nur: Launch 2027, 49 € pro Region/Monat, 490 € pro Region/Jahr, 20 % Early-Access-Rabatt,
Regionen EU/USA/China. Alles darüber hinaus wurde neutralisiert und als Korrektur ausgewiesen:

| Artikel | Vorher | Nachher |
|---|---|---|
| Waitlist | „… – dauerhaft, nicht nur im ersten Monat. Dieser Vorteil gilt für alle zum Launch verfügbaren Abonnements, unabhängig von Region oder Laufzeit.“ | „Die verbindlichen Konditionen, etwa zur Laufzeit des Rabatts, teilen wir vor dem Launch mit.“ |
| Waitlist | „Jeder neue Nutzer erhält zudem 14 Tage kostenlosen Zugang – ohne Kreditkarte, ohne Verpflichtung.“ | „Ob und in welcher Form es einen Testzugang geben wird, teilen wir vor dem Launch mit.“ |
| Waitlist | „… und der 20 % Frühbucher-Rabatt gilt für die ersten Anmeldungen.“ | „… für Mitglieder ist ein Early-Access-Rabatt von 20 % vorgesehen; die verbindlichen Konditionen teilen wir vor dem Launch mit.“ |
| BAFA | Überschrift „Echtzeit-Monitoring als Antwort“ | „Automatisiertes Monitoring als Antwort“ |
| BAFA | „Unsere Plattform überwacht automatisch … Export Control Alerts in Echtzeit … keine übersehenen Änderungen.“ | „Ab dem geplanten Launch 2027 prüft die Plattform die Quellen der gebuchten Regionen laufend automatisiert …“ |
| BAFA | „AboutExport stellt sicher, dass Sie informiert sind – bevor es zum Problem wird.“ | „AboutExport soll Ihnen helfen, solche Änderungen frühzeitig zu erkennen.“ |

Im BAFA-Artikel wurde **nur der abschließende Produktabsatz** geändert (per Unit-Test abgesichert). Die
regulatorischen Aussagen sind unverändert und werden nur nach Quellenprüfung angepasst. `pubDate` bleibt bei allen
Artikeln erhalten.

## Redaktionelle Prüfung (intern)

Pro Artikel im Frontmatter unter `review.notes` (offen) und `review.resolved` (erledigt). Die Hinweise werden
**nicht** auf der Website angezeigt. Offene Punkte:

**BAFA-Artikel**
- Regulatorische Aussagen bei der Migration nicht erneut fachlich geprüft.
- Zeitgebunden: Verlängerung der Allgemeinen Genehmigungen „bis 31. März 2027“, „20. Sanktionspaket in Arbeit“.
- Quellenangabe: Linktexte passen nicht zu den Linkzielen.
- Beitragsbild ist ein Stockfoto – Lizenz für die weitere Nutzung prüfen.

**Vision-Artikel**
- Genannte Quellen mit tatsächlichem Quellenumfang abgleichen.
- Meta-Beschreibung duzt, Artikel siezt.

## Gelöschte Inhalte

Keine. Es wurde kein Artikel entfernt.
