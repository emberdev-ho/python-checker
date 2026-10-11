import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/jetbrains-mono/vietnamese-400.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './globals.css';
import RegisterSW from '@/components/RegisterSW';

export const metadata = {
  title: 'Soát lỗi Python',
  description: 'Kiểm tra lỗi cú pháp Python và gợi ý cách sửa bằng tiếng Việt, chạy offline.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#151b18' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
