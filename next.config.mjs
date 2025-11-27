/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker (only in CI/Docker environments)
  // Set STANDALONE=true in your CI/Docker build to enable this
  ...(process.env.STANDALONE === "true" && { output: "standalone" }),
};

export default nextConfig;
