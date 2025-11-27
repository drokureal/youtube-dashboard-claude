import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url))
  
  response.cookies.delete('user_id')
  
  return response
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  
  response.cookies.delete('user_id')
  
  return response
}
