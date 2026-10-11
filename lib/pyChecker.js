// Quản lý Web Worker chạy Python. Giao diện chỉ cần gọi startPython(), checkPython(code).
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

export function checkPython(code) {
  startPython();
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, code });
  });
}
