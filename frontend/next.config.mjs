/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add webpack configuration to fix chunk loading errors
  webpack: (config, { isServer }) => {
    // Avoid CORS issues with chunks in development mode
    if (!isServer) {
      config.output.crossOriginLoading = 'anonymous';
    }
    
    return config;
  },
}

export default nextConfig
