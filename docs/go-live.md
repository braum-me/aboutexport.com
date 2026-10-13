# Go-live: Ablösung von WordPress durch die neue Website

Grundsatz: **WordPress bleibt unverändert lauffähig, bis die neue Website öffentlich erfolgreich läuft.**
Der Wechsel erfolgt ausschließlich über den Origin des Cloudflare-DNS-Eintrags – Rollback = Origin zurückstellen.
Keine Änderung an DNS, VPS oder WordPress ohne ausdrückliche Freigabe.

## 0. Voraussetzungen (Go/No-Go)

- [ ] `npm run release:check` grün (alle Pflichtangaben in `src/config/legal.ts` bestätigt)
- [ ] Rechtstexte durch rechtliche Prüfung freigegeben, BAFA-Artikel fachlich geprüft (`docs/release-blockers.md`)
- [ ] CI auf `main` grün (Check, Lint, Unit, Build, E2E, Docker-Smoke-Test)
- [ ] Brevo-SMTP-Schlüssel erzeugt, DPA mit Brevo abgelegt; Cloudflare-DPA (Teil der Cloudflare-Bedingungen) und VPS-AVV vorhanden
- [ ] Zuständigkeit und Zeitfenster festgelegt (außerhalb der Geschäftszeiten, 60 min einplanen)

## 1. Staging-Test (ohne DNS-Änderung)

1. Auf dem VPS: `deploy/deploy.sh` (Container bindet nur an `127.0.0.1:4321`, öffentlich unsichtbar).
2. `deploy/smoke-test.sh` auf dem VPS.
3. Vom eigenen Rechner per SSH-Tunnel ansehen: `ssh -L 4321:127.0.0.1:4321 <vps>` → <http://localhost:4321>
   (Desktop + Smartphone-Emulation: Navigation, Preise, ROI-Rechner, Blog, Rechtstexte).
4. Reverse-Proxy-Vhost für `aboutexport.com` anlegen und lokal testen, ohne DNS zu ändern:
   `curl -sI --resolve aboutexport.com:443:<VPS-IP> https://aboutexport.com/` (erwartet 200, `content-encoding` bei `-H 'Accept-Encoding: br'`).

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

- [ ] Vollbackup **Dateien + Datenbank** (bestehendes Backup-Plugin bzw. Hoster-Snapshot), Download lokal ablegen
- [ ] Export der Medien (`wp-content/uploads`) und der Yoast-Einstellungen
- [ ] Aktuelle Cloudflare-DNS-Einträge exportieren (DNS → Export) – **Origin-IP von WordPress notieren**
- [ ] Wiederherstellung einmal stichprobenartig prüfen (Backup-Archiv öffnet, DB-Dump nicht leer)

## 5. Cutover (DNS / Reverse Proxy)

1. Reverse Proxy auf dem VPS mit gültigem Origin-Zertifikat aktiv (Schritt 1.4 erfolgreich).
2. Cloudflare → DNS: `aboutexport.com` und `www` A/AAAA auf die VPS-IP ändern, **Proxied bleibt an**.
   Bei Proxied-Einträgen greift die Änderung praktisch sofort (keine TTL-Wartezeit).
   *Falls WordPress auf demselben VPS läuft:* statt DNS den Proxy-Vhost von WordPress auf `127.0.0.1:4321` umstellen.
3. MX-, TXT-, DKIM-, DMARC-Einträge und Email Routing **nicht anfassen**.
4. Cloudflare-Cache leeren (Caching → Purge Everything), damit keine WordPress-Assets ausgeliefert werden.

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
| Neue Version fehlerhaft, Vorversion ok | `deploy/rollback.sh` | < 1 min |
| Neue Website grundsätzlich nicht tragfähig | Cloudflare-DNS auf notierte WordPress-Origin-IP zurück (bzw. Proxy-Vhost zurück), Cache leeren | < 5 min |
| E-Mail-Versand gestört | SMTP-Werte in `.env` korrigieren, `docker compose up -d` – Website bleibt online, Formulare melden Fehler statt Daten zu verlieren | < 5 min |

WordPress **mindestens 30 Tage** nach erfolgreichem Go-live unverändert weiterlaufen lassen (nur über die alte IP
erreichbar), erst danach – nach separater Freigabe – abschalten und Backups archivieren.

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
