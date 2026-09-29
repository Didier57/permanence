import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "pg",
    "@node-rs/argon2",
    "nodemailer",
    "pino",
  ],
};

export default nextConfig;
