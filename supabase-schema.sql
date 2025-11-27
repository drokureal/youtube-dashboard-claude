-- YouTube Analytics Dashboard Database Schema
-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT UNIQUE NOT NULL,
  channel_title TEXT NOT NULL,
  channel_thumbnail TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Allow service role full access
CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for channels table
-- Allow service role full access
CREATE POLICY "Service role can do everything on channels" ON channels
  FOR ALL
  USING (true)
  WITH CHECK (true);
