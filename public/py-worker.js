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

/* Chạy thử chương trình. Không thể dừng giữa chừng để chờ người dùng gõ (cần SharedArrayBuffer,
 * Android WebView không hỗ trợ), nên dùng cách "chạy lại": khi input() hết dữ liệu thì dừng hẳn và
 * báo "cần nhập"; người dùng gõ xong thì chạy lại từ đầu với toàn bộ các dòng đã nhập.
 * random được gieo cùng một seed trong cả lượt để các lần chạy lại in ra giống hệt nhau. */
const RUNNER = String.raw`
import builtins, json, linecache, random, sys, time, traceback

_TEN = "<bai_lam>"
_GIOI_HAN = 200000

class _Dung(BaseException):
    pass

def __chay(src, nhap_json, het_nhap, seed, gui):
    nhap = json.loads(nhap_json)
    st = {"i": 0, "dung": None, "kieu": None, "tong": 0, "cho": 0, "luc": time.monotonic()}
    buf = []

    def them(kieu, s):
        if buf and buf[-1][0] == kieu:
            buf[-1][1] += s
        else:
            buf.append([kieu, s])

    def day_ra():
        if buf:
            gui(json.dumps(buf))
            buf.clear()
        st["cho"] = 0
        st["luc"] = time.monotonic()

    def vet(frame, event, arg):
        if frame.f_code.co_filename == _TEN:
            raise _Dung()

    def dung(ly_do):
        if st["dung"] is None:
            st["dung"] = ly_do
        else:
            # Code đã nuốt mất tín hiệu dừng (vd. "except:" trống) -> dừng ngay ở dòng code kế tiếp
            sys.settrace(vet)
            f = sys._getframe(1)
            while f is not None:
                if f.f_code.co_filename == _TEN:
                    f.f_trace = vet
                f = f.f_back
        raise _Dung()

    def ghi(kieu, s):
        if st["dung"] is not None:
            dung(st["dung"])
        if not s:
            return
        st["tong"] += len(s)
        if st["tong"] > _GIOI_HAN:
            dung("qua_dai")
        them(kieu, s)
        st["cho"] += len(s)
        if st["cho"] > 2000 or time.monotonic() - st["luc"] > 0.05:
            day_ra()

    def doc_dong(kieu):
        if st["dung"] is not None:
            dung(st["dung"])
        if st["i"] < len(nhap):
            st["i"] += 1
            s = nhap[st["i"] - 1]
            ghi("in", s + "\n")
            return s
        if het_nhap:
            return None
        st["kieu"] = kieu
        dung("nhap")

    def nhap_vao(prompt=""):
        ghi("out", str(prompt))
        s = doc_dong("dong")
        if s is None:
            raise EOFError("EOF when reading a line")
        return s

    class Ra:
        encoding = "utf-8"
        def __init__(self, kieu):
            self.kieu = kieu
        def write(self, s):
            if not isinstance(s, str):
                raise TypeError("write() argument must be str, not " + type(s).__name__)
            ghi(self.kieu, s)
            return len(s)
        def writelines(self, lines):
            for s in lines:
                self.write(s)
        def flush(self):
            pass
        def isatty(self):
            return False

    class Vao:
        encoding = "utf-8"
        def readline(self, size=-1):
            s = doc_dong("dong")
            return "" if s is None else s + "\n"
        def read(self, size=-1):
            return "".join(iter(self))
        def readlines(self, hint=-1):
            return list(iter(self))
        def __iter__(self):
            return self
        def __next__(self):
            s = doc_dong("het")
            if s is None:
                raise StopIteration
            return s + "\n"
        def isatty(self):
            return False

    linecache.cache[_TEN] = (len(src), None, src.splitlines(True), _TEN)
    cu = (sys.stdin, sys.stdout, sys.stderr, builtins.input)
    sys.stdin, sys.stdout, sys.stderr = Vao(), Ra("out"), Ra("err")
    builtins.input = nhap_vao
    random.seed(int(seed))
    kq = {"status": "done"}
    loi = None
    try:
        exec(compile(src, _TEN, "exec", dont_inherit=True), {"__name__": "__main__", "__builtins__": builtins})
    except _Dung:
        pass
    except SystemExit as e:
        if isinstance(e.code, str):
            them("err", e.code + "\n")
        elif e.code not in (None, 0):
            kq["exit"] = e.code
    except BaseException as e:
        loi = e
    finally:
        sys.settrace(None)
        sys.stdin, sys.stdout, sys.stderr, builtins.input = cu

    if st["dung"] == "nhap":
        kq = {"status": "input", "mode": st["kieu"]}
    elif st["dung"] == "qua_dai":
        kq = {"status": "toolong"}
    elif loi is not None:
        khung = [f for f in traceback.extract_tb(loi.__traceback__) if f.filename == _TEN]
        if len(khung) > 6:
            dong = traceback.format_list(khung[:3])
            dong.append("  ... (" + str(len(khung) - 6) + " lần gọi hàm nữa) ...\n")
            dong += traceback.format_list(khung[-3:])
        else:
            dong = traceback.format_list(khung)
        them("err", "".join(["Traceback (most recent call last):\n"] + dong + traceback.format_exception_only(type(loi), loi)))
        kq = {"status": "error", "type": type(loi).__name__, "msg": str(loi), "line": khung[-1].lineno if khung else None}
    day_ra()
    return json.dumps(kq)
`;

const ready = (async () => {
  const py = await loadPyodide({ indexURL: '/pyodide/' });
  py.runPython(CHECKER);
  py.runPython(RUNNER);
  return { check: py.globals.get('__kiem_tra'), run: py.globals.get('__chay') };
})();

ready
  .then(() => self.postMessage({ type: 'ready' }))
  .catch((err) => self.postMessage({ type: 'load-error', error: String(err) }));

self.onmessage = async (e) => {
  const { id, type, code } = e.data;
  try {
    const py = await ready;
    if (type === 'run') {
      // Gửi dần phần đã in ra để hiện ngay, kể cả khi chương trình chạy lâu
      const send = (chunks) => self.postMessage({ id, out: JSON.parse(chunks) });
      const { input, eof, seed } = e.data;
      self.postMessage({ id, result: JSON.parse(py.run(code, JSON.stringify(input), eof, seed, send)) });
    } else {
      self.postMessage({ id, result: JSON.parse(py.check(code)) });
    }
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
