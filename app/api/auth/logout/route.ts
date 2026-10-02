import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  response.cookies.delete('drop_auth_token')
  return response
}
