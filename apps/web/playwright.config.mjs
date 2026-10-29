import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(here, "../../.env"));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "./test-results",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    launchOptions: { channel: "chrome" },
    trace: "retain-on-failure"
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 800 } } },
    { name: "desktop", use: { viewport: { width: 1365, height: 900 } } }
  ]
});
