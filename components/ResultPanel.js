'use client';

import Rich from '@/components/Rich';

// Trích đoạn code quanh dòng lỗi, có dấu ^ chỉ đúng cột
function Snippet({ code, line, col, onGoTo }) {
  const lines = code.split('\n');
  const expand = (s) => s.replace(/\t/g, '    ');
  const start = Math.max(1, line - 1);
  const rows = [];
  for (let n = start; n <= Math.min(line, lines.length); n++) rows.push(n);
  const raw = lines[line - 1] || '';
  const caretAt = expand(raw.slice(0, Math.max(0, col - 1))).length;
  const width = String(line).length;

  return (
    <button type="button" className="snippet" onClick={onGoTo} title="Bấm để nhảy tới dòng lỗi">
      {rows.map((n) => (
        <span key={n} className={n === line ? 'snippet-line is-error' : 'snippet-line'}>
          <span className="snippet-no">{String(n).padStart(width)}</span>
          {expand(lines[n - 1] || ' ') || ' '}
        </span>
      ))}
      <span className="snippet-line snippet-caret" aria-hidden="true">
        <span className="snippet-no">{' '.repeat(width)}</span>
        {' '.repeat(caretAt)}^
      </span>
    </button>
  );
}

function Warnings({ items, onGoTo }) {
  if (!items?.length) return null;
  return (
    <section className="warn-box" aria-label="Lưu ý thêm">
      <h3>Lưu ý thêm</h3>
      <ul>
        {items.map((w, i) => (
          <li key={i}>
            {w.line ? <button type="button" className="line-link" onClick={() => onGoTo(w.line, 1)}>Dòng {w.line}</button> : null}
            <strong><Rich text={w.title} /></strong>
            <p><Rich text={w.fix} /></p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ResultPanel({ view, result, stale, code, pyStatus, onGoTo, onRetry }) {
  return (
    <aside className="verdict" aria-live="polite">
      <h2 className="verdict-heading">Lời phê</h2>

      {stale && view === 'done' && (
        <p className="stale">Bạn đã sửa code sau lần kiểm tra này. Bấm <b>Kiểm tra</b> để xem kết quả mới.</p>
      )}

      {view === 'empty' && (
        <div className="verdict-empty">
          <p>Dán bài làm vào khung bên trái rồi bấm <b>Kiểm tra</b>.</p>
          <p>Nếu có lỗi cú pháp, chỗ sai sẽ được gạch đỏ và cách sửa hiện ở đây.</p>
        </div>
      )}

      {view === 'nocode' && <div className="verdict-empty"><p>Chưa có code để kiểm tra. Hãy dán bài làm vào khung bên trái.</p></div>}

      {view === 'checking' && (
        <div className="verdict-empty">
          <p className="pulse">
            {pyStatus === 'ready' ? 'Đang kiểm tra…' : 'Đang chuẩn bị bộ kiểm tra Python. Lần đầu mất khoảng 10–30 giây, những lần sau chạy ngay.'}
          </p>
        </div>
      )}

      {view === 'fail' && (
        <div className="verdict-empty">
          <p>Không nạp được bộ kiểm tra Python. Lần đầu sử dụng cần có mạng để tải về; sau đó dùng offline được.</p>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>Thử tải lại</button>
        </div>
      )}

      {view === 'done' && result?.ok && (
        <div className={stale ? 'is-stale' : ''}>
          <div className="pass">
            <div className="stamp" aria-hidden="true"><span>Đạt</span></div>
            <div>
              <p className="pass-title">Không có lỗi cú pháp</p>
              <p className="pass-note">Code viết đúng quy tắc của Python. Xem chương trình chạy ra gì ở khung <b>Kết quả chạy</b>.</p>
            </div>
          </div>
          <Warnings items={result.warnings} onGoTo={onGoTo} />
        </div>
      )}

      {view === 'done' && result && !result.ok && (
        <article className={stale ? 'error is-stale' : 'error'}>
          <button type="button" className="where" onClick={() => onGoTo(result.line, result.col)}>
            Dòng {result.line}, cột {result.col}
          </button>
          <h3 className="error-title"><Rich text={result.title} /></h3>
          <Snippet code={code} line={result.line} col={result.col} onGoTo={() => onGoTo(result.line, result.col)} />

          <h4>Vì sao sai</h4>
          <p><Rich text={result.explain} /></p>

          <h4>Cách sửa</h4>
          <p><Rich text={result.fix} /></p>

          {result.example && (
            <>
              <h4>Viết đúng sẽ như thế này</h4>
              <pre className="example">{result.example}</pre>
            </>
          )}

          {result.hints?.length > 0 && (
            <ul className="hints">{result.hints.map((h, i) => <li key={i}><Rich text={h} /></li>)}</ul>
          )}

          <details className="raw">
            <summary>Thông báo gốc của Python</summary>
            <code>{result.raw.type}: {result.raw.msg}</code>
          </details>

          <Warnings items={result.warnings} onGoTo={onGoTo} />
          <p className="one-at-a-time">Python chỉ báo lỗi đầu tiên tìm thấy. Sửa xong lỗi này rồi bấm Kiểm tra lại để tìm lỗi tiếp theo.</p>
        </article>
      )}
    </aside>
  );
}
