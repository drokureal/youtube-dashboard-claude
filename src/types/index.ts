export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
}

export interface YouTubeChannel {
  id: string;
  user_id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  created_at: string;
}

export interface AnalyticsData {
  date: string;
  views: number;
  watchTimeMinutes: number;
  subscribersGained: number;
  subscribersLost: number;
  estimatedRevenue: number;
  rpm: number;
  cpm: number;
}

export interface ChannelStats {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  totalViews: number;
  totalWatchTimeMinutes: number;
  netSubscribers: number;
  totalRevenue: number;
  averageRpm: number;
  previousPeriodViews: number;
  previousPeriodWatchTime: number;
  previousPeriodSubscribers: number;
  previousPeriodRevenue: number;
  dailyData: AnalyticsData[];
}

export interface CombinedAnalytics {
  totalViews: number;
  totalWatchTimeMinutes: number;
  netSubscribers: number;
  totalRevenue: number;
  averageRpm: number;
  viewsChange: number;
  watchTimeChange: number;
  subscribersChange: number;
  revenueChange: number;
  dailyData: AnalyticsData[];
  channelBreakdown: ChannelStats[];
}

export interface DateRange {
  label: string;
  value: string;
  days: number;
}

export const DATE_RANGES: DateRange[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 28 days', value: '28d', days: 28 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 365 days', value: '365d', days: 365 },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
