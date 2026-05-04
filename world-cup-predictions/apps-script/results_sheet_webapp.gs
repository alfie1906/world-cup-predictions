const SHEET_NAME = 'Results'

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}')
    const rows = Array.isArray(payload.rows) ? payload.rows : []
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)

    if (!sheet) {
      return jsonResponse({ ok: false, error: `Missing sheet: ${SHEET_NAME}` })
    }

    ensureHeaders(sheet)
    updateRows(sheet, rows)

    return jsonResponse({ ok: true, rows: rows.length })
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) })
  }
}

function ensureHeaders(sheet) {
  const headers = ['Match', 'Fixture ID', 'Result']
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0]
  const needsHeaders = headers.some((header, index) => current[index] !== header)

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  }
}

function updateRows(sheet, rows) {
  const lastRow = Math.max(sheet.getLastRow(), 1)
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 3).getValues() : []
  const rowByFixtureId = {}

  values.forEach((row, index) => {
    const fixtureId = String(row[1] || '').trim()
    if (fixtureId) rowByFixtureId[fixtureId] = index + 2
  })

  rows.forEach((row) => {
    const fixtureId = String(row.fixtureId || row['Fixture ID'] || '').trim()
    if (!fixtureId) return

    const match = String(row.match || row.Match || '').trim()
    const result = normalizeResult(row.result || row.Result)
    const existingRow = rowByFixtureId[fixtureId]

    if (existingRow) {
      if (match) sheet.getRange(existingRow, 1).setValue(match)
      if (result) sheet.getRange(existingRow, 3).setValue(result)
    }
  })
}

function normalizeResult(value) {
  const result = String(value || '').trim().toUpperCase()
  if (['H', 'X', 'A'].includes(result)) return result
  return ''
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
