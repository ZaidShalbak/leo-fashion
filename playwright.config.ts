import { defineConfig, devices } from "@playwright/test";

// This sandbox ships a pre-installed Chromium at PLAYWRIGHT_BROWSERS_PATH
// (/opt/pw-browsers) that doesn't always match the browser build
// @playwright/test wants to download — and `playwright install` can't
// reach cdn.playwright.dev from here anyway. Pointing directly at the
// pre-installed binary sidesteps the download entirely. Safe to remove
// this override once running outside that sandbox.
const sandboxChromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: sandboxChromium,
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
