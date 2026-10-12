import { validateContact, validateWaitlist, type FieldErrors } from '../lib/validation';

type Kind = 'waitlist' | 'contact';

function setStatus(el: HTMLElement | null, kind: 'success' | 'error', message: string) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-900', 'bg-red-50', 'text-red-900');
  el.classList.add(...(kind === 'success' ? ['bg-emerald-50', 'text-emerald-900'] : ['bg-red-50', 'text-red-900']));
  el.dataset.state = kind;
}

function showFieldErrors(form: HTMLFormElement, errors: FieldErrors) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
    const field = el.dataset.errorFor ?? '';
    const msg = errors[field];
    el.textContent = msg ?? '';
    el.hidden = !msg;
    form.querySelector(`[name="${field}"]`)?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  });
  const first = Object.keys(errors)[0];
  if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
}

export function initForms(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach((form) => {
    const kind = form.dataset.form as Kind;
    const status = form.parentElement?.querySelector<HTMLElement>('[data-form-status]') ?? null;
    const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
    const label = submit?.querySelector<HTMLElement>('[data-label]');
    const originalLabel = label?.textContent ?? '';

    // Zeitstempel für die Spam-Heuristik (Mindest-Ausfüllzeit)
    const ts = form.querySelector<HTMLInputElement>('[data-ts]');
    if (ts) ts.value = String(Date.now());

    let busy = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;

      const data = new FormData(form);
      const fields = Object.fromEntries(Array.from(data.entries()).filter(([, v]) => typeof v === 'string'));
      const result = kind === 'waitlist' ? validateWaitlist(fields) : validateContact(fields);
      if (!result.ok) {
        showFieldErrors(form, result.errors);
        setStatus(status, 'error', 'Bitte prüfen Sie Ihre Eingaben.');
        return;
      }
      showFieldErrors(form, {});
      status?.classList.add('hidden');

      busy = true;
      if (submit) submit.disabled = true;
      if (label) label.textContent = 'Wird gesendet …';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new URLSearchParams(fields as Record<string, string>),
          headers: { accept: 'application/json' },
        });
        let body: { ok?: boolean; message?: string; errors?: FieldErrors } = {};
        try {
          body = await response.json();
        } catch {
          /* leerer oder ungültiger Body */
        }

        if (response.ok && body.ok === true) {
          setStatus(status, 'success', body.message ?? 'Vielen Dank! Ihre Anfrage wurde übermittelt.');
          form.reset();
          if (ts) ts.value = String(Date.now());
          status?.focus();
        } else {
          if (body.errors) showFieldErrors(form, body.errors);
          setStatus(
            status,
            'error',
            body.message ??
              'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder schreiben Sie an info@aboutexport.com.',
          );
          status?.focus();
        }
      } catch {
        setStatus(
          status,
          'error',
          'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
        );
        status?.focus();
      } finally {
        busy = false;
        if (submit) submit.disabled = false;
        if (label) label.textContent = originalLabel;
      }
    });
  });
}
