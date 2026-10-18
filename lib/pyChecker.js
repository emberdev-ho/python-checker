// Quản lý Web Worker chạy Python. Giao diện chỉ cần gọi startPython(), checkPython(code), runPython(...).
let worker = null;
let status = 'idle'; // idle | loading | ready | error
const listeners = new Set();
const pending = new Map();
let seq = 0;

function setStatus(s) {
  status = s;
  listeners.forEach((fn) => fn(s));
}

function failAll(message) {
  pending.forEach((p) => p.reject(new Error(message)));
  pending.clear();
}

export function startPython() {
  if (worker || typeof window === 'undefined') return;
  setStatus('loading');
  worker = new Worker('/py-worker.js');
  worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'ready') return setStatus('ready');
    if (d.type === 'load-error') {
      setStatus('error');
      failAll(d.error);
      worker.terminate();
      worker = null;
      return;
    }
    const p = pending.get(d.id);
    if (!p) return;
    if (d.out) return p.onOutput?.(d.out);
    pending.delete(d.id);
    d.error ? p.reject(new Error(d.error)) : p.resolve(d.result);
  };
  worker.onerror = () => {
    setStatus('error');
    failAll('Không nạp được bộ kiểm tra Python');
    worker?.terminate();
    worker = null;
  };
}

export function onPythonStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

function send(message, onOutput) {
  startPython();
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, onOutput });
    worker.postMessage({ id, ...message });
  });
}

export function checkPython(code) {
  return send({ code });
}

// Chạy chương trình với các dòng đã nhập. onOutput nhận dần phần in ra: [[kind, text], ...]
// với kind là 'out' (print), 'err' (lỗi) hoặc 'in' (dòng đã nhập).
export function runPython(code, { input, eof, seed }, onOutput) {
  return send({ type: 'run', code, input, eof, seed }, onOutput);
}

// Dừng hẳn chương trình đang chạy (vd. vòng lặp vô hạn): bỏ worker cũ, nạp lại Python.
export function restartPython() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  failAll('Đã dừng chương trình');
  startPython();
}
