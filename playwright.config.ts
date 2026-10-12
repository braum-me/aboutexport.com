import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-Tests gegen den Produktions-Build (`npm run build` vorher ausführen).
 * - Port 4321: SMTP zeigt auf lokalen Test-Sink → erfolgreiche Zustellung
 * - Port 4322: SMTP zeigt auf einen geschlossenen Port → Zustellfehler
 */
const common = {
  SMTP_HOST: '127.0.0.1',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  SMTP_FROM: 'AboutExport Website <noreply@aboutexport.com>',
  SMTP_REQUIRE_TLS: 'false',
  CONTACT_RECIPIENT: 'info@aboutexport.com',
  RATE_LIMIT_MAX: '100',
  HOST: '127.0.0.1',
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'node tests/e2e/smtp-sink.mjs', url: 'http://127.0.0.1:2526/health', reuseExistingServer: false },
    {
      command: 'node server.mjs',
      url: 'http://127.0.0.1:4321/healthz',
      env: { ...common, PORT: '4321', SMTP_PORT: '2525' },
      reuseExistingServer: false,
    },
    {
      command: 'node server.mjs',
      url: 'http://127.0.0.1:4322/healthz',
      env: { ...common, PORT: '4322', SMTP_PORT: '2599' },
      reuseExistingServer: false,
    },
  ],
});
