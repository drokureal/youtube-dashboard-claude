import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'
import { google } from 'googleapis'
import { format, subDays } from 'date-fns'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  )
}

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
  const endDate = format(now, 'yyyy-MM-dd')
  const startDate = format(subDays(now, 7), 'yyyy-MM-dd')
  
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: channel.access_token })
  
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client })
  
  // Test 1: Using channel==channelId
  let result1 = null
  let error1 = null
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channel.channel_id}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue',
      dimensions: 'day',
      sort: 'day',
    })
    result1 = data
  } catch (err: any) {
    error1 = err.message
  }
  
  // Test 2: Using channel==MINE
  let result2 = null
  let error2 = null
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue',
      dimensions: 'day',
      sort: 'day',
    })
    result2 = data
  } catch (err: any) {
    error2 = err.message
  }
  
  // Test 3: Without revenue (in case that's causing delay)
  let result3 = null
  let error3 = null
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channel.channel_id}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
      dimensions: 'day',
      sort: 'day',
    })
    result3 = data
  } catch (err: any) {
    error3 = err.message
  }
  
  return NextResponse.json({
    debug: {
      serverTime: now.toISOString(),
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      channelId: channel.channel_id,
      channelTitle: channel.channel_title,
      tokenExpiry: channel.token_expiry,
      tokenLength: channel.access_token?.length,
      refreshTokenExists: !!channel.refresh_token,
    },
    test1_channelId: {
      dates: result1?.rows?.map((row: any) => row[0]) || [],
      error: error1,
      rowCount: result1?.rows?.length || 0,
    },
    test2_MINE: {
      dates: result2?.rows?.map((row: any) => row[0]) || [],
      error: error2,
      rowCount: result2?.rows?.length || 0,
    },
    test3_noRevenue: {
      dates: result3?.rows?.map((row: any) => row[0]) || [],
      error: error3,
      rowCount: result3?.rows?.length || 0,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
