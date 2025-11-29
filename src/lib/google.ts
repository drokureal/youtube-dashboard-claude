import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
]

export function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  )
}

export function getAuthUrl(state?: string) {
  const oauth2Client = getOAuth2Client()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state || '',
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

export async function getUserInfo(accessToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  
  return data
}

export async function getYouTubeChannel(accessToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  const { data } = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  })
  
  return data.items?.[0] || null
}

export async function getYouTubeAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const youtubeAnalytics = google.youtubeAnalytics({ 
    version: 'v2', 
    auth: oauth2Client,
  })
  
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue',
      dimensions: 'day',
      sort: 'day',
    })
    
    return data
  } catch (error: any) {
    console.error('YouTube Analytics API error:', error?.message || error)
    throw error
  }
}

export async function getChannelAnalyticsSummary(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client })
  
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue,cpm',
    })
    
    return data
  } catch (error) {
    console.error('YouTube Analytics Summary error:', error)
    return null
  }
}

export async function getRevenueByCountry(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client })
  
  try {
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'estimatedRevenue',
      dimensions: 'country',
      sort: '-estimatedRevenue',
    })
    
    return data
  } catch (error) {
    console.error('YouTube Analytics Country Revenue error:', error)
    return null
  }
}

export async function getLongFormVideoCount(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  
  try {
    // Get uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId],
    })
    
    const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) return 0
    
    // Convert dates to Date objects for comparison
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    
    let longFormCount = 0
    let pageToken: string | null | undefined = undefined
    
    // Paginate through uploads (limit to 200 videos to avoid too many API calls)
    for (let page = 0; page < 4; page++) {
      const listParams: {
        part: string[]
        playlistId: string
        maxResults: number
        pageToken?: string
      } = {
        part: ['contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: 50,
      }
      
      if (pageToken) {
        listParams.pageToken = pageToken
      }
      
      const response = await youtube.playlistItems.list(listParams)
      const items = response.data.items || []
      
      let foundOlder = false
      
      for (const item of items) {
        const publishedAt = new Date(item.contentDetails?.videoPublishedAt || '')
        
        // Stop if we've gone past the date range
        if (publishedAt < start) {
          foundOlder = true
          break
        }
        
        // Check if within date range
        if (publishedAt >= start && publishedAt <= end) {
          const videoId = item.contentDetails?.videoId
          if (videoId) {
            const videoResponse = await youtube.videos.list({
              part: ['contentDetails'],
              id: [videoId],
            })
            
            const duration = videoResponse.data.items?.[0]?.contentDetails?.duration || ''
            const seconds = parseDuration(duration)
            
            // Only count if longer than 60 seconds (not a Short)
            if (seconds > 60) {
              longFormCount++
            }
          }
        }
      }
      
      if (foundOlder || !response.data.nextPageToken) {
        break
      }
      
      pageToken = response.data.nextPageToken
    }
    
    return longFormCount
  } catch (error) {
    console.error('YouTube Video Count error:', error)
    return 0
  }
}

// Parse ISO 8601 duration (e.g., PT1H2M3S) to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  
  return hours * 3600 + minutes * 60 + seconds
}
