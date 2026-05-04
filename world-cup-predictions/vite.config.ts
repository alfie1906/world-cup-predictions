import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  test: {
    coverage: {
      exclude: ['src/data/DataContext.tsx'],
      include: [
        'src/data/csvUtils.ts',
        'src/data/fixtureUtils.ts',
        'src/data/resultUtils.ts',
        'src/pages/standingsUtils.ts',
        'src/utils/dates.ts',
        'src/utils/text.ts',
      ],
      provider: 'v8',
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
})
