import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // Your other build options...
    rollupOptions: {
      external: ["bitcoinjs-lib"],
    },
  },
  plugins: [react(), wasm(), nodePolyfills()],
});
