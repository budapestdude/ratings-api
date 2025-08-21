/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  async rewrites() {
    // Only apply rewrites in development
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/api/backend/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ]
    }
    return []
  },
}

module.exports = nextConfig