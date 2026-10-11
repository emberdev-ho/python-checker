/** @type {import('next').NextConfig} */
const nextConfig = {
  // Xuất ra trang tĩnh (thư mục out/) để host miễn phí trên Vercel và chạy offline
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
