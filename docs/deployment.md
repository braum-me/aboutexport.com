# Deployment auf dem VPS (Docker Compose hinter Reverse Proxy)

Zielbild: **Cloudflare (DNS + Proxy) → Reverse Proxy auf dem VPS (TLS) → 1 Container `aboutexport-web` (Node 22)**.
Keine Datenbank, kein WordPress. Secrets ausschließlich in `.env` auf dem VPS.

```
Browser ──HTTPS──▶ Cloudflare ──HTTPS (Full strict)──▶ Reverse Proxy :443 ──HTTP──▶ 127.0.0.1:4321 (Container)
                                                                                     │
Formular ─▶ /api/* ─▶ Nodemailer ─SMTP 587/STARTTLS─▶ Brevo ─▶ info@aboutexport.com (Cloudflare Email Routing) ─▶ Postfach
```

| Baustein | Umsetzung im Repo |
|---|---|
| Container | `Dockerfile` (Multi-Stage, Runtime ohne `node_modules`, User `node`), ~245 MB |
| Härtung | `read_only`, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, `mem_limit: 256m` |
| Restart / Health | `restart: unless-stopped`, Healthcheck `GET /healthz` |
| Kompression | Brotli + gzip werden beim Build vorberechnet und von `server.mjs` ausgeliefert (unabhängig vom Proxy) |
| Caching | `/_astro/*` 1 Jahr immutable, Bilder 1 Tag, HTML revalidiert (ETag) |
| Security-Header | HSTS, CSP (Meta + Header), XFO, nosniff, Referrer-, Permissions-Policy, COOP/CORP |
| Logs | JSON auf stdout, **ohne** IP/Name/E-Mail; Docker-Rotation 5 × 10 MB |
| Rollback | Images mit Git-SHA getaggt, `deploy/rollback.sh` startet das vorherige Image ohne Build |
| Graceful Shutdown | SIGTERM → offene Requests beenden, spätestens nach 10 s |

## 1. Bestandsaufnahme auf dem VPS (vor jeder Änderung)

Welcher Reverse Proxy läuft bereits? Nur lesende Befehle:

```bash
sudo ss -tlnp | grep -E ':(80|443)\s'                         # wer belegt 80/443?
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'  # Traefik/Caddy/NPM als Container?
systemctl is-active nginx caddy apache2 traefik 2>/dev/null    # als Dienst?
docker --version && docker compose version
free -h && df -h /
```

Je nach Ergebnis die passende Vorlage verwenden – **keinen zweiten Proxy daneben installieren**:

| Vorhanden | Vorlage | App-ENV |
|---|---|---|
| nginx | `deploy/proxy/nginx.conf.example` | `TRUST_PROXY=true`, `TRUST_PROXY_HOPS=2` |
| Caddy | `deploy/proxy/Caddyfile.example` | `TRUST_PROXY=true`, `TRUST_PROXY_HOPS=2` |
| Traefik / Coolify | `deploy/proxy/traefik-labels.example.yml` | `TRUST_PROXY=true`, `TRUST_PROXY_HOPS=2` (nur mit `forwardedHeaders.trustedIPs` = Cloudflare), sonst `CLIENT_IP_HEADER` |
| nichts | Caddy (automatisches HTTPS, eine Datei) | wie Caddy |

`TRUST_PROXY_HOPS=2`: Cloudflare und der lokale Proxy hängen je einen Eintrag an `X-Forwarded-For` an; die App nimmt
den vorletzten Eintrag (= von Cloudflare ermittelte Client-IP). Vom Client mitgeschickte Einträge werden ignoriert.

**Empfohlen (robust, unabhängig vom Proxy):** Port 80/443 per Firewall nur für die
[Cloudflare-IP-Bereiche](https://www.cloudflare.com/ips/) öffnen und `CLIENT_IP_HEADER=cf-connecting-ip` setzen.
Dann ist die Client-IP für das Rate-Limiting nicht fälschbar. Ohne diese Sperre `CLIENT_IP_HEADER` **nicht** setzen.

## 2. Cloudflare-Einstellungen (Zone aboutexport.com)

| Einstellung | Wert |
|---|---|
| DNS `aboutexport.com`, `www` | A/AAAA → VPS-IP, **Proxied** (orange) – erst beim Cutover ändern |
| SSL/TLS-Modus | **Full (strict)** (Origin-Zertifikat: Cloudflare Origin CA oder Let's Encrypt) |
| Always Use HTTPS | an |
| HSTS | wird von der App gesendet – in Cloudflare nicht zusätzlich nötig |
| Caching | Standard (Cloudflare cacht statische Dateiendungen, HTML nicht) |
| Email Routing / MX / SPF / DKIM / DMARC | **unverändert lassen** (siehe Abschnitt 4) |

## 3. Installation

```bash
# einmalig
sudo mkdir -p /opt/aboutexport && sudo chown "$USER" /opt/aboutexport
git clone https://github.com/braum-me/aboutexport.com.git /opt/aboutexport
cd /opt/aboutexport
cp .env.example .env && chmod 600 .env   # Werte eintragen (SMTP, TRUST_PROXY …)

# Deployment (baut origin/main als aboutexport-website:<sha>, wartet auf "healthy")
deploy/deploy.sh
deploy/smoke-test.sh                      # lokal gegen 127.0.0.1:4321

# Rollback auf das vorherige Image (ohne Build)
deploy/rollback.sh
```

Update: `deploy/deploy.sh` erneut ausführen (optional mit Git-Ref, z. B. `deploy/deploy.sh v1.0.0`).
Schlägt der Healthcheck fehl, startet das Skript automatisch das vorherige Image.

Alte Images aufräumen (die letzten 3 behalten):
`docker images aboutexport-website --format '{{.Tag}}' | tail -n +4 | xargs -r -I{} docker rmi aboutexport-website:{}`

## 4. E-Mail: Brevo SMTP-Relay

Entscheidung: **Brevo** (bereits für aboutexport.com eingerichtet).

| Kriterium | Brevo SMTP | Cloudflare Email Sending |
|---|---|---|
| Kosten | Free: 300 Mails/Tag | Workers Paid (5 $/Monat) für beliebige Empfänger; gratis nur an verifizierte Routing-Ziele |
| Status | GA | Beta (seit April 2026) |
| DNS | **bereits vollständig eingerichtet** (SPF-Include, DKIM `brevo1/2`, DMARC) | neue Einträge unter `cf-bounce` + DMARC nötig |
| Nodemailer | SMTP 587 STARTTLS – ohne Codeänderung | SMTP 465 – ohne Codeänderung |
| Datenschutz | EU-Anbieter (Paris), zusätzlicher Auftragsverarbeiter | kein zusätzlicher Anbieter |

Bestehende DNS-Einträge (öffentlich geprüft am 13.10.2026, **nicht ändern**):

| Name | Typ | Wert | Zweck |
|---|---|---|---|
| `aboutexport.com` | MX | `route1/2/3.mx.cloudflare.net` | Email Routing (Empfang info@) |
| `aboutexport.com` | TXT | `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all` | SPF: Cloudflare + Brevo |
| `aboutexport.com` | TXT | `brevo-code:…` | Brevo-Domainverifizierung |
| `brevo1._domainkey`, `brevo2._domainkey` | CNAME | `b1/b2.aboutexport-com.dkim.brevo.com` | DKIM Brevo |
| `cf2024-1._domainkey` | TXT | DKIM-Key | DKIM Cloudflare Email Routing |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | DMARC (Monitoring) |

Damit ist der Versand von `noreply@aboutexport.com` über Brevo **DKIM-aligned** (d=aboutexport.com) und besteht DMARC.
Für den Go-live sind **keine DNS-Änderungen nötig**. Optional später: nach 2–4 Wochen sauberer DMARC-Reports
`p=quarantine` – nur nach Prüfung, dass alle legitimen Absender (Brevo, Cloudflare, ggf. Postfach-Anbieter) aligned sind.

Einrichtung:
1. Brevo-Konto prüfen/reaktivieren → *Senders, Domains & Dedicated IPs → Domains*: `aboutexport.com` muss „authenticated“ sein.
2. *SMTP & API → SMTP*: neuen SMTP-Schlüssel erzeugen (nur für diese Website), Login + Schlüssel in `.env` auf dem VPS.
3. Brevo-Auftragsverarbeitungsvertrag (DPA) im Konto akzeptieren/ablegen.
4. `.env`: `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<Login>`, `SMTP_PASSWORD=<Schlüssel>`,
   `SMTP_FROM="AboutExport Website <noreply@aboutexport.com>"`, `CONTACT_RECIPIENT=info@aboutexport.com`.

Fallback ohne Codeänderung: Cloudflare Email Sending (`SMTP_HOST=smtp.mx.cloudflare.net`, `SMTP_PORT=465`,
`SMTP_USER=api_token`, `SMTP_PASSWORD=<API-Token mit "Email Sending: Edit">`) – erfordert Onboarding der Domain
(neue DNS-Einträge unter `cf-bounce`) und Anpassung der Datenschutzerklärung.

## 5. Formulare – Schutzmechanismen

- Serverseitige Validierung, Header-Injection-Schutz, nur Plain-Text-Mails, fester Empfänger, `Reply-To` = Absender
- Spam: Honeypot, Mindest-Ausfüllzeit, Origin-Check (`checkOrigin`), Rate Limiting 5 / 10 min je IP und Formular
- Erfolg **nur** nach angenommener SMTP-Zustellung; SMTP fehlt → 503, Zustellung fehlgeschlagen → 502 mit Hinweis auf info@
- Rate Limiting ist In-Memory (eine Instanz) – passt zum Ein-Container-Setup

Getestet (automatisch, lokaler SMTP-Sink): Zustellung Kontakt + Waitlist, Validierungsfehler, Honeypot,
Header-Injection, fremder Origin (403), Rate Limit inkl. gefälschtem `X-Forwarded-For`, SMTP-Ausfall, No-JS-Fallback.
