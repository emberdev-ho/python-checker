'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Rich from '@/components/Rich';
import { explainRuntime } from '@/lib/explainRuntime';
import { TIME_LIMIT } from '@/lib/useRunner';

const BADGE = {
  idle: ['Chưa chạy', 'muted'],
  blocked: ['Chưa chạy', 'muted'],
  running: ['Đang chạy…', 'busy'],
  waiting: ['Đang chờ nhập', 'wait'],
  done: ['Đã chạy xong', 'ok'],
  error: ['Lỗi khi chạy', 'bad'],
  timeout: ['Đã dừng', 'bad'],
  toolong: ['Đã dừng', 'bad'],
  stopped: ['Đã dừng', 'muted'],
  crash: ['Đã dừng', 'bad'],
  outdated: ['Chưa chạy', 'bad'],
};

function Note({ run, onGoTo }) {
  const printed = run.out.some(([kind]) => kind !== 'in');
  switch (run.status) {
    case 'idle':
      return (
        <div className="console-empty">
          <p>Bấm <b>Kiểm tra</b>: nếu code không có lỗi cú pháp, chương trình sẽ chạy và in kết quả ở đây.</p>
          <p>Khi chương trình cần nhập (<code>input()</code>), gõ giá trị vào đây rồi nhấn Enter.</p>
        </div>
      );
    case 'blocked':
      return <p className="console-empty">Code còn lỗi cú pháp nên chưa chạy được. Sửa theo <b>Lời phê</b> rồi bấm <b>Kiểm tra</b> lại.</p>;
    case 'done':
      if (run.exitCode != null) return <p className="console-note">Chương trình kết thúc với mã thoát {String(run.exitCode)}.</p>;
      return printed ? null : <p className="console-note">Chương trình chạy xong nhưng không in ra gì. Dùng <code>print()</code> để in kết quả.</p>;
    case 'error': {
      const e = explainRuntime(run.error);
      return (
        <div className="run-error">
          {run.error.line && (
            <button type="button" className="where" onClick={() => onGoTo(run.error.line, 1)}>Dòng {run.error.line}</button>
          )}
          <p className="run-error-title"><Rich text={e.title} /></p>
          <p><Rich text={e.fix} /></p>
        </div>
      );
    }
    case 'timeout':
      return <p className="console-note is-bad">Chương trình chạy quá {TIME_LIMIT} giây nên đã bị dừng. Có thể có vòng lặp không bao giờ kết thúc, ví dụ quên tăng biến đếm trong <code>while</code>.</p>;
    case 'toolong':
      return <p className="console-note is-bad">Chương trình in ra quá nhiều nên đã bị dừng. Có thể có vòng lặp không bao giờ kết thúc.</p>;
    case 'stopped':
      return <p className="console-note">Đã dừng chương trình.</p>;
    case 'crash':
      return <p className="console-note is-bad">Python gặp lỗi nghiêm trọng nên phải khởi động lại, thường do đệ quy quá sâu (ví dụ đặt <code>sys.setrecursionlimit</code> quá lớn). Bấm <b>Kiểm tra</b> để chạy lại.</p>;
    case 'outdated':
      return <p className="console-note is-bad">App vừa được cập nhật. Tải lại trang để dùng chức năng chạy thử.</p>;
    default:
      return null;
  }
}

export default function RunPanel({ run, stale: edited, onSend, onEndInput, onStop, onGoTo }) {
  const [value, setValue] = useState('');
  const body = useRef(null);
  const field = useRef(null);
  const stick = useRef(true); // đang xem cuối khung thì tự cuộn theo phần mới in ra

  const { status } = run;
  // Giữ nguyên ô nhập trong lúc chạy lại để bàn phím điện thoại không bị đóng
  const asking = status === 'waiting' || (status === 'running' && run.out.some(([kind]) => kind === 'in'));
  const stale = edited && status !== 'idle' && status !== 'blocked';
  const [label, tone] = BADGE[status] ?? BADGE.idle;

  useLayoutEffect(() => {
    if (stick.current && body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [run.out, status]);

  useEffect(() => {
    if (status === 'waiting' && document.activeElement !== field.current) field.current?.focus();
  }, [status]);

  useEffect(() => { if (!asking) setValue(''); }, [asking]);

  const submit = (lines) => { onSend(lines); field.current?.focus(); };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submit([value]);
    setValue('');
  };

  // Dán nhiều dòng một lúc: mỗi dòng là một lần nhập
  const onPaste = (e) => {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!/[\r\n]/.test(text)) return;
    e.preventDefault();
    const el = e.currentTarget;
    const lines = (value.slice(0, el.selectionStart) + text + value.slice(el.selectionEnd)).split(/\r\n|\r|\n/);
    setValue(lines.pop());
    submit(lines);
  };

  // Bấm vào khung thì đưa con trỏ vào ô nhập, trừ khi đang bôi đen để chép kết quả
  const onBodyClick = () => {
    if (asking && window.getSelection()?.isCollapsed !== false) field.current?.focus();
  };

  return (
    <section className={`console${stale && !asking ? ' is-stale' : ''}`} aria-label="Kết quả chạy">
      <header className="console-head">
        <h2 className="console-heading">Kết quả chạy</h2>
        <span className={`run-badge run-${tone}`}>{label}</span>
        {(status === 'running' || status === 'waiting') && (
          <button type="button" className="btn btn-quiet" onClick={onStop}>Dừng</button>
        )}
      </header>

      {stale && <p className="stale console-stale">Bạn đã sửa code sau lần chạy này. Bấm <b>Kiểm tra</b> để chạy lại.</p>}

      <div
        className="console-body"
        ref={body}
        role="log"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
        onClick={onBodyClick}
      >
        {(run.out.length > 0 || asking) && (
          <div className="console-out">
            {run.out.map(([kind, text], i) => <span key={i} className={`out-${kind}`}>{text}</span>)}
            {asking && (
              <input
                ref={field}
                className="console-in"
                value={value}
                style={{ width: `${Math.max(8, value.length + 2)}ch` }}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                aria-label="Nhập dữ liệu cho chương trình"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            )}
          </div>
        )}
        <Note run={run} onGoTo={onGoTo} />
      </div>

      {asking && (
        <div className="console-actions">
          <button
            type="button"
            className="btn btn-send"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { submit([value]); setValue(''); }}
          >
            Gửi
          </button>
          <button type="button" className="btn btn-quiet" onMouseDown={(e) => e.preventDefault()} onClick={onEndInput}>
            Kết thúc nhập
          </button>
          <span className="console-hint">
            {run.mode === 'het'
              ? 'Chương trình đọc đến hết dữ liệu: nhập xong thì bấm Kết thúc nhập.'
              : 'Gõ giá trị rồi nhấn Enter. Dán nhiều dòng cùng lúc cũng được.'}
          </span>
        </div>
      )}
    </section>
  );
}
