'use client';

// Quản lý một lượt "chạy thử": chạy chương trình, chờ nhập, chạy lại với các dòng đã nhập.
// Python không dừng giữa chừng để chờ người dùng gõ được, nên mỗi lần có thêm dữ liệu,
// chương trình được chạy lại từ đầu (xem RUNNER trong public/py-worker.js).
import { useCallback, useRef, useState } from 'react';
import { restartPython, runPython } from '@/lib/pyChecker';

export const TIME_LIMIT = 10; // giây cho mỗi lần chạy

// status: idle | blocked (còn lỗi cú pháp) | running | waiting | done | error | timeout | toolong | stopped | crash | outdated
const IDLE = { status: 'idle', out: [], mode: null, error: null, exitCode: null, code: '' };

// Nối phần in ra mới, gộp các đoạn liền nhau cùng loại
function append(out, chunks) {
  const next = out.slice();
  for (const [kind, text] of chunks) {
    const last = next[next.length - 1];
    if (last && last[0] === kind) next[next.length - 1] = [kind, last[1] + text];
    else next.push([kind, text]);
  }
  return next;
}
const lengthOf = (out) => out.reduce((n, [, t]) => n + t.length, 0);

export function useRunner() {
  const [run, setRun] = useState(IDLE);
  const session = useRef(null); // { code, seed, input, eof, busy, again, shown }
  const shownOut = useRef([]); // phần in ra đang hiện trên màn hình

  const update = useCallback((patch) => {
    if (patch.out) shownOut.current = patch.out;
    setRun((r) => ({ ...r, ...patch }));
  }, []);

  const exec = useCallback(async (s) => {
    s.busy = true;
    s.again = false;
    let out = [];
    const live = () => session.current === s;
    update({ status: 'running' });

    const timer = setTimeout(() => {
      if (!live() || !s.busy) return;
      s.busy = false;
      session.current = null;
      restartPython();
      update({ out: lengthOf(out) >= lengthOf(shownOut.current) ? out : shownOut.current, status: 'timeout' });
    }, TIME_LIMIT * 1000);

    let res;
    try {
      res = await runPython(s.code, { input: s.input, eof: s.eof, seed: s.seed }, (chunks) => {
        if (!live()) return;
        out = append(out, chunks);
        // Lần chạy lại in lại đúng phần cũ: chỉ thay khi đã in tới chỗ cũ để khỏi bị nháy
        if (lengthOf(out) >= s.shown) update({ out });
      });
    } catch {
      clearTimeout(timer);
      if (!live()) return;
      s.busy = false;
      session.current = null;
      restartPython(); // Python hỏng hẳn (vd. đệ quy quá sâu làm tràn bộ nhớ): nạp lại
      update({ out, status: 'crash' });
      return;
    }
    clearTimeout(timer);
    if (!live()) return;
    s.busy = false;

    if (!res?.status) { // worker cũ chưa có chức năng chạy (vừa cập nhật app)
      session.current = null;
      update({ status: 'outdated' });
      return;
    }
    if (res.status === 'input' && s.again) return exec(s); // đã gõ trước khi kịp chờ: chạy lại luôn
    s.shown = lengthOf(out);
    if (res.status !== 'input') session.current = null;
    update({
      out,
      status: res.status === 'input' ? 'waiting' : res.status,
      mode: res.mode ?? null,
      error: res.status === 'error' ? { type: res.type, msg: res.msg, line: res.line } : null,
      exitCode: res.exit ?? null,
    });
  }, [update]);

  // Dừng lượt đang chạy. Nếu Python đang bận thì phải nạp lại worker mới dừng được.
  const cancel = useCallback(() => {
    const s = session.current;
    session.current = null;
    if (s?.busy) restartPython();
    return !!s;
  }, []);

  const start = useCallback((code) => {
    cancel();
    const s = { code, seed: Math.floor(Math.random() * 2 ** 31), input: [], eof: false, busy: false, again: false, shown: 0 };
    session.current = s;
    shownOut.current = [];
    setRun({ ...IDLE, code, status: 'running' });
    exec(s);
  }, [cancel, exec]);

  const send = useCallback((lines) => {
    const s = session.current;
    if (!s || !lines.length) return;
    s.input.push(...lines);
    // Hiện ngay dòng vừa gõ, lần chạy lại sẽ in đúng như vậy
    const out = append(shownOut.current, lines.map((l) => ['in', `${l}\n`]));
    s.shown = lengthOf(out);
    update({ out, status: 'running' });
    if (s.busy) s.again = true;
    else exec(s);
  }, [exec, update]);

  const endInput = useCallback(() => {
    const s = session.current;
    if (!s) return;
    s.eof = true;
    if (s.busy) s.again = true;
    else exec(s);
  }, [exec]);

  const stop = useCallback(() => {
    if (cancel()) update({ status: 'stopped' });
  }, [cancel, update]);

  const block = useCallback((code) => { cancel(); shownOut.current = []; setRun({ ...IDLE, code, status: 'blocked' }); }, [cancel]);
  const reset = useCallback(() => { cancel(); shownOut.current = []; setRun(IDLE); }, [cancel]);

  return { run, start, send, endInput, stop, block, reset, cancel };
}
