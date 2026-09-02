import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4174;
const localUrl = `http://${host}:${port}`;
const baseUrl = process.env.PORTFOLIO_URL?.replace(/\/+$/, "") || localUrl;
const outputPath = resolve("docs/portfolio/screenshots/01-profile-overview.png");
const socialPreviewPath = resolve("docs/portfolio/screenshots/social-preview.png");

// Illustrative demo metrics, not a current statistical reference.
const profile = {
  name: "Los Angeles city, California",
  display_name: "Los Angeles city, California",
  canonical_name: "Los Angeles city, California",
  sumlevel: "160",
  state: "ca",
  geoid: "1600000US0644000",
  counties: ["06037"],
  counties_display: ["Los Angeles County"],
  metrics: {
    land_area: "469.5 sqmi",
    latitude: "34.0522",
    longitude: "-118.2437",
    population: "3,820,000",
    median_age: "37.0",
    under_18: "725,800",
    population_18_to_64: "2,521,200",
    age_65_plus: "573,000",
    white_alone: "1,260,600",
    white_alone_not_hispanic_or_latino: "993,200",
    black_alone: "305,600",
    asian_alone: "458,400",
    other_race: "1,795,400",
    hispanic_or_latino: "1,833,600",
    population_25_years_and_older: "2,750,400",
    bachelors_degree_or_higher: "1,045,152",
    graduate_degree_or_higher: "412,560",
    per_capita_income: "$43,000",
    median_household_income: "$80,000",
    poverty_universe: "3,800,000",
    population_below_poverty_level: "646,000",
    labor_force: "2,050,000",
    unemployed_population: "123,000",
    households: "1,450,000",
    average_household_size: "2.6",
    occupied_housing_units: "1,450,000",
    homeowner_occupied_housing_units: "522,000",
    median_year_structure_built: "1964",
    median_rooms: "3.8",
    median_value: "$900,000",
    median_rent: "$1,900",
  },
};

async function waitForServer(url) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local server may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let server;
let browser;

try {
  if (!process.env.PORTFOLIO_URL) {
    server = spawn("npm", ["run", "dev", "--", "--host", host, "--port", String(port)], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "inherit"],
    });
    await waitForServer(localUrl);
  }

  await mkdir(resolve("docs/portfolio/screenshots"), { recursive: true });
  const boundary = JSON.parse(
    await readFile(resolve("docs/portfolio/fixtures/los-angeles-boundary.geojson"), "utf8"),
  );

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.route("**/api/profile?**", (route) => route.fulfill({ json: profile }));
  await page.route("**/api/search?**", (route) =>
    route.fulfill({ json: { query: profile.name, count: 0, results: [] } }),
  );
  await page.route("**/api/map-links?**", (route) =>
    route.fulfill({
      json: {
        google_maps_url: "https://www.google.com/maps/search/?api=1&query=Los%20Angeles%2C%20CA",
        google_street_view_url: "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=34.0522,-118.2437",
      },
    }),
  );
  await page.route("https://tigerweb.geo.census.gov/**", (route) => route.fulfill({ json: boundary }));

  await page.goto(`${baseUrl}/?geoid=${encodeURIComponent(profile.geoid)}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { name: profile.name }).waitFor();
  await page.locator(".map-canvas").waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(5_000);

  await page.screenshot({ path: outputPath, fullPage: false });
  await page.setViewportSize({ width: 1440, height: 720 });
  await page.screenshot({ path: socialPreviewPath, fullPage: false });
  console.log(`Captured ${outputPath}`);
  console.log(`Captured ${socialPreviewPath}`);
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
