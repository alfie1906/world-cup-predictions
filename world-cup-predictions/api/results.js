import fs from 'fs'
import path from 'path'

// This endpoint uses Vercel Blob in production when configured. For local
// development it falls back to a filesystem file at `server-data/results.json`.
//
// To wire Vercel Blob: enable the Blob integration in the Vercel UI and bind
// it to your project. Then replace the `readBlob`/`writeBlob` stubs below with
// the concrete Blob SDK calls or REST calls as documented by Vercel.

const resultsFile = path.join(process.cwd(), 'server-data', 'results.json')
if (!fs.existsSync(path.dirname(resultsFile))) fs.mkdirSync(path.dirname(resultsFile), { recursive: true })
if (!fs.existsSync(resultsFile)) fs.writeFileSync(resultsFile, '[]', 'utf8')

async function readBlobText(key) {
  const storeId = process.env.BLOB_STORE_ID
  if (!storeId) return null

  const url = `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent(key)}`
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const resp = await fetch(url, { headers })
  if (!resp.ok) return null
  const buf = await resp.arrayBuffer()
  const text = Buffer.from(buf).toString('utf8')
  return text
}

async function writeBlobText(key, text) {
  const storeId = process.env.BLOB_STORE_ID
  if (!storeId) return false

  // Prefer using the official @vercel/blob SDK when installed. This
  // allows overwriting objects and setting public access conveniently.
  try {
    const blobSdk = await import('@vercel/blob')
    if (blobSdk && typeof blobSdk.put === 'function') {
      const buf = Buffer.from(text, 'utf8')
      try {
        // Ensure the SDK picks up the read/write token when present
        const rwToken = process.env.BLOB_READ_WRITE_TOKEN
        if (rwToken && !process.env.VERCEL_TOKEN) process.env.VERCEL_TOKEN = rwToken
        // pass store id so SDK targets the correct store and allow overwrite
        const result = await blobSdk.put(key, buf, { access: 'public', store: storeId, contentType: 'application/json', allowOverwrite: true })
        console.log('Blob upload (SDK) succeeded', key)
        return Boolean(result)
      } catch (e) {
        console.error('Blob upload (SDK) failed', key, e && (e.message || e))
        // fall through to REST fallback
      }
    }
  } catch (e) {
    // @vercel/blob not available or failed to import — fall back to REST
  }

  const url = `https://api.vercel.com/v1/blob/stores/${storeId}/objects/${encodeURIComponent(key)}`
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN
  const headers = Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {})
  const resp = await fetch(url, {
    method: 'PUT',
    headers,
    body: text,
  })
  if (!resp.ok) {
    let bodyText = ''
    try { bodyText = await resp.text() } catch (e) {}
    console.error('Blob upload (REST) failed', key, resp.status, resp.statusText, bodyText)
    return false
  }
  console.log('Blob upload (REST) succeeded', key, resp.status)
  return true
}

async function readResults() {
  // Read exclusively from Vercel Blob when configured. If no store ID is
  // present or the fetch fails, return an empty array so the client can
  // continue operating without stale local files.
  try {
    // Prefer an explicit public blob URL from env when provided.
    const publicUrl = process.env.RESULTS_PUBLIC_URL || process.env.VITE_RESULTS_PUBLIC_URL
    if (publicUrl) {
      const resp = await fetch(publicUrl)
      if (!resp.ok) return []
      const buf = await resp.arrayBuffer()
      const text = Buffer.from(buf).toString('utf8')
      return JSON.parse(text || '[]')
    }

    const text = await readBlobText('results.json')
    if (!text) return []
    return JSON.parse(text || '[]')
  } catch (err) {
    return []
  }
}

async function writeResults(rows) {
  const text = JSON.stringify(rows, null, 2)
  try {
    const ok = await writeBlobText('results.json', text)
    if (ok) return
  } catch (err) {
    // fallback to file
  }

  const tmp = resultsFile + '.tmp'
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, resultsFile)
  
}

export default async function handler(req, res) {
  const method = req.method

  if (method === 'GET') {
    const rows = await readResults()
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
      const existing = await readResults()
      const map = new Map(existing.map((r) => [r.fixtureId, r]))
      incoming.forEach((r) => { if (r && r.fixtureId) map.set(r.fixtureId, r) })
      const merged = Array.from(map.values())
      await writeResults(merged)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
      res.end(JSON.stringify({ ok: true, count: merged.length }))
      return
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'failed to save results' }))
      return
    }
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'method not allowed' }))
}
