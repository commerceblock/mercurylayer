import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'main.js'),
      name: 'mercuryweblib',
      // the proper extensions will be added
      fileName: 'mercuryweblib',
    },
  },
})