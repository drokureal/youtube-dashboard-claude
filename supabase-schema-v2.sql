-- YouTube Analytics Dashboard Database Schema v2
-- Run this in your Supabase SQL Editor
-- This updates the schema for username/password authentication

-- First, drop existing tables (WARNING: This will delete all existing data!)
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (with username/password auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels table (allows same channel to be connected by different users)
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_thumbnail TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Indexes for better performance
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_channels_channel_id ON channels(channel_id);
CREATE INDEX idx_users_username ON users(username);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for channels table
CREATE POLICY "Service role can do everything on channels" ON channels
  FOR ALL
  USING (true)
  WITH CHECK (true);
