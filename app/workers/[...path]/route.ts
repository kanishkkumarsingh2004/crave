import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params
    const workerPathSegments = params?.path || []

    if (workerPathSegments.length === 0) {
      return new NextResponse('Worker path required', { status: 400 })
    }

    // Sanitize path segments to prevent directory traversal
    const safePath = path.normalize(path.join(...workerPathSegments)).replace(/^(\.\.[\/\\])+/, '')
    const rootWorkersDir = path.join(process.cwd(), 'workers')
    const fullFilePath = path.join(rootWorkersDir, safePath)

    // Security check: ensure path does not escape the workers root folder
    if (!fullFilePath.startsWith(rootWorkersDir)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    if (!fs.existsSync(fullFilePath) || fs.statSync(fullFilePath).isDirectory()) {
      return new NextResponse('Worker script not found', { status: 404 })
    }

    const fileContent = fs.readFileSync(fullFilePath)

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error serving worker script:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
