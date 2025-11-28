'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Clock, Users, DollarSign, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'
import { Header } from '@/components/Header'
import { StatsCard } from '@/components/StatsCard'
import { AnalyticsChart, MetricKey } from '@/components/AnalyticsChart'
import { ChannelSelector } from '@/components/ChannelSelector'
import { DateRangeSelector } from '@/components/DateRangeSelector'
import { ChannelBreakdown } from '@/components/ChannelBreakdown'

interface User {
  id: string
  username: string
  displayName: string
}

interface Channel {
  id: string
  channel_id: string
  channel_title: string
  channel_thumbnail: string
}

interface AnalyticsData {
  summary: {
    views: number
    watchTimeMinutes: number
    watchTimeHours: number
    subscribersGained: number
    subscribersLost: number
    netSubscribers: number
    estimatedRevenue: number
    rpm: number
    viewsChange: number
    watchTimeChange: number
    subscribersChange: number
    revenueChange: number
  }
  dailyData: Array<{
    date: string
    views: number
    watchTimeMinutes: number
    netSubscribers: number
    estimatedRevenue: number
    rpm: number
  }>
  channelBreakdown: Array<{
    channelId: string
    channelYoutubeId: string
    channelTitle: string
    channelThumbnail: string
    views: number
    watchTimeMinutes: number
    netSubscribers: number
    estimatedRevenue: number
    rpm: number
    previousViews: number
    previousWatchTime: number
    previousSubscribers: number
    previousRevenue: number
  }>
}

const DATE_RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '28d': 28,
  '90d': 90,
  '365d': 365,
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [user, setUser] = useState<User | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('28d')
  const [customDateRange, setCustomDateRange] = useState<{ startDate?: string; endDate?: string }>({})
  const [activeMetric, setActiveMetric] = useState<MetricKey>('views')
  
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for success message
  const channelAdded = searchParams.get('channel_added') === 'true'

  // Fetch user data
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        } else {
          router.push('/')
        }
      })
      .catch(() => router.push('/'))
      .finally(() => setIsLoadingUser(false))
  }, [router])

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    setIsLoadingChannels(true)
    try {
      const res = await fetch('/api/channels')
      const data = await res.json()
      if (data.channels) {
        setChannels(data.channels)
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err)
    } finally {
      setIsLoadingChannels(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchChannels()
    }
  }, [user, fetchChannels])

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (channels.length === 0) {
      setIsLoadingAnalytics(false)
      return
    }

    setIsLoadingAnalytics(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('channelId', selectedChannel)

      if (customDateRange.startDate && customDateRange.endDate) {
        params.set('startDate', customDateRange.startDate)
        params.set('endDate', customDateRange.endDate)
      } else {
        params.set('days', DATE_RANGE_DAYS[selectedDateRange]?.toString() || '28')
      }

      const res = await fetch(`/api/youtube/analytics?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else if (data.analytics) {
        setAnalytics(data.analytics)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('Failed to load analytics. Please try again.')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [channels, selectedChannel, selectedDateRange, customDateRange])

  useEffect(() => {
    if (channels.length > 0) {
      fetchAnalytics()
    }
  }, [channels, selectedChannel, selectedDateRange, customDateRange, fetchAnalytics])

  const handleAddChannel = () => {
    window.location.href = '/api/auth/login?addChannel=true'
  }

  const handleDateRangeChange = (range: string, startDate?: string, endDate?: string) => {
    setSelectedDateRange(range)
    if (startDate && endDate) {
      setCustomDateRange({ startDate, endDate })
    } else {
      setCustomDateRange({})
    }
  }

  const handleRefresh = () => {
    fetchAnalytics()
  }

  // Show loading state while checking auth
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yt-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yt-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yt-bg">
      <Header user={user} onAddChannel={handleAddChannel} isLoading={isLoadingUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {channelAdded && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-green-400">Channel connected successfully!</p>
          </div>
        )}

        {/* No Channels State */}
        {!isLoadingChannels && channels.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-yt-bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-yt-text-secondary" />
            </div>
            <h2 className="text-2xl font-medium text-yt-text mb-2">No Channels Connected</h2>
            <p className="text-yt-text-secondary mb-6 max-w-md mx-auto">
              Connect your first YouTube channel to start tracking your analytics across all your channels.
            </p>
            <button
              onClick={handleAddChannel}
              className="inline-flex items-center gap-2 bg-yt-blue hover:bg-yt-blue-hover px-6 py-3 rounded-full text-white font-medium transition-colors"
            >
              Connect YouTube Channel
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <ChannelSelector
                  channels={channels}
                  selectedChannel={selectedChannel}
                  onSelect={setSelectedChannel}
                  isLoading={isLoadingChannels}
                />
                <DateRangeSelector
                  selectedRange={selectedDateRange}
                  onSelect={handleDateRangeChange}
                  isLoading={isLoadingChannels}
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoadingAnalytics}
                className="flex items-center gap-2 text-sm text-yt-text-secondary hover:text-yt-text transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatsCard
                title="Views"
                value={analytics?.summary.views || 0}
                change={analytics?.summary.viewsChange}
                changeLabel="vs previous period"
                icon={<Eye className="w-5 h-5" />}
                isLoading={isLoadingAnalytics}
                isActive={activeMetric === 'views'}
                onClick={() => setActiveMetric('views')}
                accentColor="#3ea6ff"
              />
              <StatsCard
                title="Watch time (hours)"
                value={analytics?.summary.watchTimeHours || 0}
                change={analytics?.summary.watchTimeChange}
                changeLabel="vs previous period"
                icon={<Clock className="w-5 h-5" />}
                isLoading={isLoadingAnalytics}
                isActive={activeMetric === 'watchTimeMinutes'}
                onClick={() => setActiveMetric('watchTimeMinutes')}
                accentColor="#2ba640"
              />
              <StatsCard
                title="Subscribers"
                value={analytics?.summary.netSubscribers || 0}
                change={analytics?.summary.subscribersChange}
                changeLabel="vs previous period"
                icon={<Users className="w-5 h-5" />}
                prefix={analytics?.summary.netSubscribers && analytics.summary.netSubscribers >= 0 ? '+' : ''}
                isLoading={isLoadingAnalytics}
                isActive={activeMetric === 'netSubscribers'}
                onClick={() => setActiveMetric('netSubscribers')}
                accentColor="#9333ea"
              />
              <StatsCard
                title="Estimated revenue"
                value={analytics?.summary.estimatedRevenue?.toFixed(2) || '0.00'}
                change={analytics?.summary.revenueChange}
                changeLabel="vs previous period"
                icon={<DollarSign className="w-5 h-5" />}
                prefix="$"
                isLoading={isLoadingAnalytics}
                isActive={activeMetric === 'estimatedRevenue'}
                onClick={() => setActiveMetric('estimatedRevenue')}
                accentColor="#eab308"
              />
              <StatsCard
                title="RPM"
                value={analytics?.summary.rpm?.toFixed(2) || '0.00'}
                icon={<TrendingUp className="w-5 h-5" />}
                prefix="$"
                isLoading={isLoadingAnalytics}
              />
            </div>

            {/* Chart */}
            <div className="mb-8">
              <AnalyticsChart
                data={analytics?.dailyData || []}
                isLoading={isLoadingAnalytics}
                activeMetric={activeMetric}
              />
            </div>

            {/* Channel Breakdown (only show when viewing all channels) */}
            {selectedChannel === 'all' && analytics?.channelBreakdown && analytics.channelBreakdown.length > 1 && (
              <ChannelBreakdown
                channels={analytics.channelBreakdown}
                isLoading={isLoadingAnalytics}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-yt-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yt-blue"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
