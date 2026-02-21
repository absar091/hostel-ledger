import { defineConfig, defaultExclude } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [...defaultExclude, 'backend-server/tests/unit/membership_check.test.js'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
