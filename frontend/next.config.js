/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Compress responses
  compress: true,
  // Remove X-Powered-By header for security
  poweredByHeader: false,
};

module.exports = nextConfig;
