'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Youtube, Plus, LogOut, User, ChevronDown } from 'lucide-react'

interface UserData {
  id: string
  email: string
  name: string
  picture?: string
}

interface HeaderProps {
  user: UserData | null
  onAddChannel: () => void
  isLoading?: boolean
}

export function Header({ user, onAddChannel, isLoading = false }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    window.location.href = '/api/auth/logout'
  }

  return (
    <header className="sticky top-0 z-40 bg-yt-bg border-b border-yt-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Youtube className="w-8 h-8 text-red-500" />
            <span className="text-lg font-medium text-yt-text hidden sm:block">
              Analytics Dashboard
            </span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Add Channel Button */}
            <button
              onClick={onAddChannel}
              className="flex items-center gap-2 bg-yt-bg-tertiary hover:bg-yt-bg-hover px-4 py-2 rounded-full text-sm font-medium text-yt-text transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Channel</span>
            </button>

            {/* User Profile */}
            {isLoading ? (
              <div className="w-10 h-10 bg-yt-bg-tertiary rounded-full animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {user.picture ? (
                    <Image
                      src={user.picture}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-yt-blue rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>

                {isProfileOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-yt-bg-secondary border border-yt-border rounded-xl shadow-xl overflow-hidden">
                    {/* User Info */}
                    <div className="p-4 border-b border-yt-border">
                      <div className="flex items-center gap-3">
                        {user.picture ? (
                          <Image
                            src={user.picture}
                            alt={user.name}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-yt-blue rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-yt-text truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-yt-text-secondary truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-yt-text hover:bg-yt-bg-hover rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-yt-text-secondary" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
