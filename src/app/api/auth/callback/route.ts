import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTokensFromCode, getUserInfo, getYouTubeChannel } from '@/lib/google'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(new URL('/?error=auth_denied', request.url))
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }
  
  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }
    
    // Get user info
    const userInfo = await getUserInfo(tokens.access_token)
    
    if (!userInfo.email) {
      throw new Error('No email received from Google')
    }
    
    // Get YouTube channel info
    const channelInfo = await getYouTubeChannel(tokens.access_token)
    
    const supabase = createServiceClient()
    const cookieStore = cookies()
    
    // Check if this is adding a channel to existing user
    const existingSessionUserId = cookieStore.get('user_id')?.value
    
    if (state === 'add_channel' && existingSessionUserId) {
      // Adding a new channel to existing user
      if (channelInfo) {
        // Check if channel already exists
        const { data: existingChannel } = await supabase
          .from('channels')
          .select('*')
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
            })
            .eq('channel_id', channelInfo.id)
        } else {
          // Insert new channel
          await supabase
            .from('channels')
            .insert({
              user_id: existingSessionUserId,
              channel_id: channelInfo.id,
              channel_title: channelInfo.snippet?.title || 'Unknown Channel',
              channel_thumbnail: channelInfo.snippet?.thumbnails?.default?.url || '',
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || '',
              token_expiry: tokens.expiry_date 
                ? new Date(tokens.expiry_date).toISOString() 
                : null,
            })
        }
      }
      
      return NextResponse.redirect(new URL('/dashboard?channel_added=true', request.url))
    }
    
    // Regular login flow
    // Check if user exists
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', userInfo.email)
      .single()
    
    if (!user) {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: userInfo.email,
          name: userInfo.name || '',
          picture: userInfo.picture || '',
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      user = newUser
    } else {
      // Update user info
      await supabase
        .from('users')
        .update({
          name: userInfo.name || user.name,
          picture: userInfo.picture || user.picture,
        })
        .eq('id', user.id)
    }
    
    // Add or update YouTube channel
    if (channelInfo && user) {
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_id', channelInfo.id)
        .single()
      
      if (existingChannel) {
        await supabase
          .from('channels')
          .update({
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || existingChannel.refresh_token,
            token_expiry: tokens.expiry_date 
              ? new Date(tokens.expiry_date).toISOString() 
              : null,
          })
          .eq('channel_id', channelInfo.id)
      } else {
        await supabase
          .from('channels')
          .insert({
            user_id: user.id,
            channel_id: channelInfo.id,
            channel_title: channelInfo.snippet?.title || 'Unknown Channel',
            channel_thumbnail: channelInfo.snippet?.thumbnails?.default?.url || '',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || '',
            token_expiry: tokens.expiry_date 
              ? new Date(tokens.expiry_date).toISOString() 
              : null,
          })
      }
    }
    
    // Set session cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    
    return response
    
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
