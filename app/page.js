'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ResultPanel from '@/components/ResultPanel';
import RunPanel from '@/components/RunPanel';
import { checkPython, onPythonStatus, startPython } from '@/lib/pyChecker';
import { explainPython } from '@/lib/explainPython';
import { explainRuntime } from '@/lib/explainRuntime';
import { useRunner } from '@/lib/useRunner';
import { SAMPLES } from '@/lib/samples';

const STORAGE_KEY = 'soat-loi-python:code';

function loadSaved() {
  try { return localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
}
function save(code) {
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* bộ nhớ đầy hoặc bị chặn: bỏ qua */ }
}

const STATUS_TEXT = {
  idle: 'Đang khởi động',
  loading: 'Đang tải bộ kiểm tra (chỉ lần đầu)',
  ready: 'Sẵn sàng, không cần mạng',
  error: 'Chưa tải được bộ kiểm tra',
  restarting: 'Đang khởi động lại Python',
};

export default function Home() {
  const editor = useRef(null);
  const codeRef = useRef('');
  const saveTimer = useRef(null);
  const sampleIdx = useRef(0);
  const wasReady = useRef(false);

  const [initialCode, setInitialCode] = useState(null);
  const [pyStatus, setPyStatus] = useState('idle');
  const [online, setOnline] = useState(true);
  const [view, setView] = useState('empty');
  const [result, setResult] = useState(null);
  const [checkedCode, setCheckedCode] = useState('');
  const [stale, setStale] = useState(false);
  const { run: program, start, send, endInput, stop, block, reset, cancel } = useRunner();

  useEffect(() => {
    const saved = loadSaved();
    codeRef.current = saved;
    setInitialCode(saved);
    startPython();
    const off = onPythonStatus((s) => {
      if (s === 'ready') wasReady.current = true;
      setPyStatus(s);
    });
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => { off(); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);

  const handleChange = useCallback((code) => {
    codeRef.current = code;
    setStale((was) => was || code !== checkedCode);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(code), 400);
  }, [checkedCode]);

  const run = useCallback(async () => {
    const code = codeRef.current;
    if (!code.trim()) { setResult(null); setView('nocode'); reset(); return; }
    cancel(); // dừng chương trình đang chạy (nếu có) để Python rảnh mà kiểm tra
    setView('checking');
    try {
      const raw = await checkPython(code);
      const res = explainPython(raw, code);
      setResult(res);
      setCheckedCode(code);
      setStale(false);
      setView('done');
      // Đúng cú pháp thì chạy luôn để xem kết quả
      if (res.ok) start(code);
      else block(code);
    } catch {
      setView('fail');
      reset();
    }
  }, [start, block, reset, cancel]);

  const loadSample = () => {
    const s = SAMPLES[sampleIdx.current % SAMPLES.length];
    sampleIdx.current += 1;
    editor.current?.setValue(s);
    setResult(null);
    setView('empty');
    reset();
  };

  const clearAll = () => {
    editor.current?.setValue('');
    setResult(null);
    setView('empty');
    reset();
  };

  const retry = () => { startPython(); run(); };
  const goTo = (line, col) => editor.current?.goTo(line, col);

  // Gạch đỏ dòng bị lỗi khi chạy (vd. chia cho 0), nếu không có lỗi cú pháp
  const runtimeMarker = useMemo(() => {
    const line = program.status === 'error' && program.error?.line;
    if (!line) return null;
    const text = program.code.split('\n')[line - 1] ?? '';
    const col = text.length - text.trimStart().length + 1;
    return { line, col, endLine: line, endCol: text.length + 1, title: explainRuntime(program.error).title };
  }, [program.status, program.error, program.code]);

  const marker = stale ? null : (view === 'done' && result && !result.ok ? result : runtimeMarker);
  const busy = view === 'checking';

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1>Soát lỗi Python</h1>
          <p className="lede">Dán bài làm, bấm Kiểm tra: chỉ ra dòng viết sai cú pháp và cách sửa, rồi chạy thử chương trình. Chạy ngay trên máy, không gửi code đi đâu.</p>
        </div>
        <p className={`status status-${pyStatus}`} role="status">
          <span className="dot" aria-hidden="true" />
          {STATUS_TEXT[pyStatus === 'loading' && wasReady.current ? 'restarting' : pyStatus]}
          {!online && pyStatus === 'ready' && <span className="offline">Đang offline</span>}
        </p>
      </header>

      <main className="workspace">
        <section className="sheet" aria-label="Bài làm">
          <div className="toolbar">
            <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
              {busy ? 'Đang kiểm tra…' : 'Kiểm tra'}
            </button>
            <span className="kbd-hint">hoặc <kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
            <span className="spacer" />
            <button type="button" className="btn btn-quiet" onClick={loadSample}>Nạp bài có lỗi để thử</button>
            <button type="button" className="btn btn-quiet" onClick={clearAll}>Xóa hết</button>
          </div>
          <div className="paper">
            {initialCode !== null
              ? <CodeEditor ref={editor} initialValue={initialCode} onChange={handleChange} onRun={run} marker={marker} />
              : <div className="editor-host" />}
          </div>
        </section>

        <div className="side">
          <ResultPanel
            view={view}
            result={result}
            stale={stale}
            code={checkedCode}
            pyStatus={pyStatus}
            onGoTo={goTo}
            onRetry={retry}
          />
          <RunPanel
            run={program}
            stale={stale}
            onSend={send}
            onEndInput={endInput}
            onStop={stop}
            onGoTo={goTo}
          />
        </div>
      </main>

      <footer className="foot">
        Chạy thử chỉ cho biết kết quả với dữ liệu bạn nhập. Code chạy đúng một lần vẫn có thể sai thuật toán hoặc sai với bộ test khác.
      </footer>
    </div>
  );
}
