/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  // No dynamic routes with parameters for static export
  trailingSlash: true
}

module.exports = nextConfig