import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'
import { getYouTubeAnalytics } from '@/lib/google'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createServiceClient()
  
  // Get first channel for this user
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
  
  if (!channels || channels.length === 0) {
    return NextResponse.json({ error: 'No channels found' })
  }
  
  const channel = channels[0]
  
  // Calculate dates
  const now = new Date()
  const endDate = format(now, 'yyyy-MM-dd') // Today
  const startDate = format(subDays(now, 7), 'yyyy-MM-dd') // 7 days ago
  
  // Try fetching analytics
  let analyticsData = null
  let analyticsError = null
  
  try {
    analyticsData = await getYouTubeAnalytics(
      channel.access_token,
      channel.channel_id,
      startDate,
      endDate
    )
  } catch (err: any) {
    analyticsError = err.message || String(err)
  }
  
  return NextResponse.json({
    debug: {
      serverTime: now.toISOString(),
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      channelId: channel.channel_id,
      channelTitle: channel.channel_title,
      tokenExpiry: channel.token_expiry,
    },
    analyticsData,
    analyticsError,
    rowDates: analyticsData?.rows?.map((row: any) => row[0]) || [],
  })
}
