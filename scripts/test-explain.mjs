// Chạy thử bộ dịch lỗi bằng đúng Pyodide (Python trong WebAssembly) ngay trên Node: npm test
import { readFileSync } from 'node:fs';
import { loadPyodide } from 'pyodide';
import { explainPython } from '../lib/explainPython.js';

const worker = readFileSync(new URL('../public/py-worker.js', import.meta.url), 'utf8');
const CHECKER = worker.match(/const CHECKER = `([\s\S]*?)`;/)[1];

const CASES = {
  'Thiếu dấu :': 'n = int(input())\nfor i in range(1, n + 1)\n    print(i)',
  'else if': 'if a > b:\n    print(a)\nelse if a < b:\n    print(b)',
  'Chưa đóng ngoặc': 'n = int(input())\na = list(map(int, input().split())\nprint(max(a))',
  'Thừa ngoặc': 'x = (1 + 2))',
  'Ngoặc không khớp': 'a = [1, 2, 3)',
  'Thiếu thụt lề': 'for i in range(3):\nprint(i)',
  'Thiếu thụt lề def': 'def f(x):\nreturn x',
  'Thụt lề thừa': 'x = 1\n    y = 2',
  'Thụt lề lệch': 'if a:\n    x = 1\n  y = 2',
  'Tab lẫn cách': 'if a:\n\tx = 1\n        y = 2',
  'Chuỗi chưa đóng': 'print("Xin chao)',
  'print Python 2': 'print "hi"',
  '= trong if': 'if n % 2 = 0:\n    print("Chan")',
  'Gán vào số': '5 = x',
  'Thiếu phẩy': 'a = [1 2 3]',
  'Số dính chữ': 'y = 2x + 1',
  'Số 0 đầu': 'x = 007',
  'Nháy cong': 'print(“hi”)',
  'Khoảng trắng lạ': 'x\u00a0= 1',
  'return ngoài hàm': 'return 5',
  'break ngoài vòng': 'break',
  'try thiếu except': 'try:\n    x = 1\ny = 2',
  '&&': 'if x > 0 && x < 10:\n    pass',
  '!': 'if !ok:\n    pass',
  '++': 'i = 0\ni++',
  'Ngoặc nhọn': 'if a > 0 {\n    x = 1\n}',
  'Từ khóa làm tên': 'class = 5',
  'for thiếu in': 'for i range(5):\n    pass',
  'for kiểu C++': 'for (i = 0; i < n; i++):\n    pass',
  'else lẻ': 'x = 1\nelse:\n    pass',
  'int n': 'int n = 5',
  'cin': 'cin >> n;',
  'Pascal': 'if x > 0 then\n    pass',
  'Dấu \\': 'x = 6 \\ 2',
  'f-string': 'x = 1\nprint(f"{x")',
  'True =': 'True = 1',
  'Đúng (có cảnh báo)': 'x = 5\nif x is 5:\n    print("\\d")',
  'Đúng hoàn toàn': 'n = int(input())\nprint(sum(range(n + 1)))',
};

const py = await loadPyodide();
py.runPython(CHECKER);
const check = py.globals.get('__kiem_tra');
console.log('Python', py.runPython('import sys; sys.version.split()[0]'));

let fails = 0;
for (const [name, code] of Object.entries(CASES)) {
  const raw = JSON.parse(check(code));
  const r = explainPython(raw, code);
  const tag = r.ok ? 'OK ' : 'LỖI';
  console.log(`${tag} ${name.padEnd(20)} → ${r.ok ? 'Không lỗi cú pháp' : `Dòng ${r.line}:${r.col}  ${r.title}`}${r.warnings.length ? `  [cảnh báo: ${r.warnings.map((w) => w.title).join('; ')}]` : ''}`);
  if (!r.ok && r.title === 'Viết sai cú pháp') { fails++; console.log('     (chưa có luật riêng) Python báo:', raw.msg); }
}
console.log(fails ? `\n${fails} trường hợp chỉ có giải thích chung.` : '\nTất cả trường hợp đều có giải thích riêng.');
