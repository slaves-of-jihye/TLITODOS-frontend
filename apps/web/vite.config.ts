import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  base: "./",
  resolve: {
    alias: {
      "@tlitodos/api-client": new URL("../../packages/api-client/src/index.ts", import.meta.url).pathname,
      "@tlitodos/core": new URL("../../packages/core/src/index.ts", import.meta.url).pathname,
      "@tlitodos/hooks": new URL("../../packages/hooks/src/index.ts", import.meta.url).pathname,
      "@tlitodos/types": new URL("../../packages/types/src/index.ts", import.meta.url).pathname,
      "@tlitodos/ui": new URL("../../packages/ui/src/index.ts", import.meta.url).pathname,
    },
  },
});
