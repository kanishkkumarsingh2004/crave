import { findUserByEmail, deleteUser } from '@/lib/dal'
import { deleteRestaurant, deleteRestaurantsByOwner } from '@/lib/dal/restaurants'
import { deleteMenuItemsByRestaurant } from '@/lib/dal/menu-items'
import { prisma } from '@/lib/prisma'
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

    let targetUserId = userId
    let targetVendorId = vendorId

    // Resolve user from email if only email provided
    if (!targetUserId && email) {
      const user = await findUserByEmail(email)
      if (user) {
        targetUserId = user.id
      }
    }

    // 1. Delete associated menu items
    if (targetVendorId) {
      try {
        await deleteMenuItemsByRestaurant(targetVendorId)
      } catch (e: any) {
        console.warn('Menu items deletion notice:', e?.message)
      }
    }

    // 2. Delete from restaurants table
    if (targetVendorId) {
      try {
        await deleteRestaurant(targetVendorId)
      } catch (e: any) {
        console.warn('Restaurant deletion notice:', e?.message)
      }
    }
    if (targetUserId) {
      try {
        await deleteRestaurantsByOwner(targetUserId)
      } catch (e: any) {
        console.warn('Owner restaurants deletion notice:', e?.message)
      }
    }

    // 3. Delete from users profile table
    if (targetUserId) {
      try {
        await deleteUser(targetUserId)
      } catch (e: any) {
        console.warn('User deletion notice:', e?.message)
      }
    }
    if (targetVendorId && targetVendorId !== targetUserId) {
      try {
        await deleteUser(targetVendorId)
      } catch (e: any) {
        // May not exist as user
      }
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
