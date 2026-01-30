/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const inDocker = process.env.IN_DOCKER === "true";
    const apiBase = inDocker ? "http://api:4000" : "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
