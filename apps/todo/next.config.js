/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable importing from packages in the monorepo
  transpilePackages: ["@acoms/shared-types", "@acoms/shared-ui"],
};

module.exports = nextConfig;
