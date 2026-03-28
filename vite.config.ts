import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

function readGeoresolveVersion() {
  try {
    const pyprojectPath = resolve(process.cwd(), "../georesolve/pyproject.toml");
    const content = readFileSync(pyprojectPath, "utf8");
    const match = content.match(/^version\s*=\s*"([^"]+)"/m);
    return match?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.GEOCOMPARE_PROXY_TARGET;
  const georesolveVersion = readGeoresolveVersion();
  const proxyAuth =
    env.GEOCOMPARE_PROXY_AUTH_USERNAME && env.GEOCOMPARE_PROXY_AUTH_PASSWORD
      ? `Basic ${Buffer.from(
          `${env.GEOCOMPARE_PROXY_AUTH_USERNAME}:${env.GEOCOMPARE_PROXY_AUTH_PASSWORD}`,
        ).toString("base64")}`
      : undefined;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __GEORESOLVE_VERSION__: JSON.stringify(georesolveVersion),
    },
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
    server: proxyTarget
      ? {
          proxy: {
            "/api": {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
              headers: proxyAuth ? { Authorization: proxyAuth } : undefined,
            },
            "/georesolve-api": {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
              headers: proxyAuth ? { Authorization: proxyAuth } : undefined,
            },
          },
        }
      : undefined,
  };
});
