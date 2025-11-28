import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ user: null })
  }

  try {
    const supabase = createServiceClient()

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      }
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ user: null })
  }
}
