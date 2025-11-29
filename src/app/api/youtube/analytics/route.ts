import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'
import { getYouTubeAnalytics, getRevenueByCountry, getAnalyticsByContentType, refreshAccessToken } from '@/lib/google'
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
  // YouTube API has a 2-3 day delay, so we need to go back further to get the requested number of days
  const API_DELAY_DAYS = 3
  
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
    // End date is today (API will return up to what's available, ~3 days ago)
    endDate = format(new Date(), 'yyyy-MM-dd')
    // Start date goes back (days + API_DELAY_DAYS) to ensure we get 'days' worth of data
    startDate = format(subDays(new Date(), days + API_DELAY_DAYS - 1), 'yyyy-MM-dd')
    previousEndDate = format(subDays(new Date(), days + API_DELAY_DAYS), 'yyyy-MM-dd')
    previousStartDate = format(subDays(new Date(), (days * 2) + API_DELAY_DAYS - 1), 'yyyy-MM-dd')
  }
  
  const analyticsResults = []
  const previousResults = []
  const countryRevenueResults = []
  const contentTypeResults = []
  
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
      
      // Get revenue by country
      const countryRevenue = await getRevenueByCountry(
        accessToken,
        channel.channel_id,
        startDate,
        endDate
      )
      
      // Get analytics by content type (shorts vs long-form)
      const contentTypeData = await getAnalyticsByContentType(
        accessToken,
        channel.channel_id,
        startDate,
        endDate
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
      
      if (countryRevenue) {
        countryRevenueResults.push({
          channelId: channel.id,
          data: countryRevenue,
        })
      }
      
      if (contentTypeData) {
        contentTypeResults.push({
          channelId: channel.id,
          data: contentTypeData,
        })
      }
    } catch (error) {
      console.error(`Failed to get analytics for channel ${channel.channel_id}:`, error)
    }
  }
  
  // Process and combine analytics data
  const processedData = processAnalyticsData(analyticsResults, previousResults, countryRevenueResults, contentTypeResults)
  
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
  previousResults: any[],
  countryRevenueResults: any[],
  contentTypeResults: any[]
) {
  const channelBreakdown = []
  const dailyDataMap = new Map<string, any>()
  
  let totalViews = 0
  let totalWatchTimeMinutes = 0
  let totalSubscribersGained = 0
  let totalSubscribersLost = 0
  let totalRevenue = 0
  let totalUSRevenue = 0
  
  // Content type totals
  let totalLongFormViews = 0
  let totalLongFormWatchTime = 0
  let totalShortsViews = 0
  let totalShortsWatchTime = 0
  
  let prevTotalViews = 0
  let prevTotalWatchTime = 0
  let prevTotalSubscribers = 0
  let prevTotalRevenue = 0
  
  // Process content type data first to build daily breakdown
  const dailyContentTypeMap = new Map<string, any>()
  
  for (const result of contentTypeResults) {
    const rows = result.data.rows || []
    for (const row of rows) {
      const [date, contentType, views, watchTime] = row
      
      const existing = dailyContentTypeMap.get(date) || {
        longFormViews: 0,
        longFormWatchTime: 0,
        shortsViews: 0,
        shortsWatchTime: 0,
      }
      
      // VIDEO_ON_DEMAND = long-form, SHORTS = shorts, LIVE_STREAM = live
      if (contentType === 'VIDEO_ON_DEMAND' || contentType === 'LIVE_STREAM') {
        existing.longFormViews += views || 0
        existing.longFormWatchTime += watchTime || 0
        totalLongFormViews += views || 0
        totalLongFormWatchTime += watchTime || 0
      } else if (contentType === 'SHORTS') {
        existing.shortsViews += views || 0
        existing.shortsWatchTime += watchTime || 0
        totalShortsViews += views || 0
        totalShortsWatchTime += watchTime || 0
      }
      
      dailyContentTypeMap.set(date, existing)
    }
  }
  
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
      
      // Get content type breakdown for this date
      const contentTypeData = dailyContentTypeMap.get(date) || {
        longFormViews: 0,
        longFormWatchTime: 0,
        shortsViews: 0,
        shortsWatchTime: 0,
      }
      
      // Aggregate daily data
      const existing = dailyDataMap.get(date) || {
        date,
        views: 0,
        watchTimeMinutes: 0,
        subscribersGained: 0,
        subscribersLost: 0,
        estimatedRevenue: 0,
        longFormViews: 0,
        longFormWatchTime: 0,
        shortsViews: 0,
        shortsWatchTime: 0,
      }
      
      existing.views += views || 0
      existing.watchTimeMinutes += watchTime || 0
      existing.subscribersGained += subsGained || 0
      existing.subscribersLost += subsLost || 0
      existing.estimatedRevenue += revenue || 0
      existing.longFormViews += contentTypeData.longFormViews
      existing.longFormWatchTime += contentTypeData.longFormWatchTime
      existing.shortsViews += contentTypeData.shortsViews
      existing.shortsWatchTime += contentTypeData.shortsWatchTime
      
      dailyDataMap.set(date, existing)
    }
    
    // Get US revenue for this channel
    const countryResult = countryRevenueResults.find(c => c.channelId === result.channelId)
    let channelUSRevenue = 0
    if (countryResult && countryResult.data.rows) {
      const usRow = countryResult.data.rows.find((row: any[]) => row[0] === 'US')
      if (usRow) {
        channelUSRevenue = usRow[1] || 0
      }
    }
    
    totalViews += channelViews
    totalWatchTimeMinutes += channelWatchTime
    totalSubscribersGained += channelSubsGained
    totalSubscribersLost += channelSubsLost
    totalRevenue += channelRevenue
    totalUSRevenue += channelUSRevenue
    
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
      usRevenue: channelUSRevenue,
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
  
  // Calculate adjusted revenue (15% cut from US revenue)
  const usTaxAmount = totalUSRevenue * 0.15
  const adjustedRevenue = totalRevenue - usTaxAmount
  
  return {
    summary: {
      views: totalViews,
      watchTimeMinutes: totalWatchTimeMinutes,
      watchTimeHours: Math.round(totalWatchTimeMinutes / 60),
      subscribersGained: totalSubscribersGained,
      subscribersLost: totalSubscribersLost,
      netSubscribers,
      estimatedRevenue: totalRevenue,
      usRevenue: totalUSRevenue,
      usTaxAmount,
      adjustedRevenue,
      rpm: totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0,
      // Content type breakdown
      longFormViews: totalLongFormViews,
      longFormWatchTimeHours: Math.round(totalLongFormWatchTime / 60),
      shortsViews: totalShortsViews,
      shortsWatchTimeHours: Math.round(totalShortsWatchTime / 60),
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
