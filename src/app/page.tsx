'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Youtube, Eye, EyeOff } from 'lucide-react'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    // Check if user is already logged in
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          router.push('/dashboard')
        } else {
          setIsLoading(false)
        }
      })
      .catch(() => setIsLoading(false))

    // Check for auth errors
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        not_logged_in: 'Please log in first.',
        auth_denied: 'Authentication was denied.',
        auth_failed: 'Authentication failed. Please try again.',
      }
      setError(errorMessages[errorParam] || 'An error occurred.')
    }
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid credentials')
        setIsSubmitting(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')

    } catch (err) {
      setError('Network error. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yt-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yt-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yt-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Youtube className="w-10 h-10 text-red-500" />
          <span className="text-2xl font-semibold text-yt-text">Analytics</span>
        </div>

        {/* Login Form */}
        <div className="bg-yt-bg-secondary rounded-2xl p-8 border border-yt-border">
          <h1 className="text-xl font-semibold text-yt-text mb-6 text-center">
            Sign In
          </h1>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-yt-text-secondary mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 bg-yt-bg border border-yt-border rounded-lg text-yt-text placeholder-yt-text-secondary focus:outline-none focus:border-yt-blue transition-colors"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-yt-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-yt-bg border border-yt-border rounded-lg text-yt-text placeholder-yt-text-secondary focus:outline-none focus:border-yt-blue transition-colors pr-12"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-yt-text-secondary hover:text-yt-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-yt-blue hover:bg-yt-blue-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors mt-6"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-yt-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yt-blue"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
