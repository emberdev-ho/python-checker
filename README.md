# Soát lỗi Python

App giúp học sinh kiểm tra lỗi cú pháp Python trước khi nộp bài thi tin học: dán code, bấm **Kiểm tra**, app chỉ ra dòng/cột sai, gạch đỏ chỗ sai và giải thích cách sửa bằng tiếng Việt.

- **Không dùng AI**: dùng Python thật (Pyodide, chạy bằng WebAssembly) để tìm lỗi, rồi dùng bộ luật trong `lib/explainPython.js` để dịch sang tiếng Việt.
- **Chạy offline**: mở app một lần khi có mạng, sau đó dùng được khi mất mạng. Code không gửi đi đâu.
- **Host miễn phí trên Vercel**: app là trang tĩnh, không cần server.

## Chạy trên máy

```bash
npm install      # tự chép bộ Python vào public/pyodide
npm run dev      # mở http://localhost:3000
```

Chế độ offline (Service Worker) chỉ bật ở bản build:

```bash
npm run build && npm start
```

## Đưa lên Vercel

1. Đẩy thư mục này lên một repo GitHub.
2. Vào vercel.com, chọn **Add New → Project**, chọn repo, giữ nguyên cài đặt mặc định, bấm **Deploy**.

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `public/py-worker.js` | Chạy Python trong Web Worker, gọi `compile()` để tìm lỗi |
| `lib/explainPython.js` | Bộ luật dịch lỗi sang tiếng Việt + nhận diện thói quen C++/Pascal |
| `lib/samples.js` | Các bài mẫu có lỗi để thử |
| `components/CodeEditor.js` | Khung soạn code (CodeMirror), gạch đỏ chỗ sai |
| `components/ResultPanel.js` | Bảng "Lời phê" |
| `public/sw.js` | Lưu app vào máy để chạy offline |
| `scripts/test-explain.mjs` | Chạy thử bộ luật: `npm test` |

## Thêm luật dịch lỗi mới

Mở `lib/explainPython.js`, thêm một dòng vào mảng `RULES`:

```js
[/^thông báo gốc của Python$/, () => ({
  title: 'Tiêu đề ngắn',
  explain: 'Vì sao sai',
  fix: 'Cách sửa, phần code đặt trong `dấu huyền`',
  example: 'code mẫu đúng',
})],
```

Để biết thông báo gốc, bấm "Thông báo gốc của Python" ở bảng Lời phê. Thêm trường hợp vào `scripts/test-explain.mjs` rồi chạy `npm test` để kiểm tra.

Khi deploy bản mới có thay đổi, tăng số phiên bản `CACHE` trong `public/sw.js` để máy học sinh tải bản mới.
