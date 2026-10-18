// Dịch lỗi khi chạy chương trình (ZeroDivisionError, ValueError...) sang tiếng Việt.
// Giống explainPython.js: chỉ dùng luật (regex). Muốn thêm lỗi mới: thêm một dòng vào RULES.
// Mỗi luật so khớp với chuỗi "TênLỗi: thông báo" của Python.

const TYPE_VI = { str: 'chuỗi', int: 'số nguyên', float: 'số thực', list: 'danh sách', NoneType: '`None`' };
const vi = (t) => TYPE_VI[t] ?? `\`${t}\``;

const INPUT_IS_STR = 'Giá trị đọc từ `input()` luôn là chuỗi. Muốn tính toán thì đổi sang số, ví dụ `n = int(input())`.';

function badNumber(value, func) {
  const v = value.trim();
  if (v === '') return { title: 'Dòng nhập vào đang để trống', fix: `\`${func}()\` cần một số, nhưng dòng nhập vào không có gì. Kiểm tra lại dữ liệu nhập.` };
  if (/^\S+(\s+\S+)+$/.test(v)) return {
    title: 'Một dòng có nhiều giá trị',
    fix: `Dòng nhập \`${v}\` có nhiều số cách nhau bởi dấu cách. Dùng \`map(${func}, input().split())\` để tách, ví dụ \`a, b = map(${func}, input().split())\`.`,
  };
  if (func === 'int' && /^[+-]?\d*[.,]\d+$/.test(v)) return {
    title: `\`${v}\` là số thực, không phải số nguyên`,
    fix: 'Dùng `float()` thay cho `int()` nếu dữ liệu có phần thập phân. Lưu ý Python dùng dấu chấm, không dùng dấu phẩy.',
  };
  return { title: `Không đổi được \`${v}\` thành số`, fix: 'Giá trị nhập vào không phải là số. Kiểm tra lại dữ liệu nhập.' };
}

const RULES = [
  [/^ZeroDivisionError/, () => ({
    title: 'Chia cho 0',
    fix: 'Số chia đang bằng 0 (với phép `/`, `//` hoặc `%`). Kiểm tra trước khi chia, ví dụ `if b != 0:`.',
  })],
  [/^ValueError: invalid literal for int\(\) with base 10: '(.*)'$/s, (m) => badNumber(m[1], 'int')],
  [/^ValueError: could not convert string to float: '(.*)'$/s, (m) => badNumber(m[1], 'float')],
  [/^ValueError: not enough values to unpack \(expected (\d+), got (\d+)\)/, (m) => ({
    title: `Cần ${m[1]} giá trị nhưng chỉ có ${m[2]}`,
    fix: `Vế trái có ${m[1]} biến nhưng vế phải chỉ có ${m[2]} giá trị. Nếu đang đọc dữ liệu, kiểm tra dòng nhập có đủ ${m[1]} số không.`,
  })],
  [/^ValueError: too many values to unpack \(expected (\d+)/, (m) => ({
    title: `Có nhiều hơn ${m[1]} giá trị`,
    fix: `Vế trái chỉ có ${m[1]} biến nhưng vế phải có nhiều giá trị hơn. Nếu đang đọc dữ liệu, kiểm tra dòng nhập có bị thừa số không.`,
  })],
  [/^NameError: name '(\w+)' is not defined/, (m) => ({
    title: `Tên \`${m[1]}\` chưa được định nghĩa`,
    fix: `Python không biết \`${m[1]}\` là gì. Kiểm tra viết đúng chính tả chưa (Python phân biệt chữ hoa, chữ thường), đã gán giá trị trước khi dùng chưa, hoặc đã \`import\` chưa.`,
  })],
  [/^UnboundLocalError: cannot access local variable '(\w+)'/, (m) => ({
    title: `Biến \`${m[1]}\` được dùng trong hàm trước khi gán`,
    fix: `Nếu muốn dùng biến \`${m[1]}\` ở ngoài hàm, thêm dòng \`global ${m[1]}\` ở đầu hàm.`,
  })],
  [/^IndexError: (list|string|tuple) index out of range/, (m) => ({
    title: `Vị trí truy cập vượt ra ngoài ${m[1] === 'string' ? 'chuỗi' : 'danh sách'}`,
    fix: 'Danh sách có `n` phần tử thì vị trí hợp lệ là `0` đến `n - 1`. Kiểm tra giới hạn vòng lặp, ví dụ dùng `range(len(a))` thay vì `range(len(a) + 1)`.',
  })],
  [/^IndexError: pop from empty list/, () => ({
    title: 'Lấy phần tử từ danh sách rỗng',
    fix: 'Danh sách không còn phần tử nào. Kiểm tra `if a:` trước khi gọi `pop()`.',
  })],
  [/^KeyError: (.+)$/s, (m) => ({
    title: `Từ điển không có khóa \`${m[1]}\``,
    fix: 'Kiểm tra khóa có trong từ điển chưa bằng `if khoa in d:`, hoặc dùng `d.get(khoa, 0)` để lấy giá trị mặc định.',
  })],
  [/^TypeError: can only concatenate str \(not "(\w+)"\) to str/, (m) => ({
    title: `Cộng chuỗi với ${vi(m[1])}`,
    fix: 'Muốn ghép số vào chuỗi thì đổi số thành chuỗi bằng `str()`, hoặc in bằng `print("Tong:", tong)` hay f-string `print(f"Tong: {tong}")`.',
  })],
  [/^TypeError: unsupported operand type\(s\) for (\S+): '(\w+)' and '(\w+)'/, (m) => ({
    title: `Không tính được \`${m[1]}\` giữa ${vi(m[2])} và ${vi(m[3])}`,
    fix: m[2] === 'str' || m[3] === 'str' ? INPUT_IS_STR : 'Hai giá trị này không cùng kiểu để tính toán. Kiểm tra lại kiểu của từng biến.',
  })],
  [/^TypeError: '([<>=!]+)' not supported between instances of '(\w+)' and '(\w+)'/, (m) => ({
    title: `Không so sánh được ${vi(m[2])} với ${vi(m[3])}`,
    fix: m[2] === 'str' || m[3] === 'str' ? INPUT_IS_STR : 'Hai giá trị này không cùng kiểu để so sánh.',
  })],
  [/^TypeError: can't multiply sequence by non-int of type '(\w+)'/, () => ({
    title: 'Nhân chuỗi hoặc danh sách với một giá trị không phải số nguyên',
    fix: INPUT_IS_STR,
  })],
  [/^TypeError: '(\w+)' object is not iterable/, (m) => ({
    title: `Không lặp được trên ${vi(m[1])}`,
    fix: m[1] === 'int' ? 'Muốn lặp `n` lần thì dùng `for i in range(n):` thay vì `for i in n:`.' : 'Vòng `for` chỉ chạy được trên danh sách, chuỗi, `range()`...',
  })],
  [/^TypeError: '(\w+)' object is not subscriptable/, (m) => ({
    title: `Không dùng được \`[ ]\` với ${vi(m[1])}`,
    fix: 'Chỉ danh sách, chuỗi, từ điển... mới lấy phần tử bằng `[ ]` được. Kiểm tra biến này có đúng là danh sách không.',
  })],
  [/^TypeError: '(\w+)' object is not callable/, (m) => ({
    title: `Gọi ${vi(m[1])} như một hàm`,
    fix: 'Có thể bạn đã đặt tên biến trùng với tên hàm (ví dụ `sum = 0` rồi lại gọi `sum(a)`), hoặc viết thiếu dấu `*` (ví dụ `2(a + b)` phải là `2 * (a + b)`).',
  })],
  [/^TypeError: (\w+)\(\) (?:takes|missing)/, (m) => ({
    title: `Gọi hàm \`${m[1]}\` sai số lượng tham số`,
    fix: `Đếm lại số giá trị truyền vào \`${m[1]}(...)\` cho khớp với dòng \`def ${m[1]}(...)\`.`,
  })],
  [/^AttributeError: '(\w+)' object has no attribute '(\w+)'/, (m) => ({
    title: `${vi(m[1])[0].toUpperCase() + vi(m[1]).slice(1)} không có \`${m[2]}\``,
    fix: m[2] === 'push' ? 'Danh sách trong Python dùng `append()` để thêm phần tử.' : `Kiểm tra lại tên \`${m[2]}\`, hoặc kiểu của biến có đúng như bạn nghĩ không.`,
  })],
  [/^RecursionError/, () => ({
    title: 'Đệ quy quá sâu',
    fix: 'Hàm gọi lại chính nó quá nhiều lần. Kiểm tra điều kiện dừng của hàm đệ quy.',
  })],
  [/^EOFError/, () => ({
    title: 'Chương trình cần thêm dữ liệu nhập',
    fix: 'Chương trình gọi `input()` nhưng dữ liệu nhập đã kết thúc.',
  })],
  [/^ModuleNotFoundError: (?:No module named '([\w.]+)'|The module '([\w.]+)')/, (m) => ({
    title: `Không có thư viện \`${m[1] ?? m[2]}\``,
    fix: 'App chỉ có sẵn các thư viện chuẩn của Python như `math`, `random`, `sys`. Các thư viện phải cài thêm như `numpy` không dùng được.',
  })],
  [/^OverflowError/, () => ({
    title: 'Số quá lớn',
    fix: 'Số thực (`float`) có giới hạn. Nếu được, hãy tính bằng số nguyên (`//` thay cho `/`).',
  })],
  [/^MemoryError/, () => ({
    title: 'Hết bộ nhớ',
    fix: 'Chương trình tạo dữ liệu quá lớn, ví dụ danh sách quá nhiều phần tử.',
  })],
  [/^AssertionError/, () => ({
    title: 'Điều kiện `assert` bị sai',
    fix: 'Một dòng `assert` kiểm tra điều kiện và thấy điều kiện đó sai.',
  })],
];

// err: { type, msg, line } từ py-worker.js. Trả về { title, fix }.
export function explainRuntime(err) {
  const text = `${err.type}: ${err.msg}`;
  for (const [re, make] of RULES) {
    const m = text.match(re);
    if (m) return make(m);
  }
  return { title: `Chương trình bị lỗi \`${err.type}\``, fix: 'Đọc thông báo gốc của Python ở trên để biết chi tiết.', generic: true };
}
