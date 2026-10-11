/* Web Worker: nạp Python thật (Pyodide/WebAssembly) và kiểm tra cú pháp bằng compile().
 * Chạy hoàn toàn trong trình duyệt, không gửi code đi đâu cả. */
importScripts('/pyodide/pyodide.js');

const CHECKER = `
import json, warnings

def __kiem_tra(src):
    canh_bao = []
    try:
        with warnings.catch_warnings(record=True) as ws:
            warnings.simplefilter("always")
            compile(src, "<bai_lam>", "exec", dont_inherit=True)
        for w in ws:
            canh_bao.append({"msg": str(w.message), "line": w.lineno, "type": w.category.__name__})
        return json.dumps({"ok": True, "warnings": canh_bao})
    except SyntaxError as e:
        return json.dumps({
            "ok": False,
            "type": type(e).__name__,
            "msg": e.msg,
            "line": e.lineno,
            "col": e.offset,
            "end_line": getattr(e, "end_lineno", None),
            "end_col": getattr(e, "end_offset", None),
            "warnings": canh_bao,
        })
    except Exception as e:
        return json.dumps({"ok": False, "type": type(e).__name__, "msg": str(e),
                           "line": None, "col": None, "warnings": canh_bao})
`;

const ready = (async () => {
  const py = await loadPyodide({ indexURL: '/pyodide/' });
  py.runPython(CHECKER);
  return py.globals.get('__kiem_tra');
})();

ready
  .then(() => self.postMessage({ type: 'ready' }))
  .catch((err) => self.postMessage({ type: 'load-error', error: String(err) }));

self.onmessage = async (e) => {
  const { id, code } = e.data;
  try {
    const check = await ready;
    self.postMessage({ id, result: JSON.parse(check(code)) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
