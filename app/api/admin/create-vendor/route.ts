import { createUser, findUserByEmail } from '@/lib/dal'
import { createRestaurant } from '@/lib/dal/restaurants'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      storeName,
      vendorType = 'Restaurant Vendor',
      cuisine,
      phone,
      address,
      commercialModel = 'commission',
      commissionRate = 15,
      markupRate = 0,
      fixedCommission = 0,
      fixedMarkup = 0,
      gstRatePercent = 18,
      paymentModel = 'commission',
      bannerUrl,
      latitude,
      longitude,
      fssaiLicense,
      gstin,
      gstStatus = 'REGISTERED',
      supplierState = 'Karnataka',
      priceTaxMode = 'TAX_INCLUSIVE',
      contractNumber,
      bankAccountName,
      bankName,
      bankAccountNumber,
      bankIfsc,
      payoutVpa,
    } = body

    if (!name || !email || !password || !storeName) {
      return NextResponse.json(
        { error: 'Owner name, email, password, and store name are required.' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()

    // Pre-check for existing account email
    const existingUser = await findUserByEmail(cleanEmail)
    if (existingUser) {
      return NextResponse.json(
        {
          error: `An account with email '${cleanEmail}' is already registered in the system (Role: ${existingUser.role}).`,
        },
        { status: 400 }
      )
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const vendorId = `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const generatedContractNum =
      contractNumber || `CRV-CC-2026-${Math.floor(100 + Math.random() * 900)}`

    const finalUserId = userId
    const vendorRole =
      vendorType === 'CraveXP Store Vendor' ? 'cravexp_store_vendor' : 'restaurant_vendor'

    const passwordHash = crypto.scryptSync(String(password), cleanEmail, 64).toString('hex')
    const isDarkStore = vendorRole === 'cravexp_store_vendor'

    // Insert user record via Prisma
    try {
      await createUser({
        id: finalUserId,
        name: String(name).trim(),
        email: cleanEmail,
        role: vendorRole,
        password_hash: passwordHash,
        phone: phone || null,
        address: address || null,
        restaurant_name: String(storeName).trim(),
        cuisine: cuisine || (isDarkStore ? 'Dark Store Grocery' : vendorType),
      })
    } catch (err: any) {
      console.warn('Could not insert user profile:', err?.message)
    }

    // Insert restaurant record via Prisma (for both standard restaurants and dark stores)
    try {
      await createRestaurant({
        id: vendorId,
        name: String(storeName).trim(),
        cuisine: cuisine || (isDarkStore ? 'Dark Store Grocery' : 'Multi-Cuisine'),
        rating: 4.8,
        delivery_minutes: isDarkStore ? 10 : 25,
        image:
          bannerUrl ||
          (isDarkStore
            ? 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'
            : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'),
        is_open: true,
        is_dark_store: isDarkStore,
        address: address || 'Bengaluru',
        owner_id: finalUserId,
        commercial_model: String(commercialModel),
        commission_rate: Number(commissionRate),
        markup_rate: Number(markupRate),
        fixed_commission: Number(fixedCommission),
        fixed_markup: Number(fixedMarkup),
        payment_model: paymentModel,
        phone: phone || null,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        fssai_license: fssaiLicense || null,
        gstin: gstin || null,
        gst_status: gstStatus || 'REGISTERED',
        gst_rate_percent: Number(gstRatePercent),
        supplier_state: supplierState || 'Karnataka',
        price_tax_mode: priceTaxMode || 'TAX_INCLUSIVE',
        contract_number: generatedContractNum,
        bank_account_name: bankAccountName || null,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_ifsc: bankIfsc || null,
        payout_vpa: payoutVpa || null,
      })
    } catch (err: any) {
      console.warn('Could not insert restaurant record:', err?.message)
    }

    // Broadcast real-time vendor creation to Admin WebSocket channels
    broadcast('admin_stats', {
      type: 'user_signup',
      role: vendorRole,
      user: { id: finalUserId, name: String(name).trim(), email: cleanEmail, role: vendorRole },
      timestamp: new Date().toISOString(),
    })
    broadcast('admin_users', {
      type: 'user_signup',
      user: { id: finalUserId, name: String(name).trim(), email: cleanEmail, role: vendorRole },
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Vendor '${storeName}' successfully onboarded!`,
      vendor: {
        id: vendorId,
        userId: finalUserId,
        storeName,
        email: cleanEmail,
        vendorType,
        commissionRate,
      },
    })
  } catch (error: any) {
    console.error('Error in create-vendor endpoint:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to onboard vendor' },
      { status: 500 }
    )
  }
}
