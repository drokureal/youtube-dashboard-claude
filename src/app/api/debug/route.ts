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
  
  // Test 1: Using googleapis library
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: channel.access_token })
  
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client })
  
  let libraryResult = null
  let libraryError = null
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channel.channel_id}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue',
      dimensions: 'day',
      sort: 'day',
    })
    libraryResult = data
  } catch (err: any) {
    libraryError = err.message
  }
  
  // Test 2: Direct HTTP fetch to the API (bypassing googleapis library)
  let fetchResult = null
  let fetchError = null
  try {
    const apiUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports')
    apiUrl.searchParams.set('ids', `channel==${channel.channel_id}`)
    apiUrl.searchParams.set('startDate', startDate)
    apiUrl.searchParams.set('endDate', endDate)
    apiUrl.searchParams.set('metrics', 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue')
    apiUrl.searchParams.set('dimensions', 'day')
    apiUrl.searchParams.set('sort', 'day')
    
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${channel.access_token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      fetchError = `HTTP ${response.status}: ${errorText}`
    } else {
      fetchResult = await response.json()
    }
  } catch (err: any) {
    fetchError = err.message
  }
  
  // Test 3: Direct HTTP fetch WITHOUT revenue metric
  let fetchNoRevenueResult = null
  let fetchNoRevenueError = null
  try {
    const apiUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports')
    apiUrl.searchParams.set('ids', `channel==${channel.channel_id}`)
    apiUrl.searchParams.set('startDate', startDate)
    apiUrl.searchParams.set('endDate', endDate)
    apiUrl.searchParams.set('metrics', 'views,estimatedMinutesWatched,subscribersGained,subscribersLost')
    apiUrl.searchParams.set('dimensions', 'day')
    apiUrl.searchParams.set('sort', 'day')
    
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${channel.access_token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      fetchNoRevenueError = `HTTP ${response.status}: ${errorText}`
    } else {
      fetchNoRevenueResult = await response.json()
    }
  } catch (err: any) {
    fetchNoRevenueError = err.message
  }

  // Test 4: Using channel==MINE instead of specific channel ID
  let fetchMineResult = null
  let fetchMineError = null
  try {
    const apiUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports')
    apiUrl.searchParams.set('ids', 'channel==MINE')
    apiUrl.searchParams.set('startDate', startDate)
    apiUrl.searchParams.set('endDate', endDate)
    apiUrl.searchParams.set('metrics', 'views,estimatedMinutesWatched,subscribersGained,subscribersLost')
    apiUrl.searchParams.set('dimensions', 'day')
    apiUrl.searchParams.set('sort', 'day')
    
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${channel.access_token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      fetchMineError = `HTTP ${response.status}: ${errorText}`
    } else {
      fetchMineResult = await response.json()
    }
  } catch (err: any) {
    fetchMineError = err.message
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
    test1_library: {
      method: 'googleapis library',
      dates: libraryResult?.rows?.map((row: any) => row[0]) || [],
      error: libraryError,
      rowCount: libraryResult?.rows?.length || 0,
    },
    test2_directFetch: {
      method: 'direct HTTP fetch with revenue',
      dates: fetchResult?.rows?.map((row: any) => row[0]) || [],
      error: fetchError,
      rowCount: fetchResult?.rows?.length || 0,
    },
    test3_noRevenue: {
      method: 'direct HTTP fetch WITHOUT revenue',
      dates: fetchNoRevenueResult?.rows?.map((row: any) => row[0]) || [],
      error: fetchNoRevenueError,
      rowCount: fetchNoRevenueResult?.rows?.length || 0,
    },
    test4_MINE: {
      method: 'direct HTTP fetch with channel==MINE',
      dates: fetchMineResult?.rows?.map((row: any) => row[0]) || [],
      error: fetchMineError,
      rowCount: fetchMineResult?.rows?.length || 0,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
