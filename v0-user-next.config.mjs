/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // This ensures the app works without a server for API requests
  trailingSlash: true,
  // Remove the deprecated appDir option
  experimental: {
    // Remove appDir: true
  },
};

export default nextConfig;

