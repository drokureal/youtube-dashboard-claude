import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createServiceClient()
  
  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Remove sensitive data before sending to client
  const sanitizedChannels = channels.map(channel => ({
    id: channel.id,
    channel_id: channel.channel_id,
    channel_title: channel.channel_title,
    channel_thumbnail: channel.channel_thumbnail,
    created_at: channel.created_at,
  }))
  
  return NextResponse.json({ channels: sanitizedChannels })
}

export async function DELETE(request: NextRequest) {
  const cookieStore = cookies()
  const userId = cookieStore.get('user_id')?.value
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { channelId } = await request.json()
  
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }
  
  const supabase = createServiceClient()
  
  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId)
    .eq('user_id', userId)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
