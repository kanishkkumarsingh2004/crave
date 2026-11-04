import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const APK_MAP: Record<string, string> = {
  'crave-admin-debug.apk': 'crave-admin-debug.apk',
  'crave-admin-release.apk': 'crave-admin-release.apk',
  'crave-driver-debug.apk': 'crave-driver-debug.apk',
  'crave-driver-release.apk': 'crave-driver-release.apk',
  'crave-restaurant-debug.apk': 'crave-restaurant-debug.apk',
  'crave-restaurant-release.apk': 'crave-restaurant-release.apk',
  'crave-customer-debug.apk': 'crave-customer-debug.apk',
  'crave-customer-release.apk': 'crave-customer-release.apk',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const apkFilename = APK_MAP[filename]

  if (!apkFilename) {
    return NextResponse.json({ error: 'APK not found' }, { status: 404 })
  }

  try {
    const filePath = join(process.cwd(), 'android-builds', apkFilename)
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${apkFilename}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'APK file not found' }, { status: 404 })
  }
}