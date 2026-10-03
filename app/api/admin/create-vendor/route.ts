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

    // Pre-check for existing account email in users or vendors table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, role')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        {
          error: `An account with email '${cleanEmail}' is already registered in the system (Role: ${existingUser.role}).`,
        },
        { status: 400 }
      )
    }

    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id, email')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingVendor) {
      return NextResponse.json(
        {
          error: `A vendor store with email '${cleanEmail}' is already registered.`,
        },
        { status: 400 }
      )
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const vendorId = `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Try Supabase auth signup first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: String(password),
      options: {
        data: {
          name,
          role: 'vendor',
          phone: phone || null,
          address: address || null,
          restaurant_name: storeName,
          cuisine: cuisine || vendorType,
        },
      },
    })

    const finalUserId = authData?.user?.id || userId

    // Insert user record in public.users
    const { error: userError } = await supabase.from('users').insert([
      {
        id: finalUserId,
        name: String(name).trim(),
        email: cleanEmail,
        role: 'vendor',
        phone: phone || null,
        address: address || null,
        restaurant_name: String(storeName).trim(),
        cuisine: cuisine || vendorType,
        created_at: new Date().toISOString(),
      },
    ])

    if (userError) {
      console.warn('Could not insert user profile:', userError.message)
    }

    // Insert vendor record in public.vendors
    const { error: vendorError } = await supabase.from('vendors').insert([
      {
        id: vendorId,
        userId: finalUserId,
        storeName: String(storeName).trim(),
        email: cleanEmail,
        phone: phone || null,
        description: `${vendorType} · ${cuisine || 'Food & Dining'}`,
        address: address || 'Bengaluru, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
        status: 'ACTIVE',
        isOpen: true,
        bannerUrl: bannerUrl || null,
        commissionType: paymentModel === 'markup' ? 'MARKUP' : 'COMMISSION',
        commissionRate: Number(commissionRate),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    if (vendorError) {
      console.warn('Could not insert vendor record:', vendorError.message)
    }

    // If Restaurant Vendor, insert into public.restaurants
    if (vendorType === 'Restaurant Vendor' || vendorType === 'restaurant') {
      await supabase.from('restaurants').insert([
        {
          id: vendorId,
          name: String(storeName).trim(),
          cuisine: cuisine || 'Multi-Cuisine',
          rating: 4.5,
          delivery_time: '25-35 min',
          min_order: 100,
          image:
            bannerUrl ||
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
          is_open: true,
          address: address || 'Bengaluru',
        },
      ])
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
