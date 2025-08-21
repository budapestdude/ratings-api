/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export - we'll serve from Express
  // output: 'export',
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