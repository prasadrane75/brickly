/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      (process.env.IN_DOCKER === "true"
        ? "http://api:4000"
        : "http://localhost:4000");
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

