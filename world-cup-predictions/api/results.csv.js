import fs from 'fs'
import path from 'path'

// CSV endpoint reads from Vercel Blob in production (when configured) or falls
// back to `server-data/results.json` in local development.

const resultsFile = path.join(process.cwd(), 'server-data', 'results.json')
if (!fs.existsSync(path.dirname(resultsFile))) fs.mkdirSync(path.dirname(resultsFile), { recursive: true })
if (!fs.existsSync(resultsFile)) fs.writeFileSync(resultsFile, '[]', 'utf8')

async function readResults() {
  // Try Blob first when configured
  try {
    const storeId = process.env.BLOB_STORE_ID
    if (storeId) {
      // Prefer public results URL if provided
      const publicUrl = process.env.RESULTS_PUBLIC_URL || process.env.VITE_RESULTS_PUBLIC_URL
      const url = publicUrl || `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent('results.json')}`
      const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const resp = await fetch(url, { headers })
      if (resp.ok) {
        const buf = await resp.arrayBuffer()
        const text = Buffer.from(buf).toString('utf8')
        return JSON.parse(text || '[]')
      }
    }
  } catch (err) {
    // fall back to filesystem
  }

  try {
    const raw = fs.readFileSync(resultsFile, 'utf8')
    return JSON.parse(raw || '[]')
  } catch (err) {
    return []
  }
}

export default async function handler(req, res) {
  const rows = await readResults()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  const header = ['Fixture ID', 'Match', 'Result']
  const csv = [header.join(',')]
    .concat(rows.map((r) => {
      const fixtureId = String(r.fixtureId || '').replace(/"/g, '""')
      const match = String(r.match || '').replace(/"/g, '""')
      const result = String(r.result || '').replace(/"/g, '""')
      return `"${fixtureId}","${match}","${result}"`
    }))
    .join('\n')
  res.end(csv)
}
