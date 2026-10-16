import { handleAuthError, requireRole } from '@/lib/auth-helpers'
import { generateCraveXPSku, normalizeCraveXPBarcode } from '@/lib/cravexp-product-code'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'

function nonNegativeInteger(value: unknown, field: string, fallback?: number): number {
  const number = value === undefined || value === '' ? fallback : Number(value)
  if (number === undefined || !Number.isInteger(number) || number < 0) {
    throw Object.assign(new Error(`${field} must be a non-negative whole number`), {
      statusCode: 400,
    })
  }
  return number
}

function productData(body: Record<string, unknown>) {
  const name = String(body.name || '').trim()
  const category = String(body.category || '').trim()
  const unit = String(body.unit || '1 Pack').trim()
  const price = nonNegativeInteger(body.price, 'price')
  const mrp = nonNegativeInteger(body.mrp, 'mrp', price)
  const stockCount = nonNegativeInteger(body.stock_count, 'stock_count', 0)
  const barcode = normalizeCraveXPBarcode(body.barcode)

  if (!name || !category || !unit) {
    throw Object.assign(new Error('name, category, and unit are required'), { statusCode: 400 })
  }
  if (mrp < price) {
    throw Object.assign(new Error('mrp must be equal to or greater than price'), {
      statusCode: 400,
    })
  }
  if (barcode && (barcode.length < 4 || barcode.length > 128)) {
    throw Object.assign(new Error('barcode must contain between 4 and 128 characters'), {
      statusCode: 400,
    })
  }

  return {
    name,
    category,
    unit,
    price,
    mrp,
    description: body.description ? String(body.description).trim() : null,
    image: body.image ? String(body.image).trim() : null,
    in_stock: Boolean(body.in_stock) && stockCount > 0,
    stock_count: stockCount,
    sku_code: generateCraveXPSku({ name, category, unit, barcode }),
    barcode: barcode || null,
    is_veg: body.is_veg !== false,
    hsn_sac_code: body.hsn_sac_code ? String(body.hsn_sac_code).trim() : '996331',
    price_tax_mode: body.price_tax_mode === 'TAX_EXCLUSIVE' ? 'TAX_EXCLUSIVE' : 'TAX_INCLUSIVE',
  }
}

function productErrorResponse(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
    return NextResponse.json(
      { error: 'This barcode is already assigned to another XP product.' },
      { status: 409 }
    )
  }
  return handleAuthError(error)
}

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin')
    const products = await prisma.craveXPProduct.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, products })
  } catch (error) {
    return productErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin')
    const body = await request.json()
    const product = await prisma.craveXPProduct.create({
      data: {
        id: typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID(),
        ...productData(body),
      },
    })
    await broadcast('cravexp_products', {
      type: 'create',
      product,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error) {
    return productErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, 'admin')
    const body = await request.json()
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
    }
    const product = await prisma.craveXPProduct.update({
      where: { id: body.id },
      data: productData(body),
    })
    await broadcast('cravexp_products', {
      type: 'update',
      product,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, product })
  } catch (error) {
    return productErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, 'admin')
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Product id is required' }, { status: 400 })

    await prisma.craveXPProduct.delete({ where: { id } })
    await broadcast('cravexp_products', {
      type: 'delete',
      id,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
