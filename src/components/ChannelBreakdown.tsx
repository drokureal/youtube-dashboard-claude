'use client'

import Image from 'next/image'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ChannelData {
  channelId: string
  channelYoutubeId: string
  channelTitle: string
  channelThumbnail: string
  views: number
  watchTimeMinutes: number
  netSubscribers: number
  estimatedRevenue: number
  usRevenue: number
  longFormVideoCount: number
  rpm: number
  previousViews: number
  previousWatchTime: number
  previousSubscribers: number
  previousRevenue: number
}

interface ChannelBreakdownProps {
  channels: ChannelData[]
  isLoading?: boolean
  showUSTax?: boolean
  showProfit?: boolean
  costPerVideo?: Record<string, number>
  onCostChange?: (channelId: string, cost: number) => void
}

export function ChannelBreakdown({ 
  channels, 
  isLoading = false, 
  showUSTax = false,
  showProfit = false,
  costPerVideo = {},
  onCostChange,
}: ChannelBreakdownProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
  }

  const getAdjustedRevenue = (channel: ChannelData) => {
    let revenue = channel.estimatedRevenue
    
    if (showUSTax) {
      const usTax = (channel.usRevenue || 0) * 0.15
      revenue = revenue - usTax
    }
    
    if (showProfit) {
      const cost = costPerVideo[channel.channelId] || 0
      revenue = revenue - (cost * channel.longFormVideoCount)
    }
    
    return revenue
  }

  const getChangeIndicator = (current: number, previous: number) => {
    const diff = current - previous
    if (diff === 0) return <Minus className="w-3 h-3 text-yt-text-secondary" />
    if (diff > 0) return <TrendingUp className="w-3 h-3 text-green-400" />
    return <TrendingDown className="w-3 h-3 text-red-400" />
  }

  if (isLoading) {
    return (
      <div className="bg-yt-bg-secondary rounded-xl border border-yt-border overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-yt-border">
          <div className="h-5 w-40 bg-yt-bg-tertiary rounded animate-pulse" />
        </div>
        <div className="divide-y divide-yt-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 sm:px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-yt-bg-tertiary rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-yt-bg-tertiary rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-yt-bg-tertiary rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (channels.length === 0) {
    return null
  }

  return (
    <div className="bg-yt-bg-secondary rounded-xl border border-yt-border overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-yt-border">
        <h3 className="text-base font-medium text-yt-text">Channel Breakdown</h3>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-yt-border">
        {channels.map((channel) => (
          <div key={channel.channelId} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {channel.channelThumbnail ? (
                <Image
                  src={channel.channelThumbnail}
                  alt={channel.channelTitle}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 bg-yt-bg-hover rounded-full" />
              )}
              <span className="text-sm font-medium text-yt-text truncate flex-1">
                {channel.channelTitle}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-yt-text-secondary text-xs mb-1">Views</div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-yt-text">{formatNumber(channel.views)}</span>
                  {getChangeIndicator(channel.views, channel.previousViews)}
                </div>
              </div>
              <div>
                <div className="text-yt-text-secondary text-xs mb-1">Watch time</div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-yt-text">{formatNumber(Math.round(channel.watchTimeMinutes / 60))}h</span>
                  {getChangeIndicator(channel.watchTimeMinutes, channel.previousWatchTime)}
                </div>
              </div>
              <div>
                <div className="text-yt-text-secondary text-xs mb-1">Subscribers</div>
                <div className="flex items-center gap-1">
                  <span className={`font-medium ${channel.netSubscribers >= 0 ? 'text-yt-text' : 'text-red-400'}`}>
                    {channel.netSubscribers >= 0 ? '+' : ''}{formatNumber(channel.netSubscribers)}
                  </span>
                  {getChangeIndicator(channel.netSubscribers, channel.previousSubscribers)}
                </div>
              </div>
              <div>
                <div className="text-yt-text-secondary text-xs mb-1">
                  {showProfit ? 'Profit' : 'Revenue'}
                </div>
                <div className={`font-medium ${getAdjustedRevenue(channel) >= 0 ? 'text-yt-text' : 'text-red-400'}`}>
                  ${getAdjustedRevenue(channel).toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* Cost per video input - Mobile */}
            {showProfit && (
              <div className="mt-3 pt-3 border-t border-yt-border">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-yt-text-secondary">
                    Videos: {channel.longFormVideoCount} • Cost/video:
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-yt-text-secondary">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costPerVideo[channel.channelId] || ''}
                      onChange={(e) => onCostChange?.(channel.channelId, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-sm bg-yt-bg-tertiary border border-yt-border rounded text-yt-text text-right"
                    />
                  </div>
                </div>
                <div className="text-xs text-yt-text-secondary text-right">
                  Total Cost: <span className="text-yellow-400">${((costPerVideo[channel.channelId] || 0) * channel.longFormVideoCount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        {/* Table Header */}
        <div className={`px-6 py-3 bg-yt-bg-tertiary grid gap-4 text-xs font-medium text-yt-text-secondary ${showProfit ? 'grid-cols-9' : 'grid-cols-6'}`}>
          <div className="col-span-2">Channel</div>
          <div className="text-right">Views</div>
          <div className="text-right">Watch time</div>
          <div className="text-right">Subscribers</div>
          {showProfit && (
            <>
              <div className="text-right">Videos</div>
              <div className="text-right">Cost/Video</div>
              <div className="text-right">Total Cost</div>
            </>
          )}
          <div className="text-right">{showProfit ? 'Profit' : 'Revenue'}</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-yt-border">
          {channels.map((channel) => (
            <div
              key={channel.channelId}
              className={`px-6 py-4 grid gap-4 items-center hover:bg-yt-bg-tertiary/50 transition-colors ${showProfit ? 'grid-cols-9' : 'grid-cols-6'}`}
            >
              {/* Channel Info */}
              <div className="col-span-2 flex items-center gap-3">
                {channel.channelThumbnail ? (
                  <Image
                    src={channel.channelThumbnail}
                    alt={channel.channelTitle}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-yt-bg-hover rounded-full" />
                )}
                <span className="text-sm font-medium text-yt-text truncate">
                  {channel.channelTitle}
                </span>
              </div>

              {/* Views */}
              <div className="text-right">
                <div className="text-sm font-medium text-yt-text">
                  {formatNumber(channel.views)}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {getChangeIndicator(channel.views, channel.previousViews)}
                </div>
              </div>

              {/* Watch Time */}
              <div className="text-right">
                <div className="text-sm font-medium text-yt-text">
                  {formatNumber(Math.round(channel.watchTimeMinutes / 60))}h
                </div>
                <div className="flex items-center justify-end gap-1">
                  {getChangeIndicator(channel.watchTimeMinutes, channel.previousWatchTime)}
                </div>
              </div>

              {/* Subscribers */}
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  channel.netSubscribers >= 0 ? 'text-yt-text' : 'text-red-400'
                }`}>
                  {channel.netSubscribers >= 0 ? '+' : ''}{formatNumber(channel.netSubscribers)}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {getChangeIndicator(channel.netSubscribers, channel.previousSubscribers)}
                </div>
              </div>

              {/* Videos & Cost (only in profit mode) */}
              {showProfit && (
                <>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yt-text">
                      {channel.longFormVideoCount}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm text-yt-text-secondary">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costPerVideo[channel.channelId] || ''}
                        onChange={(e) => onCostChange?.(channel.channelId, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-20 px-2 py-1 text-sm bg-yt-bg-tertiary border border-yt-border rounded text-yt-text text-right"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-400">
                      ${((costPerVideo[channel.channelId] || 0) * channel.longFormVideoCount).toFixed(2)}
                    </div>
                  </div>
                </>
              )}

              {/* Revenue/Profit */}
              <div className="text-right">
                <div className={`text-sm font-medium ${getAdjustedRevenue(channel) >= 0 ? 'text-yt-text' : 'text-red-400'}`}>
                  ${getAdjustedRevenue(channel).toFixed(2)}
                </div>
                <div className="text-xs text-yt-text-secondary">
                  ${channel.rpm.toFixed(2)} RPM
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
