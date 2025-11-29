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

export async function getAnalyticsByContentType(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client })
  
  try {
    // Get daily data broken down by content type
    const { data } = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched',
      dimensions: 'day,creatorContentType',
      sort: 'day',
    })
    
    return data
  } catch (error) {
    console.error('YouTube Analytics Content Type error:', error)
    return null
  }
}
