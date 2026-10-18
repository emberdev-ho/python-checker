// Chạy thử phần "Kết quả chạy" (RUNNER trong py-worker.js) bằng đúng Pyodide trên Node: npm test
import { readFileSync } from 'node:fs';
import { loadPyodide } from 'pyodide';
import { explainRuntime } from '../lib/explainRuntime.js';

const worker = readFileSync(new URL('../public/py-worker.js', import.meta.url), 'utf8');
const RUNNER = worker.match(/const RUNNER = String\.raw`([\s\S]*?)`;/)[1];

const py = await loadPyodide();
py.runPython(RUNNER);
const runOnce = py.globals.get('__chay');

// Giống giao diện: chạy, nếu cần nhập thì thêm dòng tiếp theo rồi chạy lại từ đầu
function session(code, lines = [], { eof = false, seed = 42 } = {}) {
  const input = [];
  for (let round = 0; round < 50; round++) {
    let text = '';
    const send = (chunks) => { for (const [, t] of JSON.parse(chunks)) text += t; };
    const res = JSON.parse(runOnce(code, JSON.stringify(input), eof && input.length === lines.length, seed, send));
    if (res.status !== 'input' || input.length === lines.length && !eof) return { ...res, text, rounds: round + 1 };
    if (input.length < lines.length) input.push(lines[input.length]);
    else eof = true;
  }
  throw new Error('quá nhiều vòng');
}

const RANDOM = 'import random\nprint(random.randint(1, 10**9))\nx = input()\nprint(random.randint(1, 10**9))';
const firstLine = (r) => r.text.split('\n')[0];

const CASES = [
  ['In ra', 'print("Xin chao")', [], (r) => r.status === 'done' && r.text === 'Xin chao\n'],
  ['Chờ nhập', 'n = int(input("n = "))\nprint(n * 2)', [], (r) => r.status === 'input' && r.mode === 'dong' && r.text === 'n = '],
  ['Nhập rồi in', 'n = int(input("n = "))\nprint(n * 2)', ['21'], (r) => r.status === 'done' && r.text === 'n = 21\n42\n'],
  ['Nhập 2 dòng', 'n = int(input())\na = list(map(int, input().split()))\nprint(sum(a[:n]))', ['3', '1 2 3 4'], (r) => r.text === '3\n1 2 3 4\n6\n'],
  ['sys.stdin.readline', 'import sys\ninput = sys.stdin.readline\na, b = map(int, input().split())\nprint(a + b)', ['2 3'], (r) => r.text === '2 3\n5\n'],
  ['Đọc đến hết', 'import sys\nprint(sum(map(int, sys.stdin.read().split())))', ['1 2', '3'], (r) => r.status === 'input' && r.mode === 'het'],
  ['Đọc đến hết + EOF', 'import sys\nprint(sum(map(int, sys.stdin.read().split())))', ['1 2', '3'], (r) => r.status === 'done' && r.text.endsWith('6\n'), { eof: true }],
  ['EOFError khi hết nhập', 'while True:\n    try:\n        x = input()\n    except EOFError:\n        break\n    print(x.upper())', ['ab'], (r) => r.status === 'done' && r.text === 'ab\nAB\n', { eof: true }],
  ['random giống nhau khi chạy lại', RANDOM, ['ok'], (r) => r.status === 'done' && r.rounds === 2 && firstLine(r) === firstLine(session(RANDOM))],
  ['except trống nuốt tín hiệu', 'while True:\n    try:\n        n = int(input())\n        break\n    except:\n        print("Nhap lai")', [], (r) => r.status === 'input' && !r.text.includes('Nhap lai')],
  ['Lỗi chia 0', 'a = 5\nb = 0\nprint(a / b)', [], (r) => r.status === 'error' && r.type === 'ZeroDivisionError' && r.line === 3 && r.text.includes('Traceback')],
  ['Lỗi trong hàm', 'def f(x):\n    return x[5]\nprint(f([1]))', [], (r) => r.status === 'error' && r.line === 2],
  ['Đệ quy quá sâu', 'def f(n):\n    return f(n + 1)\nf(0)', [], (r) => r.status === 'error' && r.type === 'RecursionError'],
  ['In quá nhiều', 'while True:\n    print("x" * 100)', [], (r) => r.status === 'toolong'],
  ['exit()', 'print(1)\nexit()\nprint(2)', [], (r) => r.status === 'done' && r.text === '1\n'],
  ['stderr', 'import sys\nprint("loi", file=sys.stderr)', [], (r) => r.status === 'done' && r.text === 'loi\n'],
];

// Lỗi khi chạy hay gặp của học sinh: phải có giải thích riêng (không rơi vào câu chung)
const RUNTIME = {
  'int("abc")': ['int(input())', ['abc']],
  'int("1 2")': ['n = int(input())', ['1 2']],
  'int("2.5")': ['n = int(input())', ['2.5']],
  'thiếu giá trị': ['a, b = map(int, input().split())', ['5']],
  'NameError': ['print(tong)', []],
  'UnboundLocalError': ['dem = 0\ndef f():\n    dem += 1\nf()', []],
  'IndexError': ['a = [1, 2]\nprint(a[2])', []],
  'KeyError': ['d = {}\nprint(d["x"])', []],
  'chuỗi + số': ['print("Tong: " + 5)', []],
  'chuỗi - số': ['n = input()\nprint(n - 1)', ['5']],
  'so sánh chuỗi số': ['n = input()\nif n > 5:\n    pass', ['7']],
  'for trên số': ['for i in 5:\n    pass', []],
  'gọi số': ['sum = 0\nprint(sum([1, 2]))', []],
  'push': ['a = []\na.push(1)', []],
  'numpy': ['import numpy', []],
};

let fails = 0;
for (const [name, code, lines, ok, opts] of CASES) {
  const r = session(code, lines, opts);
  const pass = ok(r);
  if (!pass) fails++;
  console.log(`${pass ? 'OK ' : 'SAI'} ${name.padEnd(30)} → ${r.status}${r.type ? ' ' + r.type : ''}  ${JSON.stringify(r.text.slice(0, 60))}`);
}
for (const [name, [code, lines]] of Object.entries(RUNTIME)) {
  const r = session(code, lines);
  const e = r.status === 'error' ? explainRuntime(r) : null;
  const pass = e && !e.generic;
  if (!pass) fails++;
  console.log(`${pass ? 'OK ' : 'SAI'} ${name.padEnd(30)} → ${r.type}: ${e?.title ?? r.status}`);
}
console.log(fails ? `\n${fails} trường hợp chạy sai.` : '\nTất cả trường hợp chạy đúng.');
process.exit(fails ? 1 : 0);
