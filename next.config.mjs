/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'exceljs'],
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
