import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable transpilation of workspace packages
  transpilePackages: ['@research/openai-utils'],
};

export default nextConfig;
