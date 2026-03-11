/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // allow file uploads via server actions
    },
  },
}

module.exports = nextConfig
