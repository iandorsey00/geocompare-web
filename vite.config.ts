import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.GEOCOMPARE_PROXY_TARGET;
  const proxyAuth =
    env.GEOCOMPARE_PROXY_AUTH_USERNAME && env.GEOCOMPARE_PROXY_AUTH_PASSWORD
      ? `Basic ${Buffer.from(
          `${env.GEOCOMPARE_PROXY_AUTH_USERNAME}:${env.GEOCOMPARE_PROXY_AUTH_PASSWORD}`,
        ).toString("base64")}`
      : undefined;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react()],
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
          },
        }
      : undefined,
  };
});
