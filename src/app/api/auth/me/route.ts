import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value
  
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  
  const supabase = createServiceClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  
  return NextResponse.json({ user })
}
