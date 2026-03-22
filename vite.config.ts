import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

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
