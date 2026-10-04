import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { vendorId, userId, email } = body

    if (!vendorId && !userId && !email) {
      return NextResponse.json(
        { error: 'Vendor ID, user ID, or email is required to delete vendor.' },
        { status: 400 }
      )
    }

    console.log(
      `[Admin Delete Vendor] Processing deletion for vendorId: ${vendorId}, userId: ${userId}, email: ${email}`
    )

    // 1. Fetch vendor info to ensure we have all associated IDs
    let targetVendorId = vendorId
    let targetUserId = userId
    let targetEmail = email

    if (vendorId) {
      const { data: vRecord } = await supabase
        .from('vendors')
        .select('*')
        .or(`id.eq.${vendorId},userId.eq.${vendorId}`)
        .maybeSingle()

      if (vRecord) {
        targetVendorId = vRecord.id
        targetUserId = vRecord.userId || targetUserId
        targetEmail = vRecord.email || targetEmail
      }
    }

    if (!targetVendorId && userId) {
      const { data: vRecord } = await supabase
        .from('vendors')
        .select('*')
        .eq('userId', userId)
        .maybeSingle()

      if (vRecord) {
        targetVendorId = vRecord.id
        targetEmail = vRecord.email || targetEmail
      }
    }

    // 2. Delete associated menu items
    if (targetVendorId) {
      const { error: menuErr } = await supabase
        .from('menu_items')
        .delete()
        .eq('restaurant_id', targetVendorId)
      if (menuErr) console.warn('Menu items deletion notice:', menuErr.message)
    }

    // 3. Delete from restaurants table
    if (targetVendorId) {
      await supabase.from('restaurants').delete().eq('id', targetVendorId)
    }
    if (targetUserId) {
      await supabase.from('restaurants').delete().eq('owner_id', targetUserId)
    }

    // 4. Delete from vendors table
    if (targetVendorId) {
      await supabase.from('vendors').delete().eq('id', targetVendorId)
    }
    if (targetUserId) {
      await supabase.from('vendors').delete().eq('userId', targetUserId)
    }
    if (targetEmail) {
      await supabase.from('vendors').delete().ilike('email', targetEmail)
    }

    // 5. Delete from users profile table
    if (targetUserId) {
      await supabase.from('users').delete().eq('id', targetUserId)
    }
    if (targetVendorId) {
      await supabase.from('users').delete().eq('id', targetVendorId)
    }
    if (targetEmail) {
      await supabase.from('users').delete().ilike('email', targetEmail)
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant/Vendor successfully deleted from platform.',
      deletedVendorId: targetVendorId,
    })
  } catch (error: any) {
    console.error('Error in delete-vendor route:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete vendor.' },
      { status: 500 }
    )
  }
}
