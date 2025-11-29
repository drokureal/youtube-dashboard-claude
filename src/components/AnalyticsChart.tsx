'use client'

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface DataPoint {
  date: string
  views: number
  watchTimeMinutes: number
  netSubscribers: number
  estimatedRevenue: number
  rpm: number
}

export type MetricKey = 'views' | 'watchTimeMinutes' | 'netSubscribers' | 'estimatedRevenue'

interface AnalyticsChartProps {
  data: DataPoint[]
  isLoading?: boolean
  activeMetric: MetricKey
}

const METRICS = {
  views: { label: 'Views', color: '#3ea6ff' },
  watchTimeMinutes: { label: 'Watch time (min)', color: '#eab308' },
  netSubscribers: { label: 'Subscribers', color: '#9333ea' },
  estimatedRevenue: { label: 'Revenue', color: '#2ba640', prefix: '$' },
}

export function AnalyticsChart({ data, isLoading = false, activeMetric }: AnalyticsChartProps) {
  const currentMetric = METRICS[activeMetric]

  // Format for Y-axis (shortened)
  const formatAxisValue = (value: number) => {
    if (activeMetric === 'estimatedRevenue') {
      return `$${value.toFixed(0)}`
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M'
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K'
    }
    return value.toLocaleString()
  }

  // Format for tooltip (full number)
  const formatTooltipValue = (value: number) => {
    if (activeMetric === 'estimatedRevenue') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString()
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const formatXAxis = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d')
    } catch {
      return dateStr
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-yt-card border border-yt-border rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs text-yt-text-secondary mb-1">{formatDate(label)}</p>
          <p className="text-xl font-medium" style={{ color: currentMetric.color }}>
            {formatTooltipValue(value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-yt-bg-secondary rounded-xl p-6 border border-yt-border">
        <div className="h-[300px] bg-yt-bg-tertiary rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-yt-bg-secondary rounded-xl p-6 border border-yt-border">
      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentMetric.color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={currentMetric.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f3f" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#aaaaaa"
              tick={{ fill: '#aaaaaa', fontSize: 12 }}
              axisLine={{ stroke: '#3f3f3f' }}
              tickLine={{ stroke: '#3f3f3f' }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tickFormatter={formatAxisValue}
              stroke="#aaaaaa"
              tick={{ fill: '#aaaaaa', fontSize: 12 }}
              axisLine={{ stroke: '#3f3f3f' }}
              tickLine={{ stroke: '#3f3f3f' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="linear"
              dataKey={activeMetric}
              stroke={currentMetric.color}
              strokeWidth={2}
              fill={`url(#gradient-${activeMetric})`}
              dot={false}
              activeDot={{
                r: 6,
                fill: currentMetric.color,
                stroke: '#0f0f0f',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
