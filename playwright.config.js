import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "msedge",
      use: {
        browserName: "chromium",
        channel: "msedge",
      },
    },
  ],
  webServer: {
  command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
