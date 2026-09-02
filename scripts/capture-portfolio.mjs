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

const profile = {
  name: "Mission Viejo city, California",
  display_name: "Mission Viejo city, California",
  canonical_name: "Mission Viejo city, California",
  sumlevel: "160",
  state: "ca",
  geoid: "1600000US0648256",
  counties: ["06059"],
  counties_display: ["Orange County"],
  metrics: {
    land_area: "17.7 sqmi",
    latitude: "33.6000",
    longitude: "-117.6720",
    population: "92,151",
    population_density: "5,206.3 /sqmi",
    median_age: "46.6",
    under_18: "18,192",
    population_18_to_64: "52,221",
    age_65_plus: "21,738",
    white_alone: "60,002",
    white_alone_not_hispanic_or_latino: "52,860",
    black_alone: "1,757",
    asian_alone: "13,048",
    other_race: "17,344",
    hispanic_or_latino: "16,125",
    population_25_years_and_older: "68,360",
    bachelors_degree_or_higher: "34,727",
    graduate_degree_or_higher: "14,236",
    per_capita_income: "$58,091",
    median_household_income: "$134,225",
    poverty_universe: "91,702",
    population_below_poverty_level: "4,846",
    labor_force: "47,126",
    unemployed_population: "1,923",
    households: "34,193",
    average_household_size: "2.7",
    occupied_housing_units: "34,193",
    homeowner_occupied_housing_units: "26,590",
    median_year_structure_built: "1984",
    median_rooms: "6.5",
    median_value: "$1,050,500",
    median_rent: "$2,826",
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
    await readFile(resolve("docs/portfolio/fixtures/mission-viejo-boundary.geojson"), "utf8"),
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
        google_maps_url: "https://www.google.com/maps/search/?api=1&query=Mission%20Viejo%2C%20CA",
        google_street_view_url: "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.6000,-117.6720",
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
