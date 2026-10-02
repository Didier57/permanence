import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "pg",
    "@node-rs/argon2",
    "nodemailer",
    "pino",
  ],
  async redirects() {
    return [
      { source: "/backup", destination: "/administration/sauvegarde", permanent: false },
      { source: "/configuration", destination: "/administration/configuration", permanent: false },
    ];
  },
};

export default nextConfig;
