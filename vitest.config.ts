import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'renderer/.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['main/**/*.ts'],
      exclude: ['main/preload.ts', 'main/background.ts'],
    },
  },
})
