// Chép bộ Python (Pyodide) từ node_modules vào public/ để web tự phục vụ, không cần CDN -> chạy offline được
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', 'pyodide');
const dst = join('public', 'pyodide');
const files = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

if (!existsSync(src)) {
  console.warn('[copy-pyodide] Chưa có node_modules/pyodide, bỏ qua.');
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
for (const f of files) copyFileSync(join(src, f), join(dst, f));
console.log(`[copy-pyodide] Đã chép ${files.length} tệp vào ${dst}`);
