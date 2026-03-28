import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_PORT = 3100;
const PLAYWRIGHT_HOSTNAME = "127.0.0.1";
const PLAYWRIGHT_BASE_URL = `http://${PLAYWRIGHT_HOSTNAME}:${PLAYWRIGHT_PORT}`;

process.env.NO_PROXY = appendNoProxyHosts(process.env.NO_PROXY);
process.env.no_proxy = appendNoProxyHosts(process.env.no_proxy);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --hostname ${PLAYWRIGHT_HOSTNAME} --port ${PLAYWRIGHT_PORT}`,
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: false,
    timeout: 300000,
  },
});

function appendNoProxyHosts(value: string | undefined) {
  const hosts = new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  hosts.add("127.0.0.1");
  hosts.add("localhost");

  return Array.from(hosts).join(",");
}
