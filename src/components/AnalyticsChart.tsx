'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
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

interface AnalyticsChartProps {
  data: DataPoint[]
  isLoading?: boolean
}

type MetricKey = 'views' | 'watchTimeMinutes' | 'netSubscribers' | 'estimatedRevenue'

const METRICS = [
  { key: 'views' as MetricKey, label: 'Views', color: '#3ea6ff' },
  { key: 'watchTimeMinutes' as MetricKey, label: 'Watch time (min)', color: '#2ba640' },
  { key: 'netSubscribers' as MetricKey, label: 'Subscribers', color: '#9333ea' },
  { key: 'estimatedRevenue' as MetricKey, label: 'Revenue', color: '#eab308', prefix: '$' },
]

export function AnalyticsChart({ data, isLoading = false }: AnalyticsChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('views')

  const currentMetric = METRICS.find(m => m.key === activeMetric)!

  const formatValue = (value: number) => {
    if (activeMetric === 'estimatedRevenue') {
      return `$${value.toFixed(2)}`
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M'
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K'
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
            {formatValue(value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-yt-bg-secondary rounded-xl p-6 border border-yt-border">
        <div className="flex gap-2 mb-6">
          {METRICS.map((metric) => (
            <div
              key={metric.key}
              className="h-8 w-24 bg-yt-bg-tertiary rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="h-[300px] bg-yt-bg-tertiary rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-yt-bg-secondary rounded-xl p-6 border border-yt-border">
      {/* Metric Selector Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {METRICS.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setActiveMetric(metric.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMetric === metric.key
                ? 'text-white'
                : 'bg-yt-bg-tertiary text-yt-text-secondary hover:bg-yt-bg-hover'
            }`}
            style={{
              backgroundColor: activeMetric === metric.key ? metric.color : undefined,
            }}
          >
            {metric.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0} />
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
              tickFormatter={formatValue}
              stroke="#aaaaaa"
              tick={{ fill: '#aaaaaa', fontSize: 12 }}
              axisLine={{ stroke: '#3f3f3f' }}
              tickLine={{ stroke: '#3f3f3f' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
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
