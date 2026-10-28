import { handleAuthError, requireRole } from '@/lib/auth-helpers'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin')

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No image file provided. Please attach an image file.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid file format. Allowed formats: PNG, JPG, WebP, GIF, SVG.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit. Maximum allowed size is 5MB.' },
        { status: 400 }
      )
    }

    // Determine extension
    const extension =
      path.extname(file.name).toLowerCase() ||
      (file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/png' ? '.png' : '.webp')

    const filename = `product_${Date.now()}_${randomUUID().slice(0, 8)}${extension}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cravexp')

    await fs.mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(uploadDir, filename)
    await fs.writeFile(filePath, buffer)

    const publicUrl = `/uploads/cravexp/${filename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
