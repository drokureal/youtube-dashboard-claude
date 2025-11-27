import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const addChannel = searchParams.get('addChannel') === 'true'
  
  // State can be used to pass info through the OAuth flow
  const state = addChannel ? 'add_channel' : 'login'
  
  const authUrl = getAuthUrl(state)
  
  return NextResponse.redirect(authUrl)
}
