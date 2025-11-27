import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'yt-bg': '#0f0f0f',
        'yt-bg-secondary': '#1a1a1a',
        'yt-bg-tertiary': '#272727',
        'yt-bg-hover': '#3f3f3f',
        'yt-text': '#f1f1f1',
        'yt-text-secondary': '#aaaaaa',
        'yt-blue': '#3ea6ff',
        'yt-blue-hover': '#65b8ff',
        'yt-green': '#2ba640',
        'yt-red': '#ff4e45',
        'yt-border': '#3f3f3f',
        'yt-card': '#212121',
      },
      fontFamily: {
        'youtube': ['Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
