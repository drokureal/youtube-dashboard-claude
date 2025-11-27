'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface DateRangeOption {
  label: string
  value: string
  days?: number
  getRange?: () => { startDate: string; endDate: string }
}

interface DateRangeSelectorProps {
  selectedRange: string
  onSelect: (range: string, startDate?: string, endDate?: string) => void
  isLoading?: boolean
}

const PRESET_RANGES: DateRangeOption[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 28 days', value: '28d', days: 28 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 365 days', value: '365d', days: 365 },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Start from 2024
const MIN_YEAR = 2024

export function DateRangeSelector({
  selectedRange,
  onSelect,
  isLoading = false,
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showMonths, setShowMonths] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowMonths(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getSelectedLabel = () => {
    const preset = PRESET_RANGES.find(r => r.value === selectedRange)
    if (preset) return preset.label
    
    // Check if it's a month selection
    if (selectedRange.startsWith('month-')) {
      const [, year, month] = selectedRange.split('-')
      return `${MONTHS[parseInt(month)]} ${year}`
    }
    
    return 'Select Range'
  }

  const handleMonthSelect = (monthIndex: number, year: number) => {
    const startDate = format(startOfMonth(new Date(year, monthIndex)), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(new Date(year, monthIndex)), 'yyyy-MM-dd')
    onSelect(`month-${year}-${monthIndex}`, startDate, endDate)
    setIsOpen(false)
    setShowMonths(false)
  }

  const canGoToPreviousYear = selectedYear > MIN_YEAR
  const canGoToNextYear = selectedYear < currentYear

  const handlePreviousYear = () => {
    if (canGoToPreviousYear) {
      setSelectedYear(selectedYear - 1)
    }
  }

  const handleNextYear = () => {
    if (canGoToNextYear) {
      setSelectedYear(selectedYear + 1)
    }
  }

  // Get available months for the selected year
  const getAvailableMonths = () => {
    if (selectedYear < currentYear) {
      // All months available for past years
      return MONTHS.map((month, index) => ({ month, index }))
    } else {
      // Current year - only months up to current month
      return MONTHS.slice(0, currentMonth + 1).map((month, index) => ({ month, index }))
    }
  }

  const availableMonths = getAvailableMonths()

  if (isLoading) {
    return (
      <div className="h-10 w-40 bg-yt-bg-tertiary rounded-lg animate-pulse" />
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-yt-bg-tertiary hover:bg-yt-bg-hover px-4 py-2 rounded-lg transition-colors"
      >
        <Calendar className="w-4 h-4 text-yt-text-secondary" />
        <span className="text-sm font-medium text-yt-text">{getSelectedLabel()}</span>
        <ChevronDown
          className={`w-4 h-4 text-yt-text-secondary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-yt-bg-secondary border border-yt-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[220px]">
          {!showMonths ? (
            <>
              {/* Preset Ranges */}
              {PRESET_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => {
                    onSelect(range.value)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-yt-bg-hover transition-colors ${
                    selectedRange === range.value
                      ? 'bg-yt-bg-tertiary text-yt-blue'
                      : 'text-yt-text'
                  }`}
                >
                  {range.label}
                </button>
              ))}

              <div className="border-t border-yt-border" />

              {/* Month Selection Trigger */}
              <button
                onClick={() => setShowMonths(true)}
                className="w-full px-4 py-3 text-left text-sm text-yt-text hover:bg-yt-bg-hover transition-colors flex items-center justify-between"
              >
                <span>Select Month</span>
                <ChevronDown className="w-4 h-4 text-yt-text-secondary -rotate-90" />
              </button>
            </>
          ) : (
            <>
              {/* Back Button */}
              <button
                onClick={() => setShowMonths(false)}
                className="w-full px-4 py-3 text-left text-sm text-yt-text-secondary hover:bg-yt-bg-hover transition-colors border-b border-yt-border"
              >
                ← Back
              </button>

              {/* Year Selector */}
              <div className="flex items-center justify-between px-4 py-2 bg-yt-bg-tertiary border-b border-yt-border">
                <button
                  onClick={handlePreviousYear}
                  disabled={!canGoToPreviousYear}
                  className={`p-1 rounded hover:bg-yt-bg-hover transition-colors ${
                    !canGoToPreviousYear ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 text-yt-text-secondary" />
                </button>
                <span className="text-sm font-medium text-yt-text">{selectedYear}</span>
                <button
                  onClick={handleNextYear}
                  disabled={!canGoToNextYear}
                  className={`p-1 rounded hover:bg-yt-bg-hover transition-colors ${
                    !canGoToNextYear ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  <ChevronRight className="w-4 h-4 text-yt-text-secondary" />
                </button>
              </div>

              {/* Months Grid */}
              <div className="max-h-[300px] overflow-y-auto p-2">
                {availableMonths.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {availableMonths.map(({ month, index }) => (
                      <button
                        key={month}
                        onClick={() => handleMonthSelect(index, selectedYear)}
                        className={`px-2 py-2 text-xs rounded hover:bg-yt-bg-hover transition-colors ${
                          selectedRange === `month-${selectedYear}-${index}`
                            ? 'bg-yt-blue text-white'
                            : 'text-yt-text'
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-yt-text-secondary">
                    No data available for this year
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
