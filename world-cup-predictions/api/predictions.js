import fs from 'fs'
import path from 'path'

// Predictions endpoint uses Vercel Blob in production; local fallback writes
// to `server-data/predictions.json` so you can test without Blob configured.
const predsFile = path.join(process.cwd(), 'server-data', 'predictions.json')
if (!fs.existsSync(path.dirname(predsFile))) fs.mkdirSync(path.dirname(predsFile), { recursive: true })
if (!fs.existsSync(predsFile)) fs.writeFileSync(predsFile, '[]', 'utf8')

async function readPredictions() {
  // Read exclusively from Vercel Blob when configured. If no store ID is
  // present or the fetch fails, return an empty array so the client can
  // continue operating without stale local files.
  try {
    // Prefer an explicit public blob URL from env when provided.
    const publicUrl = process.env.PREDICTIONS_PUBLIC_URL || process.env.VITE_PREDICTIONS_PUBLIC_URL
    if (publicUrl) {
      const resp = await fetch(publicUrl)
      if (!resp.ok) return []
      const buf = await resp.arrayBuffer()
      const text = Buffer.from(buf).toString('utf8')
      return JSON.parse(text || '[]')
    }

    const storeId = process.env.BLOB_STORE_ID
    if (!storeId) return []

    const url = `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent('predictions.json')}`
    const resp = await fetch(url)
    if (!resp.ok) return []

    const buf = await resp.arrayBuffer()
    const text = Buffer.from(buf).toString('utf8')
    return JSON.parse(text || '[]')
  } catch (err) {
    return []
  }
}

async function writePredictions(rows) {
  const text = JSON.stringify(rows, null, 2)
  try {
    const storeId = process.env.BLOB_STORE_ID
    if (storeId) {
      const url = `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent('predictions.json')}`
      const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      })
      if (resp.ok) return
    }
  } catch (err) {
    // fallback to filesystem
  }

  const tmp = predsFile + '.tmp'
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, predsFile)
}

export default async function handler(req, res) {
  const method = req.method

  if (method === 'GET') {
    const rows = await readPredictions()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    res.end(JSON.stringify(rows))
    return
  }

  if (method === 'POST') {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })

      const parsed = JSON.parse(body || '{}')
      const incoming = Array.isArray(parsed.rows) ? parsed.rows : []
      const existing = await readPredictions()
      const map = new Map(existing.map((r) => [`${r.player}::${r.fixtureId}`, r]))
      incoming.forEach((r) => { if (r && r.player && r.fixtureId) map.set(`${r.player}::${r.fixtureId}`, r) })
      const merged = Array.from(map.values())
      await writePredictions(merged)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
      res.end(JSON.stringify({ ok: true, count: merged.length }))
      return
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'failed to save predictions' }))
      return
    }
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'method not allowed' }))
}
