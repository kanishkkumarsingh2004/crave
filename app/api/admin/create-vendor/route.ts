import { createUser, findUserByEmail } from '@/lib/dal'
import { createRestaurant } from '@/lib/dal/restaurants'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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
      commissionRate = 15,
      paymentModel = 'commission',
      bannerUrl,
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

    const finalUserId = userId
    const vendorRole = vendorType === 'CraveXP Store Vendor' ? 'cravexp_store_vendor' : 'restaurant_vendor'

    // Insert user record via Prisma
    try {
      await createUser({
        id: finalUserId,
        name: String(name).trim(),
        email: cleanEmail,
        role: vendorRole,
        phone: phone || null,
        address: address || null,
        restaurant_name: String(storeName).trim(),
        cuisine: cuisine || vendorType,
      })
    } catch (err: any) {
      console.warn('Could not insert user profile:', err?.message)
    }

    // Insert restaurant record via Prisma
    if (vendorType === 'Restaurant Vendor' || vendorType === 'restaurant') {
      try {
        await createRestaurant({
          id: vendorId,
          name: String(storeName).trim(),
          cuisine: cuisine || 'Multi-Cuisine',
          rating: 4.5,
          delivery_minutes: 25,
          image:
            bannerUrl ||
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
          is_open: true,
          address: address || 'Bengaluru',
          owner_id: finalUserId,
          commission_rate: Number(commissionRate),
          payment_model: paymentModel,
        })
      } catch (err: any) {
        console.warn('Could not insert restaurant record:', err?.message)
      }
    }

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
