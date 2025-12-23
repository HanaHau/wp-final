/** @type {import('next').NextConfig} */
const nextConfig = {
  // 啟用壓縮
  compress: true,
  
  // 圖片優化
  images: {
    domains: ['lh3.googleusercontent.com'],
    // 啟用圖片優化
    minimumCacheTTL: 60,
    // 使用更小的圖片格式
    formats: ['image/avif', 'image/webp'],
  },
  
  // 啟用 React 嚴格模式（生產環境中有助於發現問題）
  reactStrictMode: true,
  
  // 減少 JavaScript 包大小
  swcMinify: true,
  
  // 優化生產環境
  poweredByHeader: false,
  
  // 啟用實驗性功能以提升效能
  experimental: {
    // 優化伺服器端組件
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // 配置 headers 以啟用快取
  async headers() {
    return [
      {
        // API 路由快取
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        // 靜態資源長期快取
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

