import { defineConfig, devices } from '@playwright/test';

/**
 * E2E dos fluxos críticos. Roda contra o dev server em modo bypass
 * (VITE_BYPASS_LOGIN=true) — o MSW intercepta a rede e serve mocks
 * determinísticos, então não precisa de backend nem banco.
 */
const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Viewport de celular — o app é uma PWA mobile-first.
    ...devices['iPhone 13'],
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev:e2e',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_BYPASS_LOGIN: 'true',
    },
  },
});
