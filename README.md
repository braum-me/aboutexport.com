# AboutExport – Marketing-Website (Launch 2027)

Marketing-Website für **AboutExport** (Export Control Monitoring für EU, USA und China).
Kein SaaS-Produkt – nur die öffentliche Website mit Waitlist und Kontaktformular.

| | |
|---|---|
| Framework | Astro 7 (statische Seiten), TypeScript (strict) |
| Styling | Tailwind CSS 4, Inter (self-hosted), Lucide Icons (SVG inline) |
| Server | Node.js 22, `@astrojs/node` – nur `/api/waitlist` und `/api/contact` laufen serverseitig |
| E-Mail | Nodemailer via SMTP (Konfiguration über ENV) |
| Tests | Vitest (Unit), Playwright (E2E inkl. lokalem SMTP-Sink), ESLint, `astro check` |
| Tracking / Cookies | keine |

## Schnellstart

```bash
npm ci
cp .env.example .env      # SMTP-Werte eintragen
npm run dev               # http://localhost:4321 (Formulare brauchen SMTP-ENV im Shell-Env)
```

Produktions-Build lokal:

```bash
npm run build
set -a; source .env; set +a
npm start                 # node server.mjs → http://localhost:4321
```

## Projektstruktur

```
src/
  config/        pricing.ts (Single Source of Truth für Preise & Rabatt), roi.ts, content.ts, site.ts
  lib/           pricing.ts, roi.ts, format.ts, validation.ts, mail.ts, submit.ts, rateLimit.ts, api.ts
  scripts/       Client-Skripte (Preisrechner, ROI-Rechner, Formulare)
  components/    ui/ (Button, Screenshot, StatusBadge …), sections/ (Hero, Pricing, RoiCalculator …), mocks/
  pages/         index, impressum, datenschutz, 404, anfrage-*, api/*, sitemap.xml
public/images/
  product/       Produkt-Screenshots (z. B. dashboard.webp)
  features/      Feature-Screenshots (alerts.webp, newsfeed.webp, ai-summary.webp, translation.webp)
  branding/      Logo, Icon, OG-Image
server.mjs       Produktions-Server (Security-Header, /healthz, Forwarded-Header-Handling)
tests/unit, tests/e2e
```

## Screenshots austauschen

Alle Produktbilder laufen über `src/components/ui/Screenshot.astro`. Fehlt die Datei unter `public/`, wird
automatisch das Konzept-Mockup mit dem Hinweis *„Konzeptdarstellung – kein Screenshot des finalen Produkts“*
gezeigt. Sobald eine Datei existiert, wird sie beim nächsten Build verwendet (Seitenverhältnis fix → kein Layout Shift):

| Datei | Verwendung | Format |
|---|---|---|
| `public/images/product/dashboard.webp` | Hero | 16:10, ≥ 1600 px breit |
| `public/images/features/alerts.webp` | Feature „Alerts“ | 4:3 |
| `public/images/features/newsfeed.webp` | Feature „Newsfeed“ | 4:3 |
| `public/images/features/ai-summary.webp` | Feature „KI-Zusammenfassung“ | 4:3 |
| `public/images/features/translation.webp` | Feature „Übersetzung“ | 4:3 |

Bilder vorab als WebP optimieren (z. B. `cwebp -q 82`). Es gibt bewusst keinen Image-Endpoint und keine
Bildverarbeitungs-Dependency.

## Preise & Rabatt

Alle Preise stehen ausschließlich in `src/config/pricing.ts`:

- 49 € pro Region/Monat, 490 € pro Region/Jahr, 1–3 Regionen (EU, USA, China)
- `earlyAccessDiscount` (`enabled`, `percent`, `label`, `note`) – Rabatt an/aus bzw. Prozentsatz hier ändern
- Preisrechner, ROI-Rechner, FAQ-Texte und Tests lesen dieselbe Konfiguration

## ROI-Rechner

Konfiguration in `src/config/roi.ts` (Defaults: 30 min/Tag, 65 €/h, 2 Regionen, jährlich; 220 Arbeitstage).

```
Manuelle Kosten/Jahr = Minuten/Tag ÷ 60 × Stundensatz × Arbeitstage
Abokosten/Jahr       = Regionen × Jahrespreis (monatlich: 12 × Monatspreis), optional − Early-Access-Rabatt
Ersparnis            = Manuelle Kosten − Abokosten   (negativ → als „Mehrkosten“ angezeigt)
ROI                  = Ersparnis ÷ Abokosten × 100
```

Ungültige Eingaben (negativ, leer, außerhalb der Grenzen) werden markiert, es wird kein Ergebnis angezeigt.

## Formulare & SMTP

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `SMTP_HOST` | ja | SMTP-Server |
| `SMTP_PORT` | nein (587) | 587 = STARTTLS (erzwungen), 465 = TLS |
| `SMTP_USER` / `SMTP_PASSWORD` | je nach Server | Zugangsdaten |
| `SMTP_FROM` | ja | Absender, z. B. `AboutExport Website <noreply@aboutexport.com>` |
| `CONTACT_RECIPIENT` | nein | Fester Empfänger, Default `info@aboutexport.com` |
| `SMTP_SECURE` | nein | TLS explizit erzwingen/abschalten |
| `TRUST_PROXY` | nein | `true` nur hinter Reverse Proxy (X-Forwarded-For für Rate Limiting) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | nein | Default 5 Anfragen / 10 min je IP und Formular |

Verhalten:

- Serverseitige Validierung + Sanitizing, Zeilenumbrüche in einzeiligen Feldern werden abgelehnt (Header-Injection)
- Empfänger ist fest konfiguriert, `Reply-To` = validierte Absenderadresse, Mails nur als Plain Text
- Spam-Schutz: Honeypot, Mindest-Ausfüllzeit, Rate Limiting (In-Memory, pro Instanz), Origin-Check (Astro `checkOrigin`)
- Erfolgsmeldung **nur** nach erfolgreicher SMTP-Zustellung; SMTP fehlt → 503, Zustellung fehlgeschlagen → 502
- Ohne JavaScript: Formular-POST → Redirect auf `/anfrage-gesendet/` bzw. `/anfrage-fehlgeschlagen/`
- Logging als JSON ohne personenbezogene Daten (kein Name, keine E-Mail, keine IP)
- Waitlist ≠ Newsletter-Einwilligung. Für Marketing-Mails wäre ein separates Double-Opt-In nötig (nicht implementiert).

Die Secrets niemals committen – `.env` ist in `.gitignore`.

## Tests

```bash
npm run check      # astro check (TypeScript)
npm run lint       # ESLint
npm test           # Vitest: Preise, ROI, Validierung, Versand/Fehlerfälle, Rate Limiting
npm run build
npm run test:e2e   # Playwright (Desktop + Mobile) gegen den Build
npm run verify     # alles nacheinander
```

Die E2E-Tests starten automatisch einen lokalen SMTP-Sink (`tests/e2e/smtp-sink.mjs`) und zwei Server-Instanzen
(erfolgreiche Zustellung / fehlschlagende Zustellung). Falls die Playwright-Browser-Version nicht passt:
`PW_CHROMIUM_PATH=/pfad/zu/chrome npm run test:e2e`.

## Deployment

### Docker (empfohlen)

```bash
docker compose up -d --build     # bindet auf 127.0.0.1:4321, liest .env
```

- Multi-Stage-Build; das Runtime-Image enthält nur `dist/` + `server.mjs` (Server-Bundle ist self-contained,
  keine `node_modules`), läuft als User `node`, read-only, ohne Capabilities
- Healthcheck: `GET /healthz`
- Davor einen Reverse Proxy (Caddy, Traefik, nginx) für **TLS und gzip/brotli-Kompression** betreiben und
  `TRUST_PROXY=true` setzen. HTTP → HTTPS-Redirect und `www` → Apex-Redirect dort konfigurieren.

### Ohne Docker

Node.js ≥ 22.12: `npm ci && npm run build`, dann `node server.mjs` per systemd o. ä. starten (ENV setzen).

### Rein statisches Hosting?

Alle Seiten sind statisch (`dist/client/`). Die Formulare benötigen jedoch den Node-Server für `/api/*`.
Ohne Server funktionieren Waitlist und Kontakt nicht.

### Security-Header

`server.mjs` setzt HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
COOP/CORP sowie `frame-ancestors`. Die Content-Security-Policy mit Hashes für Skripte/Styles erzeugt Astro als
`<meta>`-Tag (`security.csp` in `astro.config.mjs`). Erlaubte Hosts: `security.allowedDomains`.

## Rechtliche Prüfung (vor Go-live)

Impressum und Datenschutzerklärung enthalten sichtbare **Prüfhinweise** (`<ReviewNote>`), die vor dem Go-live
bearbeitet und entfernt werden müssen. Die Texte sind **nicht rechtlich geprüft**. Offene Punkte:

- Impressum: vollständiger Name des Inhabers fehlt (§ 5 DDG); Veröffentlichung der persönlichen Steuer-ID prüfen
  (stattdessen ggf. USt-IdNr.); Erklärung zur Verbraucherstreitbeilegung prüfen
- OS-Plattform-Hinweis entfernt (Plattform seit Juli 2025 eingestellt)
- Datenschutz: Hosting- und SMTP-Anbieter ergänzen, AV-Verträge, Log-Aufbewahrung, Drittlandübermittlung verifizieren
- Entfernt (auf der neuen Website nicht mehr im Einsatz): Real Cookie Banner, WP Compress, UpdraftPlus,
  Google reCAPTCHA, Brevo, Umami, Ally, Google Fonts, Font Awesome, CDN
- Waitlist-Rechtsgrundlage (Art. 6 Abs. 1 lit. b DSGVO) und Speicherdauer bestätigen
- AGB/Nutzungsbedingungen der alten Seite wurden nicht übernommen – vor dem kommerziellen Launch erforderlich
