#!/usr/bin/env node
// Uploads the generated .docx to Google Drive, converting to a Google Doc.
//
// Default behavior: if a `.gdoc-state.json` file exists next to the script,
// the existing Doc is updated in place (same URL). Otherwise a new Doc is
// created and its id is written to `.gdoc-state.json` for next time.
//
// Flags:
//   --new    force creating a new doc even if state exists
//   --file   path to a .docx (defaults to docs/dtcmvp-offers-profile-plan.docx)

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const forceNew = args.includes('--new')
const fileIdx = args.indexOf('--file')
const DOCX = fileIdx >= 0 ? args[fileIdx + 1] :
  path.join(__dirname, '..', 'docs', 'dtcmvp-offers-profile-plan.docx')

const STATE_PATH = path.join(__dirname, '.gdoc-state.json')
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) } catch { return null }
}
function saveState(s) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2))
}

// Load env from brand-list-builder (same pattern as tam-org-to-sheet.js)
const envPath = path.join(
  __dirname, '..', '..', 'TAM Builder', 'brand-list-builder', '.env'
)
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`OAuth: ${data.error_description || data.error}`)
  return data.access_token
}

async function createGoogleDoc(token, filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const metadata = {
    name: 'dtcmvp SWAG Directory — Plan',
    mimeType: 'application/vnd.google-apps.document',
  }

  const boundary = '-------dtcmvp-carwash-' + Date.now()
  const body = buildMultipart(metadata, fileBuffer, boundary)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    }
  )
  const text = await res.text()
  if (!res.ok) throw new Error(`Drive create failed ${res.status}: ${text}`)
  return JSON.parse(text)
}

async function updateGoogleDoc(token, fileId, filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  // Update in place. Keep the name in sync so we can rename the doc via title updates.
  const metadata = {
    name: 'dtcmvp SWAG Directory — Plan',
  }
  const boundary = '-------dtcmvp-carwash-' + Date.now()
  const body = buildMultipart(metadata, fileBuffer, boundary)

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,webViewLink,mimeType,version`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    }
  )
  const text = await res.text()
  if (!res.ok) throw new Error(`Drive update failed ${res.status}: ${text}`)
  return JSON.parse(text)
}

function buildMultipart(metadata, fileBuffer, boundary) {
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`
  return Buffer.concat([
    Buffer.from(
      delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n',
      'utf-8'
    ),
    fileBuffer,
    Buffer.from(closeDelim, 'utf-8'),
  ])
}

;(async () => {
  console.log('› docx:', DOCX)
  if (!fs.existsSync(DOCX)) {
    console.error('file not found:', DOCX)
    process.exit(1)
  }

  console.log('› getting access token…')
  const token = await getAccessToken()

  const state = forceNew ? null : loadState()
  let file

  if (state && state.fileId) {
    console.log(`› updating existing doc in place (${state.fileId})…`)
    file = await updateGoogleDoc(token, state.fileId, DOCX)
    console.log('  ✓ updated')
  } else {
    console.log('› creating new Google Doc with conversion…')
    file = await createGoogleDoc(token, DOCX)
    saveState({ fileId: file.id, name: file.name, webViewLink: file.webViewLink })
    console.log('  ✓ created (state saved to .gdoc-state.json)')
  }

  console.log('')
  console.log('  name :', file.name)
  console.log('  id   :', file.id)
  console.log('  mime :', file.mimeType)
  console.log('  url  :', file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`)
  console.log('')
})().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
