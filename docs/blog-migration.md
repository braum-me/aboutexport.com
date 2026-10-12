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
  gerenderten Artikeltext Wort für Wort mit dem Original.
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

## Redaktionelle Prüfung (offen)

Pro Artikel im Frontmatter unter `review.notes`, auf der Seite als gelber Prüfhinweis sichtbar. Ausblenden für die
Produktion: `review.status: done` setzen oder beim Build `HIDE_EDITORIAL_NOTES=true`.

**BAFA-Artikel**
- Regulatorische Aussagen bei der Migration nicht erneut fachlich geprüft.
- Zeitgebunden: Verlängerung der Allgemeinen Genehmigungen „bis 31. März 2027“, „20. Sanktionspaket in Arbeit“.
- Quellenangabe: Linktexte passen nicht zu den Linkzielen.
- Produktaussagen („Echtzeit“, „20 % Rabatt auf jeden Plan“) weichen von der aktuellen Positionierung ab.
- Beitragsbild ist ein Stockfoto – Lizenz für die weitere Nutzung prüfen.

**Waitlist-Artikel**
- „49 € pro Monat und Nutzer“ vs. bestätigtes Modell „pro Region“.
- Rabatt „dauerhaft“ / „für die ersten Anmeldungen“ vs. „Konditionen werden vor Launch mitgeteilt“.
- „14 Tage kostenlos“ vs. „Testzeitraum vorgesehen“.
- „Finale Entwicklungsphase“ – Launch inzwischen 2027.
- Kontaktadresse `info@aboutexport.de` vs. `info@aboutexport.com`.

**Vision-Artikel**
- „Finale Entwicklungsphase“ – Launch inzwischen 2027.
- Genannte Quellen mit tatsächlichem Quellenumfang abgleichen.
- Meta-Beschreibung duzt, Artikel siezt.

## Gelöschte Inhalte

Keine. Es wurde kein Artikel entfernt.
