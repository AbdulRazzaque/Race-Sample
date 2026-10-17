/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'exceljs', '@prisma/client', 'prisma', 'bcryptjs'],
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
