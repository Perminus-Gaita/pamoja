import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Photos are pre-sized WebP derivatives served straight from object storage —
  // nothing may route through Vercel's pay-per-view image optimizer.
  images: { unoptimized: true },
}

export default nextConfig
