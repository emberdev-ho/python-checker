'use client';

import { useEffect } from 'react';

// Đăng ký Service Worker để lưu toàn bộ app vào máy -> lần sau mở được khi không có mạng.
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(async () => {
      const reg = await navigator.serviceWorker.ready;
      // Gửi danh sách tệp trang đã tải (JS, CSS, phông chữ) để SW lưu lại, kể cả tệp tải trước khi SW hoạt động
      const urls = performance.getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.startsWith(location.origin));
      reg.active?.postMessage({ type: 'CACHE_URLS', urls: [location.href, ...urls] });
    }).catch(() => { /* trình duyệt không hỗ trợ: app vẫn chạy bình thường khi có mạng */ });
  }, []);
  return null;
}
