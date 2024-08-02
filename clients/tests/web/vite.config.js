import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
    test: {
        browser: {
          provider: 'playwright',
          enabled: true,
          headless: true,
        },
        exclude:[
            ...configDefaults.exclude, 
            'data_bitcoin_regtest/*'
          ]
    }
})