/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Compress responses
  compress: true,
  // Remove X-Powered-By header for security
  poweredByHeader: false,
};

module.exports = nextConfig;
