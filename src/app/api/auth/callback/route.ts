import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTokensFromCode, getYouTubeChannel } from '@/lib/google'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Get user from session
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return NextResponse.redirect(new URL('/?error=not_logged_in', request.url))
  }

  if (error) {
    return NextResponse.redirect(new URL('/dashboard?error=auth_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url))
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Get YouTube channel info
    const channelInfo = await getYouTubeChannel(tokens.access_token)

    if (!channelInfo) {
      return NextResponse.redirect(new URL('/dashboard?error=no_channel', request.url))
    }

    const supabase = createServiceClient()

    // Check if this channel is already connected by this user
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelInfo.id)
      .single()

    if (existingChannel) {
      // Update the existing channel's tokens
      await supabase
        .from('channels')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingChannel.refresh_token,
          token_expiry: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          channel_title: channelInfo.snippet?.title || existingChannel.channel_title,
          channel_thumbnail: channelInfo.snippet?.thumbnails?.default?.url || existingChannel.channel_thumbnail,
        })
        .eq('id', existingChannel.id)

      return NextResponse.redirect(new URL('/dashboard?channel_updated=true', request.url))
    }

    // Insert new channel
    const { error: insertError } = await supabase
      .from('channels')
      .insert({
        user_id: userId,
        channel_id: channelInfo.id,
        channel_title: channelInfo.snippet?.title || 'Unknown Channel',
        channel_thumbnail: channelInfo.snippet?.thumbnails?.default?.url || '',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      })

    if (insertError) {
      console.error('Failed to insert channel:', insertError)
      return NextResponse.redirect(new URL('/dashboard?error=channel_save_failed', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard?channel_added=true', request.url))

  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=auth_failed', request.url))
  }
}
