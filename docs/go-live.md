# Go-live: Ablösung von WordPress durch die neue Website

Grundsatz: **WordPress bleibt unverändert lauffähig, bis die neue Website öffentlich erfolgreich läuft.**
WordPress und die neue Website laufen auf demselben VPS (OVH, Coolify/Traefik). Der Wechsel ist ein **Domain-Tausch
zwischen zwei Coolify-Ressourcen** – DNS, MX und Email Routing bleiben unverändert. Rollback = Domains zurücktauschen.
Keine Änderung an DNS, VPS oder WordPress ohne ausdrückliche Freigabe.

## 0. Voraussetzungen (Go/No-Go)

- [ ] `npm run release:check` grün (alle Pflichtangaben in `src/config/legal.ts` bestätigt)
- [ ] Rechtstexte durch rechtliche Prüfung freigegeben, BAFA-Artikel fachlich geprüft (`docs/release-blockers.md`)
- [ ] CI auf `main` grün (Check, Lint, Unit, Build, E2E, Docker-Smoke-Test)
- [ ] Brevo-SMTP-Schlüssel erzeugt; AV-Verträge abgelegt: Brevo (DPA im Konto), Cloudflare (DPA, Teil der Bedingungen), OVH (DPA, Teil der Bedingungen), Microsoft (Products and Services DPA)
- [ ] Zuständigkeit und Zeitfenster festgelegt (außerhalb der Geschäftszeiten, 60 min einplanen)

## 1. Staging-Test (ohne DNS-Änderung)

**Erst nach ausdrücklicher Freigabe.**

1. Read-only-Bestandsaufnahme (`docs/deployment.md`, Abschnitt 1) auswerten: WordPress-Router-Regeln, Domains,
   Access-Logs, Docker-Rotation.
2. Coolify-Anwendung anlegen wie in `docs/deployment.md`, Abschnitt 3 (Build Pack Docker Compose, **keine Domain**,
   kein Port-Mapping, Auto Deploy aus) und deployen. Der Container ist öffentlich nicht erreichbar.
3. Per SSH-Tunnel auf die Container-IP ansehen (`docs/deployment.md`, „Staging-Zugriff“) → <http://localhost:4321>,
   `deploy/smoke-test.sh http://localhost:4321`, Desktop + Smartphone-Emulation: Navigation, Preise, ROI-Rechner,
   Blog, Rechtstexte.
4. Coolify-Logs der Ressource prüfen: Build ok, Healthcheck „healthy“, keine Fehler.

## 2. SMTP-Verifikation (echte Zustellung)

1. Auf Staging (Tunnel) je ein Kontakt- und Waitlist-Formular mit eigener Adresse absenden.
2. Im Ziel-Postfach prüfen: Mail angekommen, Absender `noreply@aboutexport.com`, `Reply-To` = eingegebene Adresse.
3. Header prüfen: `dkim=pass header.d=aboutexport.com`, `dmarc=pass` (Authentication-Results).
4. Container-Log: `{"scope":"forms","outcome":"delivered"}` – keine personenbezogenen Daten im Log.
5. Fehlerfall gegenprüfen: Formular mit falschem SMTP-Passwort → Seite zeigt Fehlermeldung (502), keine Erfolgsmeldung.

## 3. Rechts- und Content-Freigabe

- Impressum / Datenschutz final (Angaben aus `src/config/legal.ts`), Stand-Datum aktualisieren
- Blog: drei Artikel, Korrektur-Hinweise, Archiv-Hinweise; keine internen Prüfhinweise sichtbar (E2E prüft das)
- Preise: 49 € / Region / Monat, 490 € / Region / Jahr, 20 % Early-Access, EU/USA/China, Launch 2027

## 4. Backup der bestehenden WordPress-Seite

- [ ] OVH-Snapshot des VPS (Kunden-Panel → VPS → Snapshot) unmittelbar vor dem Cutover
- [ ] Vollbackup **Dateien + Datenbank** der WordPress-Ressource (Coolify-Backup der DB bzw. `mysqldump` + Volume `wp-content`), lokal ablegen
- [ ] Coolify-Einstellungen der WordPress-Ressource notieren (Domains, Variablen) – Grundlage für den Rollback
- [ ] Cloudflare-DNS exportieren (DNS → Export) als Referenz
- [ ] Wiederherstellung stichprobenartig prüfen (Archiv öffnet, DB-Dump nicht leer)

## 5. Cutover (DNS / Reverse Proxy)

Downtime: wenige Sekunden bis ca. 1 Minute (Traefik übernimmt neue Labels nach dem Redeploy).

1. Coolify → WordPress-Ressource: Domains `https://aboutexport.com,https://www.aboutexport.com` **notieren und entfernen**,
   als Ersatz eine interne Domain lassen oder leer; *Redeploy* (WordPress läuft weiter, nur nicht mehr öffentlich).
2. Coolify → neue Ressource: Domains `https://aboutexport.com,https://www.aboutexport.com` eintragen,
   Redirect-Einstellung „www → non-www“, *Redeploy*. Vorher geprüft: keine weitere Router-Regel/dynamische
   Traefik-Konfiguration beansprucht aboutexport.com (Bestandsaufnahme Abschnitt 1).
3. Cloudflare-DNS, MX, TXT, DKIM, DMARC und Email Routing **nicht anfassen**.
4. Cloudflare-Cache leeren (Caching → Purge Everything), damit keine WordPress-Assets ausgeliefert werden.
5. Erst jetzt ggf. Auto Deploy der neuen Ressource aktivieren (dann deployt jeder Merge auf `main`).

## 6. Smoke-Test nach Veröffentlichung

```bash
deploy/smoke-test.sh https://aboutexport.com
```

Zusätzlich manuell (Desktop + Mobil): Startseite, Preisrechner, ROI-Rechner, Blog + 3 Artikel, Impressum, Datenschutz,
ein echtes Kontaktformular → Eingang im Postfach. Danach:

- Google Search Console: Sitemap `https://aboutexport.com/sitemap.xml` einreichen (alte `sitemap_index.xml` leitet weiter)
- URL-Prüfung für Startseite und die drei Artikel
- Test-Mail an info@aboutexport.com von extern → Email Routing funktioniert unverändert
- 24 h beobachten: `docker logs aboutexport-web`, Cloudflare Analytics (4xx/5xx), Search-Console-Fehler

## 7. Rollback

| Situation | Maßnahme | Dauer |
|---|---|---|
| Neue Version fehlerhaft, Vorversion ok | Coolify → neue Ressource → *Rollback* auf vorheriges Deployment | < 1 min |
| Neue Website grundsätzlich nicht tragfähig | Domains in Coolify zurücktauschen (neue Ressource leeren, WordPress-Domains wieder eintragen, beide redeployen), Cloudflare-Cache leeren | < 5 min |
| VPS/Coolify beschädigt | OVH-Snapshot von vor dem Cutover zurückspielen | 15–30 min |
| E-Mail-Versand gestört | SMTP-Werte in `.env` korrigieren, `docker compose up -d` – Website bleibt online, Formulare melden Fehler statt Daten zu verlieren | < 5 min |

WordPress **mindestens 30 Tage** nach erfolgreichem Go-live als Coolify-Ressource ohne öffentliche Domain stehen lassen,
erst danach – nach separater Freigabe – stoppen, Backups archivieren und die Ressource löschen.

## SEO-Cutover-Checkliste

- [x] Alle URLs aus den Yoast-Sitemaps liefern 200 (Startseite, `/blog/`, 3 Artikel, 2 Kategorien, Rechtstexte)
- [x] Originale Artikel-Slugs, Titles, Descriptions und Canonicals identisch zur WordPress-Seite
- [x] 301 in **einem** Schritt: entfernte Kategorien/Autor → `/blog/`, WordPress-Feeds → `/feed/`,
      Yoast-Sitemaps → `/sitemap.xml`, `/cookie-richtlinie/` → `/datenschutz/`, `/blog/page/N/` → `/blog/`
- [x] URLs ohne Slash → 301 auf Slash-Variante (wie WordPress)
- [x] `sitemap.xml`, `robots.txt` (mit Sitemap-Verweis), RSS unter `/feed/`
- [x] Open Graph + Twitter Cards, JSON-LD (`BlogPosting`, `BreadcrumbList`, `Organization`), `og:type=article` für Artikel
- [x] Lighthouse SEO 100 (Desktop + Mobil)
- [ ] Nach Go-live: Sitemap in der Search Console einreichen, Indexierung der 3 Artikel prüfen
- [ ] Nach 2–4 Wochen: Search Console auf 404/Soft-404 prüfen; bewusst ohne Ziel: `/wp-content/uploads/*` (alte Bild-URLs)
