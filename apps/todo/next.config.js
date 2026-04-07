/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable importing from packages in the monorepo
  transpilePackages: ["@acoms/shared-types", "@acoms/shared-ui"],

  async headers() {
    // Allow ACOMS.OS to embed Controller pages in iframes
    const acOsUrl = process.env.ACOMS_OS_API_URL || "https://acoms-os.vercel.app";
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${acOsUrl}`,
          },
          {
            key: "X-Frame-Options",
            value: `ALLOW-FROM ${acOsUrl}`,
          },
        ],
      },
      {
        // Allow API calls from embed iframes (cross-origin fetch with Authorization header)
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: acOsUrl },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
