import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'
import { getYouTubeAnalytics, refreshAccessToken } from '@/lib/google'
import { format, subDays, parseISO } from 'date-fns'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get('channelId') // 'all' or specific channel db id
  const days = parseInt(searchParams.get('days') || '28')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  
  const supabase = createServiceClient()
  
  // Get channels for this user
  let channelsQuery = supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
  
  if (channelId && channelId !== 'all') {
    channelsQuery = channelsQuery.eq('id', channelId)
  }
  
  const { data: channels, error: channelsError } = await channelsQuery
  
  if (channelsError || !channels || channels.length === 0) {
    return NextResponse.json({ error: 'No channels found' }, { status: 404 })
  }
  
  // Calculate date range
  let endDate: string
  let startDate: string
  let previousStartDate: string
  let previousEndDate: string
  
  if (startDateParam && endDateParam) {
    startDate = startDateParam
    endDate = endDateParam
    const daysDiff = Math.ceil(
      (parseISO(endDate).getTime() - parseISO(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    previousEndDate = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd')
    previousStartDate = format(subDays(parseISO(startDate), daysDiff + 1), 'yyyy-MM-dd')
  } else {
    endDate = format(new Date(), 'yyyy-MM-dd') // Today (API returns what's available)
    startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')
    previousEndDate = format(subDays(new Date(), days), 'yyyy-MM-dd')
    previousStartDate = format(subDays(new Date(), days * 2), 'yyyy-MM-dd')
  }
  
  const analyticsResults = []
  const previousResults = []
  
  for (const channel of channels) {
    let accessToken = channel.access_token
    
    // Check if token is expired and refresh if needed
    if (channel.token_expiry && new Date(channel.token_expiry) < new Date()) {
      try {
        const newTokens = await refreshAccessToken(channel.refresh_token)
        accessToken = newTokens.access_token!
        
        // Update token in database
        await supabase
          .from('channels')
          .update({
            access_token: newTokens.access_token,
            token_expiry: newTokens.expiry_date 
              ? new Date(newTokens.expiry_date).toISOString() 
              : null,
          })
          .eq('id', channel.id)
      } catch (error) {
        console.error(`Failed to refresh token for channel ${channel.channel_id}:`, error)
        continue
      }
    }
    
    try {
      // Get current period analytics
      const analytics = await getYouTubeAnalytics(
        accessToken,
        channel.channel_id,
        startDate,
        endDate
      )
      
      // Get previous period analytics for comparison
      const previousAnalytics = await getYouTubeAnalytics(
        accessToken,
        channel.channel_id,
        previousStartDate,
        previousEndDate
      )
      
      if (analytics) {
        analyticsResults.push({
          channelId: channel.id,
          channelYoutubeId: channel.channel_id,
          channelTitle: channel.channel_title,
          channelThumbnail: channel.channel_thumbnail,
          data: analytics,
        })
      }
      
      if (previousAnalytics) {
        previousResults.push({
          channelId: channel.id,
          data: previousAnalytics,
        })
      }
    } catch (error) {
      console.error(`Failed to get analytics for channel ${channel.channel_id}:`, error)
    }
  }
  
  // Process and combine analytics data
  const processedData = processAnalyticsData(analyticsResults, previousResults)
  
  return NextResponse.json({
    analytics: processedData,
    dateRange: { startDate, endDate },
    previousDateRange: { startDate: previousStartDate, endDate: previousEndDate },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

function processAnalyticsData(
  currentResults: any[],
  previousResults: any[]
) {
  const channelBreakdown = []
  const dailyDataMap = new Map<string, any>()
  
  let totalViews = 0
  let totalWatchTimeMinutes = 0
  let totalSubscribersGained = 0
  let totalSubscribersLost = 0
  let totalRevenue = 0
  
  let prevTotalViews = 0
  let prevTotalWatchTime = 0
  let prevTotalSubscribers = 0
  let prevTotalRevenue = 0
  
  // Process current period data
  for (const result of currentResults) {
    const rows = result.data.rows || []
    
    let channelViews = 0
    let channelWatchTime = 0
    let channelSubsGained = 0
    let channelSubsLost = 0
    let channelRevenue = 0
    
    for (const row of rows) {
      const [date, views, watchTime, subsGained, subsLost, revenue] = row
      
      channelViews += views || 0
      channelWatchTime += watchTime || 0
      channelSubsGained += subsGained || 0
      channelSubsLost += subsLost || 0
      channelRevenue += revenue || 0
      
      // Aggregate daily data
      const existing = dailyDataMap.get(date) || {
        date,
        views: 0,
        watchTimeMinutes: 0,
        subscribersGained: 0,
        subscribersLost: 0,
        estimatedRevenue: 0,
      }
      
      existing.views += views || 0
      existing.watchTimeMinutes += watchTime || 0
      existing.subscribersGained += subsGained || 0
      existing.subscribersLost += subsLost || 0
      existing.estimatedRevenue += revenue || 0
      
      dailyDataMap.set(date, existing)
    }
    
    totalViews += channelViews
    totalWatchTimeMinutes += channelWatchTime
    totalSubscribersGained += channelSubsGained
    totalSubscribersLost += channelSubsLost
    totalRevenue += channelRevenue
    
    // Find previous period data for this channel
    const prevResult = previousResults.find(p => p.channelId === result.channelId)
    let prevChannelViews = 0
    let prevChannelWatchTime = 0
    let prevChannelSubs = 0
    let prevChannelRevenue = 0
    
    if (prevResult && prevResult.data.rows) {
      for (const row of prevResult.data.rows) {
        prevChannelViews += row[1] || 0
        prevChannelWatchTime += row[2] || 0
        prevChannelSubs += (row[3] || 0) - (row[4] || 0)
        prevChannelRevenue += row[5] || 0
      }
    }
    
    channelBreakdown.push({
      channelId: result.channelId,
      channelYoutubeId: result.channelYoutubeId,
      channelTitle: result.channelTitle,
      channelThumbnail: result.channelThumbnail,
      views: channelViews,
      watchTimeMinutes: channelWatchTime,
      subscribersGained: channelSubsGained,
      subscribersLost: channelSubsLost,
      netSubscribers: channelSubsGained - channelSubsLost,
      estimatedRevenue: channelRevenue,
      rpm: channelViews > 0 ? (channelRevenue / channelViews) * 1000 : 0,
      previousViews: prevChannelViews,
      previousWatchTime: prevChannelWatchTime,
      previousSubscribers: prevChannelSubs,
      previousRevenue: prevChannelRevenue,
    })
    
    prevTotalViews += prevChannelViews
    prevTotalWatchTime += prevChannelWatchTime
    prevTotalSubscribers += prevChannelSubs
    prevTotalRevenue += prevChannelRevenue
  }
  
  // Process previous period totals
  for (const result of previousResults) {
    const rows = result.data.rows || []
    for (const row of rows) {
      // Already processed above
    }
  }
  
  const netSubscribers = totalSubscribersGained - totalSubscribersLost
  
  // Sort daily data by date
  const dailyData = Array.from(dailyDataMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  )
  
  // Calculate RPM for each day
  dailyData.forEach(day => {
    day.rpm = day.views > 0 ? (day.estimatedRevenue / day.views) * 1000 : 0
    day.netSubscribers = day.subscribersGained - day.subscribersLost
  })
  
  return {
    summary: {
      views: totalViews,
      watchTimeMinutes: totalWatchTimeMinutes,
      watchTimeHours: Math.round(totalWatchTimeMinutes / 60),
      subscribersGained: totalSubscribersGained,
      subscribersLost: totalSubscribersLost,
      netSubscribers,
      estimatedRevenue: totalRevenue,
      rpm: totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0,
      // Comparison with previous period
      viewsChange: totalViews - prevTotalViews,
      watchTimeChange: Math.round((totalWatchTimeMinutes - prevTotalWatchTime) / 60),
      subscribersChange: netSubscribers - prevTotalSubscribers,
      revenueChange: totalRevenue - prevTotalRevenue,
    },
    dailyData,
    channelBreakdown,
  }
}
