import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

// Fetch a published Google Sheet and return parsed rows for every tab.
// Accepts either a full "publish to web" URL or a sheet ID + gid.
// For multi-tab sheets, pass ?url=<pubhtml url> and we'll discover tabs,
// or pass ?id=<sheetId>&gid=<gid> for a single tab.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const gid = searchParams.get('gid') ?? '0'
  const rawUrl = searchParams.get('url')

  try {
    let csvUrl: string

    if (rawUrl) {
      csvUrl = rawUrl
    } else if (id) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
    } else {
      return NextResponse.json(
        { error: 'Provide ?id=<sheetId>&gid=<gid> or ?url=<csv url>' },
        { status: 400 }
      )
    }

    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Sheet fetch failed: ${res.status} ${res.statusText}` },
        { status: 502 }
      )
    }

    const csv = await res.text()
    const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false })

    return NextResponse.json({
      rows: parsed.data,
      rowCount: parsed.data.length,
      source: csvUrl,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
