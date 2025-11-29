'use client'

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: ReactNode
  prefix?: string
  suffix?: string
  isLoading?: boolean
  isActive?: boolean
  onClick?: () => void
  accentColor?: string
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  prefix = '',
  suffix = '',
  isLoading = false,
  isActive = false,
  onClick,
  accentColor = '#3ea6ff',
}: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M'
      }
      if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K'
      }
      return val.toLocaleString()
    }
    return val
  }

  const getChangeColor = () => {
    if (change === undefined || change === 0) return 'text-yt-text-secondary'
    return change > 0 ? 'text-green-400' : 'text-red-400'
  }

  const getChangeIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-3 h-3" />
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
  }

  const formatChange = (val: number) => {
    const absVal = Math.abs(val)
    if (absVal >= 1000000) {
      return (absVal / 1000000).toFixed(1) + 'M'
    }
    if (absVal >= 1000) {
      return (absVal / 1000).toFixed(1) + 'K'
    }
    return absVal.toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="bg-yt-bg-secondary rounded-xl p-3 sm:p-5 border border-yt-border">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="h-3 sm:h-4 w-16 sm:w-24 bg-yt-bg-tertiary rounded animate-pulse"></div>
          {icon && <div className="text-yt-text-secondary opacity-50">{icon}</div>}
        </div>
        <div className="h-6 sm:h-8 w-20 sm:w-32 bg-yt-bg-tertiary rounded animate-pulse mb-2"></div>
        <div className="h-3 w-16 sm:w-28 bg-yt-bg-tertiary rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div 
      onClick={onClick}
      className={`bg-yt-bg-secondary rounded-xl p-3 sm:p-5 border-2 transition-all cursor-pointer ${
        isActive 
          ? 'border-opacity-100' 
          : 'border-yt-border hover:border-yt-border/80'
      }`}
      style={{
        borderColor: isActive ? accentColor : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span 
          className={`text-xs sm:text-sm font-medium ${isActive ? '' : 'text-yt-text-secondary'}`}
          style={{ color: isActive ? accentColor : undefined }}
        >
          {title}
        </span>
        {icon && (
          <div 
            className={`hidden sm:block ${isActive ? '' : 'text-yt-text-secondary'}`}
            style={{ color: isActive ? accentColor : undefined }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        {prefix && <span className="text-base sm:text-xl text-yt-text-secondary">{prefix}</span>}
        <span className="text-xl sm:text-3xl font-medium text-yt-text">{formatValue(value)}</span>
        {suffix && <span className="text-sm sm:text-lg text-yt-text-secondary">{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] sm:text-xs ${getChangeColor()}`}>
          {getChangeIcon()}
          <span>
            {change >= 0 ? '+' : '-'}{formatChange(change)}
          </span>
        </div>
      )}
    </div>
  )
}
