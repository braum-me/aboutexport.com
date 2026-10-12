import type { APIContext } from 'astro';
import { createSmtpSender, readSmtpConfig } from './mail';
import { RateLimiter } from './rateLimit';
import { handleSubmission } from './submit';
import type { FormKind } from './validation';

// 5 Anfragen pro 10 Minuten je IP und Formular
const limiter = new RateLimiter(
  Number(process.env.RATE_LIMIT_MAX ?? 5),
  Number(process.env.RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000),
);

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Client-IP für das Rate-Limiting. X-Forwarded-* wird in server.mjs entfernt,
 * sofern TRUST_PROXY nicht gesetzt ist – Clients können die IP also nicht fälschen.
 */
function clientKey(ctx: APIContext): string {
  try {
    return ctx.clientAddress;
  } catch {
    return 'unknown';
  }
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('application/json');
}

function respond(request: Request, status: number, body: unknown, ok: boolean): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  // Fallback ohne JavaScript: Redirect auf statische Ergebnisseite
  return new Response(null, {
    status: 303,
    headers: { location: ok ? '/anfrage-gesendet/' : '/anfrage-fehlgeschlagen/', 'cache-control': 'no-store' },
  });
}

export function createFormEndpoint(kind: FormKind) {
  return async (ctx: APIContext): Promise<Response> => {
    const { request } = ctx;
    const length = Number(request.headers.get('content-length') ?? '0');
    if (length > MAX_BODY_BYTES) {
      return respond(request, 413, { ok: false, message: 'Anfrage zu groß.' }, false);
    }
    const type = request.headers.get('content-type') ?? '';
    if (!type.includes('application/x-www-form-urlencoded') && !type.includes('multipart/form-data')) {
      return respond(request, 415, { ok: false, message: 'Nicht unterstütztes Format.' }, false);
    }

    let fields: Record<string, unknown>;
    try {
      const form = await request.formData();
      fields = {};
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') fields[key] = value;
      }
    } catch {
      return respond(request, 400, { ok: false, message: 'Ungültige Anfrage.' }, false);
    }

    const result = await handleSubmission(kind, fields, clientKey(ctx), {
      smtp: readSmtpConfig(),
      createSender: createSmtpSender,
      limiter,
    });
    return respond(request, result.status, result.body, result.body.ok);
  };
}

export const methodNotAllowed = (): Response =>
  new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
    status: 405,
    headers: { allow: 'POST', 'content-type': 'application/json; charset=utf-8' },
  });
