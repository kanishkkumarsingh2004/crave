import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'android-builds', 'version.json')
    const fileContent = await readFile(filePath, 'utf8')
    const manifest = JSON.parse(fileContent)

    // Rewrite androidUrl to point to local download endpoints
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    for (const [appName, appData] of Object.entries(manifest.apps)) {
      if (appData && typeof appData === 'object' && 'androidUrl' in appData) {
        const url = new URL(appData.androidUrl as string)
        const filename = url.pathname.split('/').pop()
        if (filename) {
          ;(appData as any).androidUrl = `${baseUrl}/api/downloads/android/${filename}`
        }
      }
    }

    return NextResponse.json(manifest, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Version manifest not found' }, { status: 404 })
  }
}