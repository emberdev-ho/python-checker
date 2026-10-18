# Soát lỗi Python

App giúp học sinh kiểm tra lỗi cú pháp Python trước khi nộp bài thi tin học: dán code, bấm **Kiểm tra**, app chỉ ra dòng/cột sai, gạch đỏ chỗ sai và giải thích cách sửa bằng tiếng Việt. Nếu code đúng cú pháp, app chạy thử luôn và hiện kết quả ở khung **Kết quả chạy**.

- **Không dùng AI**: dùng Python thật (Pyodide, chạy bằng WebAssembly) để tìm lỗi, rồi dùng bộ luật trong `lib/explainPython.js` để dịch sang tiếng Việt.
- **Chạy offline**: mở app một lần khi có mạng, sau đó dùng được khi mất mạng. Code không gửi đi đâu.
- **Host miễn phí trên Vercel**: app là trang tĩnh, không cần server.

## Chạy thử chương trình

Khi code không có lỗi cú pháp, bấm **Kiểm tra** sẽ chạy chương trình và in kết quả ở khung **Kết quả chạy** (dùng được trên web, điện thoại và app Android).

- Chương trình cần nhập (`input()`, `sys.stdin.readline()`) thì ô nhập hiện ngay sau dòng nhắc: gõ giá trị rồi nhấn Enter hoặc bấm **Gửi**. Dán nhiều dòng cùng lúc thì mỗi dòng là một lần nhập.
- Chương trình đọc đến hết dữ liệu (`sys.stdin.read()`, `for line in sys.stdin`) thì nhập xong bấm **Kết thúc nhập**.
- Lỗi khi chạy (chia cho 0, nhập chữ vào `int()`...) được gạch đỏ ở dòng bị lỗi và giải thích bằng tiếng Việt.
- Chương trình chạy quá 10 giây (thường do vòng lặp vô hạn) hoặc in ra quá nhiều sẽ tự dừng. Bấm **Dừng** để dừng bất cứ lúc nào.

Python trong trình duyệt không dừng giữa chừng để chờ gõ phím được, nên mỗi lần nhập thêm một dòng, app chạy lại chương trình từ đầu với tất cả các dòng đã nhập. `random` được gieo cùng một seed trong cả lượt chạy để kết quả các lần chạy lại giống nhau.

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

## Đóng gói thành app Android (APK)

App Android (làm bằng Capacitor) chứa sẵn toàn bộ trang web và bộ Python trong file APK, nên học sinh cài xong là dùng offline được ngay, không cần tải gì thêm. Bản web trên Vercel không bị ảnh hưởng.

Có hai cách build: trên GitHub (không cần cài gì) hoặc trên máy bằng Android Studio.

### Build trên GitHub (không cần cài gì)

Mỗi lần push lên nhánh `main`, GitHub tự build APK (file `.github/workflows/android.yml`). Để tải về:

1. Vào repo trên GitHub, mở tab **Actions**, chọn lần chạy **Build APK** mới nhất (có dấu tích xanh).
2. Kéo xuống mục **Artifacts**, bấm **soat-loi-python-apk** để tải file `.zip`, giải nén ra `app-debug.apk`.

Muốn build lại mà không cần push: ở tab **Actions** chọn **Build APK → Run workflow**.

Lưu ý: mỗi lần build trên GitHub, APK được ký bằng một khóa debug mới, nên muốn cài bản mới lên điện thoại phải gỡ bản cũ trước.

### Build trên máy bằng Android Studio

Cần cài trước:

- **Node.js 22** trở lên
- **Android Studio** (có sẵn Android SDK và Java)

Tạo project Android và mở bằng Android Studio:

```bash
npm install
npm run android        # build trang web rồi chép vào thư mục android/
npm run android:open   # mở thư mục android/ bằng Android Studio
```

Trong Android Studio, chọn **Build → Generate App Bundles or APKs → Generate APKs**. Khi build xong, file APK nằm ở:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Cài lên điện thoại

1. Chép file `app-debug.apk` vào điện thoại (qua cáp USB, Zalo, Google Drive...).
2. Mở file trên điện thoại. Lần đầu, Android sẽ hỏi có cho phép cài ứng dụng không rõ nguồn gốc không: bấm **Cài đặt**, bật **Cho phép từ nguồn này** cho ứng dụng đang dùng để mở file (Trình quản lý tệp, Zalo, Chrome...), rồi quay lại bấm **Cài đặt**.

### Mỗi lần sửa code

1. Chạy lại `npm run android`.
2. Tăng `versionCode` trong `android/app/build.gradle` (ví dụ từ `1` lên `2`) để điện thoại nhận đây là bản mới và cài đè lên bản cũ.
3. Build lại APK như trên (hoặc push lên GitHub để GitHub tự build).

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `public/py-worker.js` | Chạy Python trong Web Worker: gọi `compile()` để tìm lỗi, và chạy thử chương trình |
| `lib/explainPython.js` | Bộ luật dịch lỗi sang tiếng Việt + nhận diện thói quen C++/Pascal |
| `lib/samples.js` | Các bài mẫu có lỗi để thử |
| `components/CodeEditor.js` | Khung soạn code (CodeMirror), gạch đỏ chỗ sai |
| `components/ResultPanel.js` | Bảng "Lời phê" |
| `components/RunPanel.js` | Khung "Kết quả chạy", ô nhập dữ liệu |
| `lib/useRunner.js` | Điều khiển một lượt chạy thử: chờ nhập, chạy lại, giới hạn thời gian |
| `lib/explainRuntime.js` | Bộ luật dịch lỗi khi chạy (`ZeroDivisionError`, `ValueError`...) sang tiếng Việt |
| `public/sw.js` | Lưu app vào máy để chạy offline |
| `scripts/test-explain.mjs` | Chạy thử bộ luật lỗi cú pháp: `npm test` |
| `scripts/test-run.mjs` | Chạy thử phần chạy chương trình và bộ luật lỗi khi chạy: `npm test` |
| `capacitor.config.json` | Cấu hình app Android (tên app, mã app) |
| `android/` | Project Android do Capacitor tạo, mở bằng Android Studio |

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

Lỗi khi chạy (hiện ở khung Kết quả chạy) dịch trong `lib/explainRuntime.js`, cũng theo cách thêm một dòng vào mảng `RULES`. Mỗi luật so khớp với dòng cuối của thông báo lỗi, ví dụ `ZeroDivisionError: division by zero`. Thêm trường hợp vào `scripts/test-run.mjs` để kiểm tra.

Khi deploy bản mới có thay đổi, tăng số phiên bản `CACHE` trong `public/sw.js` để máy học sinh tải bản mới.
