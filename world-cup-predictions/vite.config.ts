import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import dotenv from 'dotenv'
import path from 'path'
import { pathToFileURL } from 'url'

// Load .env into process.env for dev middleware to access BLOB_STORE_ID
dotenv.config()

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // Dev plugin: proxy /api/predictions and /api/results to Vercel Blob
    {
      name: 'dev-blob-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            const url = req.url || ''
            // Dev: serve local API handlers in `api/` so `/api/results` works
            if (url.startsWith('/api/results') || url.startsWith('/api/predictions')) {
              try {
                const p = path.join(process.cwd(), 'api', url.split('?')[0].replace(/^\/api\//, '') + (url.endsWith('.csv') ? '' : '.js'))
                const mod = await import(pathToFileURL(p).href)
                if (mod && typeof mod.default === 'function') {
                  // Invoke the handler with the raw req/res used by the api modules
                  await mod.default(req, res)
                  return
                }
              } catch (e) {
                // fall through to other handling
              }
            }
            if (req.method === 'GET' && (url.startsWith('/__blob/predictions') || url.startsWith('/__blob/results'))) {
              const storeId = process.env.BLOB_STORE_ID
              if (!storeId) {
                res.statusCode = 404
                res.end(JSON.stringify([]))
                return
              }

              const key = url.startsWith('/__blob/predictions') ? 'predictions.json' : 'results.json'
              const publicPredUrl = process.env.PREDICTIONS_PUBLIC_URL || process.env.VITE_PREDICTIONS_PUBLIC_URL
              const publicResUrl = process.env.RESULTS_PUBLIC_URL || process.env.VITE_RESULTS_PUBLIC_URL
              const blobUrl = url.startsWith('/__blob/predictions') ? (publicPredUrl || `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent(key)}`) : (publicResUrl || `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent(key)}`)
              const resp = await fetch(blobUrl, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
              if (!resp.ok) {
                res.statusCode = resp.status
                res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
                res.end(JSON.stringify([]))
                return
              }
              const buf = await resp.arrayBuffer()
              const text = Buffer.from(buf).toString('utf8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
              res.end(text)
              return
            }
          } catch (err) {
            // fall through to next
          }
          next()
        })
      },
    },
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
