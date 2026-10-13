# Deployment: OVHcloud-VPS mit Coolify + Traefik hinter Cloudflare

Zielbild: AboutExport als **eigene Coolify-Anwendung** auf dem bestehenden VPS, geroutet über den **vorhandenen
Traefik** (`coolify-proxy`). Keine zusätzliche Proxy-Instanz, keine Datenbank, kein öffentlicher Container-Port.

```
Browser ─HTTPS─▶ Cloudflare (Proxy) ─HTTPS─▶ Traefik (coolify-proxy, :443) ─▶ Container web:4321 (Coolify-Netz)
Formular ─▶ /api/* ─▶ Nodemailer ─SMTP 587 STARTTLS + AUTH─▶ Brevo ─▶ info@aboutexport.com
                                       ─▶ Cloudflare Email Routing (MX) ─▶ Microsoft 365 / Exchange Online
```

WordPress läuft auf demselben VPS hinter demselben Traefik → **kein Cloudflare-DNS-Wechsel**; der Cutover ist ein
Umhängen der Domain zwischen zwei Coolify-Ressourcen (`docs/go-live.md`).

## Was im Repo für Coolify relevant ist

| Datei | Zweck | Status |
|---|---|---|
| `Dockerfile` | Multi-Stage-Build, Runtime ohne `node_modules`, User `node`, `HEALTHCHECK /healthz` | genutzt |
| `docker-compose.coolify.yml` | Coolify-Build-Pack „Docker Compose“: Härtung, Healthcheck, Restart, Log-Rotation, kein Host-Port | **genutzt** |
| `deploy/smoke-test.sh` | Prüft Seiten, Redirects, Kompression, Header (Staging + nach Go-live) | genutzt |
| `docker-compose.yml` | Lokaler, produktionsnaher Test mit `127.0.0.1:4321` | lokal |
| `server.mjs` | Kompression (br/gzip), Security-Header, Client-IP, Graceful Shutdown | genutzt |
| ~~`deploy/deploy.sh`, `rollback.sh`, Proxy-Vorlagen~~ | durch Coolify (Build, Rollback) und vorhandenen Traefik ersetzt | entfernt |

## 1. Read-only-Bestandsaufnahme auf dem VPS (vor jeder Änderung)

Nur lesende Befehle – Ausgaben bitte zurückmelden (Secrets vorher schwärzen):

```bash
# Versionen / Ressourcen
docker --version; docker compose version; free -h; df -h /
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

# Traefik (coolify-proxy): Startparameter → Access-Log, Forwarded-Header, Log-Level
docker inspect coolify-proxy --format '{{range .Args}}{{println .}}{{end}}' | grep -iE 'accesslog|forwardedheaders|log\.|entrypoints'
docker inspect coolify-proxy --format '{{json .HostConfig.LogConfig}}'
ls -la /data/coolify/proxy/ /data/coolify/proxy/dynamic/ 2>/dev/null

# WordPress: läuft? Welche Traefik-Router-Regeln (Domains) sind aktiv?
for c in $(docker ps --format '{{.Names}}'); do
  docker inspect "$c" --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' \
    | grep -E '^traefik\.http\.routers\..*\.rule=' | sed "s/^/$c  /"
done | grep -i aboutexport
grep -rn 'aboutexport' /data/coolify/proxy/dynamic/ 2>/dev/null

# Docker-Logging (Rotation) und journald
cat /etc/docker/daemon.json 2>/dev/null || echo "kein daemon.json → Docker-Default json-file OHNE Rotation"
docker info --format 'LoggingDriver={{.LoggingDriver}}'
journalctl --disk-usage
grep -hE '^(SystemMaxUse|MaxRetentionSec|Storage)' /etc/systemd/journald.conf /etc/systemd/journald.conf.d/*.conf 2>/dev/null
```

Serverstandort: OVH-Kundenbereich → *Bare Metal Cloud → VPS → <VPS> → Standort/Rechenzentrum* ablesen und in
`src/config/legal.ts` `serverLocationVerified: true` setzen.

## 2. Log-Retention bewerten

| Log | Inhalt | Wo | Retention |
|---|---|---|---|
| App (`scope:server/forms`) | **keine** IP/Name/E-Mail | Docker json-file des Containers | begrenzt durch Compose: 5 × 10 MB |
| Traefik Access-Log | IP, URL, User-Agent | nur wenn `--accesslog` gesetzt (Datei oder stdout) | **zu prüfen** |
| Traefik Error-Log | gelegentlich IPs | stdout von `coolify-proxy` → Docker-Logs | ohne `daemon.json`-Rotation unbegrenzt – **zu prüfen** |
| Coolify Deploy-Logs | Build-Ausgaben | Coolify | keine Besucherdaten |
| journald | System | `/var/log/journal` | laut `journald.conf` – **zu prüfen** |
| Cloudflare | Edge-Logs | Cloudflare (Auftragsverarbeiter) | laut Cloudflare |

Empfehlung (Ziel: max. 14 Tage für personenbezogene Access-Logs) – **Änderungen an Traefik/Docker nur nach Freigabe**:

- **Variante A (datensparsam, wartungsfrei):** Traefik-Access-Log aus lassen bzw. deaktivieren →
  `accessLogRetention: 'none'`. Fehlersuche über App-Logs (ohne IP) und Cloudflare.
- **Variante B (Access-Log gewünscht):** Coolify → *Servers → Proxy → Configuration*: `--accesslog=true` und
  `--accesslog.filepath=/traefik/access.log`, dazu auf dem Host `/etc/logrotate.d/coolify-traefik`:
  ```
  /data/coolify/proxy/access.log {
      daily
      rotate 14
      missingok
      notifempty
      compress
      delaycompress
      copytruncate
  }
  ```
  → `accessLogRetention: 14`.
- **Docker-Rotation global** (Error-Logs von `coolify-proxy` und alle Container; Docker-Neustart → Wartungsfenster):
  `/etc/docker/daemon.json` → `{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"5"}}`.

Die Datenschutzerklärung nennt erst dann eine Frist, wenn `accessLogRetention` bestätigt eingetragen ist –
bis dahin ohne Zahl („so lange wie erforderlich“), und `npm run release` bleibt rot.

## 3. Coolify-Anwendung anlegen (isoliertes Staging) – erst nach Freigabe

| Einstellung | Wert |
|---|---|
| Ressource | *Project → New Resource → Public Repository* `https://github.com/braum-me/aboutexport.com`, Branch `main` |
| Build Pack | **Docker Compose**, Compose-Datei `/docker-compose.coolify.yml` |
| Domain für Service `web` | **leer lassen** (WordPress behält aboutexport.com bis zum Cutover) |
| Auto Deploy | **aus** bis zur Go-live-Freigabe (sonst deployt jeder Merge auf `main` sofort) |
| Rollback | Coolify → *Rollback* (früheres Image ohne Neubau); „Docker Images to keep“ ≥ 3 |

Umgebungsvariablen (Coolify → *Environment Variables*; Laufzeit-, keine Build-Variablen; Werte nie ins Repo):

| Variable | Wert |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` (STARTTLS wird erzwungen) |
| `SMTP_USER` | Brevo-SMTP-Login (Brevo → *SMTP & API → SMTP*) |
| `SMTP_PASSWORD` | eigener Brevo-SMTP-Schlüssel nur für diese Website |
| `SMTP_FROM` | `AboutExport Website <noreply@aboutexport.com>` |
| `CONTACT_RECIPIENT` | `info@aboutexport.com` |
| `TRUST_PROXY` / `CLIENT_IP_HEADER` | `true` / `cf-connecting-ip` (Default in der Compose-Datei) |

`CLIENT_IP_HEADER=cf-connecting-ip`: Cloudflare setzt die echte Client-IP, Traefik reicht den Header unverändert
durch – unabhängig von Traefiks `forwardedHeaders`. Restrisiko: Wer die OVH-IP direkt (an Cloudflare vorbei) anspricht,
kann den Header fälschen und damit nur das Rate-Limit umgehen. Optional später (betrifft alle Sites, separat freigeben):
80/443 in der OVH-Firewall nur für die [Cloudflare-IP-Bereiche](https://www.cloudflare.com/ips/) öffnen.

### Staging-Zugriff ohne Domain und ohne öffentlichen Port

```bash
# auf dem VPS: Container-IP im Coolify-Netz ermitteln
docker ps --format '{{.Names}}' | grep -i web
docker inspect <container> --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'

# vom eigenen Rechner: SSH-Tunnel → http://localhost:4321
ssh -L 4321:<container-ip>:4321 <user>@<vps>

# Smoke-Test über den Tunnel (im lokalen Repo-Checkout)
deploy/smoke-test.sh http://localhost:4321
```

Formulare funktionieren im Tunnel (`localhost` ist in `security.allowedDomains` erlaubt).

## 4. E-Mail-Kette Website → Brevo → Cloudflare Email Routing → Exchange Online

DNS (öffentlich geprüft am 13.10.2026) – **für den Go-live keine Änderung nötig**:

| Name | Typ | Wert | Zweck |
|---|---|---|---|
| `aboutexport.com` | MX | `route1/2/3.mx.cloudflare.net` | Email Routing (Empfang info@) |
| `aboutexport.com` | TXT | `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all` | SPF: Cloudflare + Brevo |
| `aboutexport.com` | TXT | `brevo-code:…` | Brevo-Domainverifizierung |
| `brevo1._domainkey`, `brevo2._domainkey` | CNAME | `b1/b2.aboutexport-com.dkim.brevo.com` | DKIM (Brevo signiert mit d=aboutexport.com) |
| `cf2024-1._domainkey` | TXT | DKIM-Key | DKIM Cloudflare Email Routing |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | DMARC (Monitoring) |

| Prüfpunkt | Umsetzung / Erwartung |
|---|---|
| SMTP-Auth + TLS | Port 587, `requireTLS` (kein Klartext-Fallback), Login + Schlüssel nur in Coolify |
| SPF | Brevo im SPF enthalten (gilt für die Annahme bei Cloudflare); nach der Weiterleitung ist für Exchange DKIM maßgeblich |
| DKIM / DMARC | Brevo-DKIM `d=aboutexport.com` ist DMARC-aligned und übersteht die Weiterleitung → erwartet `dmarc=pass` |
| Reply-To | validierte Absenderadresse des Besuchers; `From` fest `noreply@aboutexport.com` |
| Logs | nur `outcome`/Fehlercode, keine Zugangsdaten, keine personenbezogenen Daten |

Brevo vorbereiten: Konto reaktivieren, *Senders, Domains & Dedicated IPs → Domains*: `aboutexport.com` muss
„authenticated“ sein, neuen SMTP-Schlüssel erzeugen, DPA im Konto ablegen. Zustelltest: `docs/go-live.md`, Schritt 2.
Landet die Mail in Exchange im Junk: `Authentication-Results` prüfen, ggf. Absender in Exchange als vertrauenswürdig
markieren – keine DNS-Änderung. DMARC `p=quarantine` frühestens nach 2–4 Wochen sauberer Reports (separat freigeben).

## 5. Cloudflare

DNS-Einträge zeigen bereits (proxied) auf den VPS; SSL-Modus und Zertifikat (Let's Encrypt über Coolify/Traefik)
bleiben wie für WordPress. HSTS sendet die App. Email Routing, MX, SPF, DKIM, DMARC: **unverändert**.

## 5a. Optional: Umami Analytics

Standardmäßig ist **keine** Reichweitenmessung aktiv. Aktivierung (die Seiten sind statisch, daher **Build-Zeit**):

1. In Coolify → *Environment Variables* **mit „Available at Buildtime“** setzen: `UMAMI_SCRIPT_URL` (z. B. `https://<umami-host>/script.js`, nur `https://`) und `UMAMI_WEBSITE_ID` (UUID aus Umami). Optional `UMAMI_DOMAINS` (Standard: `aboutexport.com,www.aboutexport.com`, damit Staging nichts misst).
2. **Neu deployen.** Die CSP wird beim Build automatisch um genau den Umami-Origin erweitert.
3. Datenschutz: Mit aktivem Umami erscheint ein Abschnitt in `/datenschutz/`. Betreiber der Instanz steht in `legal.analytics.instance` (aktuell: selbst betrieben, gleiches Hosting). Vor dem Go-live `legal.analytics.verified` nach rechtlicher Prüfung bestätigen (Rechtsgrundlage, Cookie-/Speicherfreiheit). `npm run release:check` mit denselben `UMAMI_*`-Variablen meldet sonst die offenen Punkte.

## 6. Betrieb

| Thema | Umsetzung |
|---|---|
| Restart | `restart: unless-stopped` + Coolify-Überwachung |
| Healthcheck | `GET /healthz` (Compose + Dockerfile) |
| Härtung | read-only, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, 256 MB RAM-Limit |
| Kompression | Brotli/gzip vorberechnet, von `server.mjs` ausgeliefert |
| Caching | `/_astro/*` 1 Jahr immutable, Bilder 1 Tag, HTML revalidiert |
| Ressourcen | ~25 MB RAM im Betrieb |
| Updates | Merge auf `main` → in Coolify *Deploy* (Auto Deploy erst nach Go-live) |

## Formulare – Schutzmechanismen

- Serverseitige Validierung, Header-Injection-Schutz, nur Plain-Text-Mails, fester Empfänger, `Reply-To` = Absender
- Spam: Honeypot, Mindest-Ausfüllzeit, Origin-Check (`checkOrigin`), Rate Limiting 5 / 10 min je IP und Formular
- Erfolg **nur** nach angenommener SMTP-Zustellung; SMTP fehlt → 503, Zustellung fehlgeschlagen → 502 mit Hinweis auf info@
- Automatisch getestet (lokaler SMTP-Sink, auch im Container): Zustellung, Validierung, Honeypot, Header-Injection,
  fremder Origin (403), Rate Limit inkl. gefälschtem `X-Forwarded-For`, SMTP-Ausfall, No-JS-Fallback
