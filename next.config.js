/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://zonadostuff.vercel.app https://zonadostuff-git-portfolio-rebuild-2026-zonafolio.vercel.app",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://zonadostuff.vercel.app https://zonadostuff-git-portfolio-rebuild-2026-zonafolio.vercel.app",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
