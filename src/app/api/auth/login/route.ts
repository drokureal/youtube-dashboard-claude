import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthUrl } from '@/lib/google'

// This route is now used for connecting YouTube channels via Google OAuth
// User must be logged in first
export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return NextResponse.redirect(new URL('/?error=not_logged_in', request.url))
  }

  const authUrl = getAuthUrl('add_channel')

  return NextResponse.redirect(authUrl)
}
