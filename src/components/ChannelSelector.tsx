'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Layers } from 'lucide-react'
import Image from 'next/image'

interface Channel {
  id: string
  channel_id: string
  channel_title: string
  channel_thumbnail: string
}

interface ChannelSelectorProps {
  channels: Channel[]
  selectedChannel: string
  onSelect: (channelId: string) => void
  isLoading?: boolean
}

export function ChannelSelector({
  channels,
  selectedChannel,
  onSelect,
  isLoading = false,
}: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getSelectedLabel = () => {
    if (selectedChannel === 'all') {
      return 'All Channels'
    }
    const channel = channels.find(c => c.id === selectedChannel)
    return channel?.channel_title || 'Select Channel'
  }

  const getSelectedThumbnail = () => {
    if (selectedChannel === 'all') {
      return null
    }
    const channel = channels.find(c => c.id === selectedChannel)
    return channel?.channel_thumbnail
  }

  if (isLoading) {
    return (
      <div className="h-10 w-48 bg-yt-bg-tertiary rounded-lg animate-pulse" />
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-yt-bg-tertiary hover:bg-yt-bg-hover px-4 py-2 rounded-lg transition-colors min-w-[200px]"
      >
        {selectedChannel === 'all' ? (
          <div className="w-8 h-8 bg-yt-blue/20 rounded-full flex items-center justify-center">
            <Layers className="w-4 h-4 text-yt-blue" />
          </div>
        ) : getSelectedThumbnail() ? (
          <Image
            src={getSelectedThumbnail()!}
            alt=""
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-yt-bg-hover rounded-full" />
        )}
        <span className="text-sm font-medium text-yt-text flex-1 text-left truncate">
          {getSelectedLabel()}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-yt-text-secondary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-yt-bg-secondary border border-yt-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* All Channels Option */}
          <button
            onClick={() => {
              onSelect('all')
              setIsOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-yt-bg-hover transition-colors ${
              selectedChannel === 'all' ? 'bg-yt-bg-tertiary' : ''
            }`}
          >
            <div className="w-8 h-8 bg-yt-blue/20 rounded-full flex items-center justify-center">
              <Layers className="w-4 h-4 text-yt-blue" />
            </div>
            <span className="text-sm font-medium text-yt-text flex-1 text-left">
              All Channels
            </span>
            {selectedChannel === 'all' && (
              <Check className="w-4 h-4 text-yt-blue" />
            )}
          </button>

          {/* Divider */}
          <div className="border-t border-yt-border" />

          {/* Individual Channels */}
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                onSelect(channel.id)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-yt-bg-hover transition-colors ${
                selectedChannel === channel.id ? 'bg-yt-bg-tertiary' : ''
              }`}
            >
              {channel.channel_thumbnail ? (
                <Image
                  src={channel.channel_thumbnail}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-yt-bg-hover rounded-full" />
              )}
              <span className="text-sm font-medium text-yt-text flex-1 text-left truncate">
                {channel.channel_title}
              </span>
              {selectedChannel === channel.id && (
                <Check className="w-4 h-4 text-yt-blue" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
