// Dịch lỗi cú pháp Python sang tiếng Việt + gợi ý cách sửa.
// Hoàn toàn dựa trên luật (regex), không dùng AI. Muốn thêm lỗi mới: thêm một dòng vào RULES.
// Trong các chuỗi giải thích, phần đặt trong `dấu huyền` sẽ được hiển thị dạng code.

const CLOSE_OF = { '(': ')', '[': ']', '{': '}' };
const OPEN_OF = { ')': '(', ']': '[', '}': '{' };
const KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
  'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
];
const LOOKALIKE = {
  '“': '"', '”': '"', '„': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '−': '-',
  '×': '*', '÷': '/', '≠': '!=', '≤': '<=', '≥': '>=', '，': ',', '：': ':', '；': ';',
  '（': '(', '）': ')', '【': '[', '】': ']', '＝': '=',
};
const BLOCK_NAME = {
  'function definition': 'dòng `def` (định nghĩa hàm)',
  'class definition': 'dòng `class`',
};

const EQ_INFO = {
  title: 'Dùng `=` thay vì `==` trong điều kiện',
  explain: 'Một dấu `=` là phép gán giá trị. Muốn so sánh bằng nhau phải dùng hai dấu `==`.',
  fix: 'Đổi `=` thành `==` trong điều kiện này.',
  example: 'if n % 2 == 0:\n    print("Chan")',
};

// ---------- Luật cho lỗi (SyntaxError / IndentationError / TabError) ----------
const RULES = [
  [/^expected ':'$/, () => ({
    title: 'Thiếu dấu hai chấm `:`',
    explain: 'Các dòng mở đầu một khối lệnh như `if`, `elif`, `else`, `for`, `while`, `def`, `class`, `try`, `except` phải kết thúc bằng dấu `:`.',
    fix: 'Thêm dấu `:` vào cuối dòng này.',
    example: 'for i in range(1, n + 1):\n    tong += i',
  })],

  [/^'(.)' was never closed$/, (m) => ({
    title: `Dấu \`${m[1]}\` mở ra nhưng chưa đóng`,
    explain: `Python thấy dấu \`${m[1]}\` ở vị trí này nhưng đọc đến hết code vẫn không thấy dấu \`${CLOSE_OF[m[1]]}\` tương ứng. Lỗi hay gặp khi lồng nhiều ngoặc, ví dụ \`list(map(int, input().split()))\`.`,
    fix: `Đếm lại số ngoặc mở và đóng trên dòng này, rồi thêm \`${CLOSE_OF[m[1]]}\` vào đúng chỗ (thường là cuối dòng).`,
    example: 'a = list(map(int, input().split()))',
  })],

  [/^unmatched '(.)'$/, (m) => ({
    title: `Thừa dấu \`${m[1]}\``,
    explain: `Dấu đóng \`${m[1]}\` này không có dấu mở \`${OPEN_OF[m[1]]}\` nào đi trước nó.`,
    fix: `Xóa dấu \`${m[1]}\` thừa, hoặc thêm \`${OPEN_OF[m[1]]}\` vào chỗ cần mở ngoặc.`,
  })],

  [/^closing parenthesis '(.)' does not match opening parenthesis '(.)'(?: on line (\d+))?$/, (m) => ({
    title: `Đóng ngoặc không khớp: mở \`${m[2]}\` nhưng đóng \`${m[1]}\``,
    explain: `Ngoặc mở là \`${m[2]}\`${m[3] ? ` (ở dòng ${m[3]})` : ''} thì phải đóng bằng \`${CLOSE_OF[m[2]]}\`, không phải \`${m[1]}\`.`,
    fix: `Đổi \`${m[1]}\` thành \`${CLOSE_OF[m[2]]}\`, hoặc kiểm tra xem có quên đóng ngoặc nào ở giữa không.`,
    example: 'a = [1, 2, 3]\nprint(len(a))',
  })],

  [/^expected an indented block after (.+) on line (\d+)$/, (m) => {
    const what = m[1].match(/^'(\w+)' statement$/);
    const name = what ? `câu lệnh \`${what[1]}\`` : (BLOCK_NAME[m[1]] || m[1]);
    return {
      title: 'Thiếu phần thụt lề bên trong khối lệnh',
      explain: `Sau ${name} ở dòng ${m[2]}, Python cần ít nhất một dòng lệnh được thụt vào trong (lùi đầu dòng). Dòng này đang bị viết thẳng hàng với dòng trên.`,
      fix: 'Thụt dòng này vào 4 dấu cách (hoặc bấm Tab). Nếu chưa muốn viết gì trong khối, tạm thời đặt lệnh `pass`.',
      example: 'if x % i == 0:\n    return False',
    };
  }],

  [/^expected an indented block$/, () => ({
    title: 'Thiếu phần thụt lề bên trong khối lệnh',
    explain: 'Sau dòng kết thúc bằng `:` phải có ít nhất một dòng được thụt vào trong.',
    fix: 'Thụt dòng này vào 4 dấu cách, hoặc đặt tạm lệnh `pass`.',
  })],

  [/^unexpected indent$/, () => ({
    title: 'Dòng này bị thụt lề thừa',
    explain: 'Dòng này lùi vào trong nhiều hơn dòng phía trên, trong khi dòng trên không kết thúc bằng `:` nên không mở khối lệnh mới.',
    fix: 'Xóa bớt khoảng trắng đầu dòng cho thẳng hàng với dòng trên. Nếu dòng trên là `if`/`for`/`while`… thì kiểm tra xem dòng đó có thiếu `:` không.',
  })],

  [/^unindent does not match any outer indentation level$/, () => ({
    title: 'Thụt lề bị lệch',
    explain: 'Khoảng trắng đầu dòng này không bằng với bất kỳ khối lệnh nào phía trên (ví dụ khối ngoài thụt 4, khối trong thụt 8 nhưng dòng này lại thụt 6).',
    fix: 'Căn lại đầu dòng cho thẳng hàng với khối lệnh mà dòng này thuộc về. Nên thống nhất mỗi cấp thụt 4 dấu cách.',
  })],

  [/^inconsistent use of tabs and spaces in indentation$/, () => ({
    title: 'Trộn lẫn phím Tab và dấu cách khi thụt lề',
    explain: 'Có dòng thụt lề bằng Tab, có dòng bằng dấu cách. Nhìn thì thẳng hàng nhưng Python coi là khác nhau. Lỗi này hay gặp khi dán code từ nơi khác vào.',
    fix: 'Xóa khoảng trắng đầu các dòng trong khối này rồi thụt lại bằng cùng một kiểu (khuyên dùng 4 dấu cách).',
  })],

  [/^unterminated string literal/, () => ({
    title: 'Chuỗi chưa có dấu nháy đóng',
    explain: 'Chuỗi bắt đầu bằng dấu nháy ở vị trí này nhưng đến hết dòng vẫn chưa có dấu nháy đóng.',
    fix: 'Thêm dấu nháy đóng cùng loại với dấu mở (`"` đi với `"`, `\'` đi với `\'`).',
    example: 'print("Xin chao")',
  })],

  [/^unterminated triple-quoted string literal/, () => ({
    title: 'Chuỗi ba dấu nháy chưa được đóng',
    explain: 'Chuỗi mở bằng `"""` hoặc `\'\'\'` ở đây nhưng không thấy ba dấu nháy đóng, nên Python coi toàn bộ phần code phía sau là chuỗi.',
    fix: 'Thêm `"""` (hoặc `\'\'\'`) vào chỗ kết thúc chuỗi.',
  })],

  [/^Missing parentheses in call to '(\w+)'/, (m) => ({
    title: `Lệnh \`${m[1]}\` thiếu dấu ngoặc`,
    explain: `Đây là cách viết của Python 2. Trong Python 3, \`${m[1]}\` là hàm nên phải có ngoặc tròn.`,
    fix: `Viết \`${m[1]}(...)\`, đặt nội dung cần in vào trong ngoặc.`,
    example: 'print("Ket qua:", ans)',
  })],

  [/Maybe you meant '==' or ':=' instead of '='\?$/, () => EQ_INFO],

  [/^cannot assign to (True|False|None|__debug__)$/, (m) => ({
    title: `Không thể gán giá trị cho \`${m[1]}\``,
    explain: `\`${m[1]}\` là giá trị cố định của Python, không dùng làm tên biến được.`,
    fix: 'Đặt tên biến khác, ví dụ `ok`, `tim_thay`.',
  })],

  [/^cannot assign to (.+?)(?: here)?(?:\. Maybe you meant '==' instead of '='\?)?$/, (m, line) => /^\s*(if|elif|while)\b/.test(line) ? EQ_INFO : ({
    title: 'Vế trái của dấu `=` không phải tên biến',
    explain: `Bên trái dấu \`=\` đang là ${translateTarget(m[1])}, mà phép gán chỉ gán được vào tên biến (hoặc phần tử như \`a[i]\`).`,
    fix: 'Đảo lại cho tên biến nằm bên trái (`x = 5`, không phải `5 = x`). Nếu bạn đang muốn so sánh thì dùng `==`.',
  })],

  [/Perhaps you forgot a comma\?$/, () => ({
    title: 'Có thể thiếu dấu phẩy',
    explain: 'Ở đoạn được đánh dấu có hai giá trị đứng cạnh nhau mà không có gì ngăn cách.',
    fix: 'Thêm dấu `,` giữa các phần tử (trong danh sách, lời gọi hàm, `print`…), hoặc thêm phép toán nếu bạn định tính toán.',
    example: 'a = [1, 2, 3]\nprint(a, b)',
  })],

  [/^invalid decimal literal$/, () => ({
    title: 'Số bị dính liền với chữ',
    explain: 'Python thấy một con số viết sát chữ cái, ví dụ `2x` hoặc tên biến bắt đầu bằng số như `1a`. Python không tự hiểu `2x` là `2 * x`, và tên biến không được bắt đầu bằng chữ số.',
    fix: 'Nếu là phép nhân thì viết rõ `2 * x`. Nếu là tên biến thì đổi tên để bắt đầu bằng chữ cái, ví dụ `a1`.',
    example: 'y = 2 * x + 1',
  })],

  [/^leading zeros in decimal integer literals/, () => ({
    title: 'Số nguyên không được bắt đầu bằng chữ số 0',
    explain: 'Python không cho viết số như `007` hay `05`.',
    fix: 'Bỏ các số 0 ở đầu: viết `7` thay cho `007`. Nếu cần in ra có số 0 ở đầu thì dùng chuỗi hoặc định dạng, ví dụ `f"{x:03d}"`.',
  })],

  [/^invalid character '(.)' \(U\+([0-9A-F]+)\)$/, (m) => {
    const good = LOOKALIKE[m[1]];
    return {
      title: `Ký tự lạ \`${m[1]}\``,
      explain: `Ký tự \`${m[1]}\` trông giống ký hiệu bình thường nhưng không phải. Thường do code được dán từ Word, Zalo, Messenger hoặc trang web.`,
      fix: good
        ? `Xóa \`${m[1]}\` và gõ lại bằng bàn phím thành \`${good}\`. Nên kiểm tra các dấu nháy và ngoặc khác trong bài.`
        : `Xóa ký tự \`${m[1]}\` này và gõ lại bằng bàn phím.`,
    };
  }],

  [/^invalid non-printable character U\+([0-9A-F]+)$/, () => ({
    title: 'Có ký tự ẩn không nhìn thấy',
    explain: 'Ở vị trí này có một ký tự vô hình (thường là khoảng trắng đặc biệt) lẫn vào khi dán code từ web, Word hoặc tin nhắn.',
    fix: 'Xóa khoảng trắng quanh vị trí được đánh dấu rồi gõ lại bằng phím cách. Nếu vẫn lỗi, gõ lại cả dòng.',
  })],

  [/^'return' outside function$/, () => ({
    title: '`return` nằm ngoài hàm',
    explain: '`return` chỉ dùng được bên trong hàm (`def`). Có thể dòng này bị thụt lề sai nên rơi ra ngoài hàm.',
    fix: 'Thụt dòng này vào trong thân hàm. Nếu đang ở chương trình chính và muốn dừng chương trình thì dùng `exit()`.',
  })],

  [/^'break' outside loop$/, () => ({
    title: '`break` nằm ngoài vòng lặp',
    explain: '`break` chỉ dùng được bên trong `for` hoặc `while`.',
    fix: 'Kiểm tra thụt lề: dòng này phải nằm trong thân vòng lặp.',
  })],

  [/^'continue' not properly in loop$/, () => ({
    title: '`continue` nằm ngoài vòng lặp',
    explain: '`continue` chỉ dùng được bên trong `for` hoặc `while`.',
    fix: 'Kiểm tra thụt lề: dòng này phải nằm trong thân vòng lặp.',
  })],

  [/^expected 'except' or 'finally' block$/, () => ({
    title: '`try` thiếu phần `except`',
    explain: 'Sau khối `try:` phải có khối `except:` (hoặc `finally:`) ngay bên dưới, cùng mức thụt lề với `try`.',
    fix: 'Thêm khối `except` sau phần `try`.',
    example: 'try:\n    x = int(input())\nexcept ValueError:\n    x = 0',
  })],

  [/^unexpected character after line continuation character$/, () => ({
    title: 'Dấu `\\` dùng sai chỗ',
    explain: 'Ngoài chuỗi, dấu `\\` chỉ dùng ở cuối dòng để nối sang dòng sau. Phép chia trong Python là `/` hoặc `//`.',
    fix: 'Nếu muốn chia, đổi `\\` thành `/` (chia thường) hoặc `//` (chia lấy phần nguyên).',
  })],

  [/^f-string: (.+)$/, (m) => ({
    title: 'Lỗi bên trong f-string',
    explain: `Phần trong dấu \`{ }\` của chuỗi \`f"..."\` viết chưa đúng (Python báo: ${m[1]}).`,
    fix: 'Kiểm tra mỗi `{` đều có `}` đóng, và bên trong là biểu thức hợp lệ, ví dụ `f"Tong = {a + b}"`.',
  })],

  [/^(unexpected EOF while parsing|unexpected end of file)/, () => ({
    title: 'Code kết thúc đột ngột',
    explain: 'Python đọc đến cuối mà code vẫn chưa xong, thường do thiếu ngoặc đóng hoặc khối lệnh chưa có nội dung.',
    fix: 'Kiểm tra các ngoặc ở cuối bài và khối lệnh cuối cùng.',
  })],
];

// ---------- Các lỗi "invalid syntax" chung chung: đoán nguyên nhân theo nội dung dòng ----------
// Rất nhiều học sinh học C++/Pascal trước, nên những thói quen đó được nhận diện riêng.
const SPECIALS = [
  [(t) => /\belse\s+if\b/.test(t), () => ({
    mark: /else\s+if/,
    title: 'Python dùng `elif`, không dùng `else if`',
    explain: 'Trong Python, nhánh "nếu không thì nếu" viết gọn thành một từ `elif`.',
    fix: 'Đổi `else if` thành `elif`.',
    example: 'if a > b:\n    print(a)\nelif a < b:\n    print(b)',
  })],
  [(t) => /&&|\|\|/.test(t), () => ({
    mark: /&&|\|\|/,
    title: 'Python dùng `and`/`or`, không dùng `&&`/`||`',
    explain: 'Các ký hiệu `&&` và `||` là của C++/Java. Python viết bằng chữ.',
    fix: 'Đổi `&&` thành `and`, `||` thành `or`.',
    example: 'if x > 0 and x < 10:',
  })],
  [(t) => /!(?!=)/.test(t), () => ({
    mark: /!(?!=)/,
    title: 'Python dùng `not`, không dùng `!`',
    explain: 'Phép phủ định trong Python viết là `not`. Dấu `!` chỉ xuất hiện trong `!=` (khác).',
    fix: 'Đổi `!x` thành `not x`.',
    example: 'if not tim_thay:',
  })],
  [(t) => /(\w|\]|\))\s*(\+\+|--)\s*;?\s*$/.test(t) || /^\s*(\+\+|--)\s*\w/.test(t), () => ({
    mark: /\+\+|--/,
    title: 'Python không có `++` và `--`',
    explain: 'Phép tăng/giảm 1 kiểu `i++` là của C++. Python không hỗ trợ.',
    fix: 'Viết `i += 1` (tăng) hoặc `i -= 1` (giảm).',
  })],
  [(t, prev) => /\{\s*$/.test(t) || /\{\s*$/.test(prev) || /^\s*\}\s*$/.test(t), () => ({
    title: 'Python không dùng `{ }` để tạo khối lệnh',
    explain: 'Trong Python, khối lệnh được xác định bằng dấu `:` ở cuối dòng và thụt lề, không dùng ngoặc nhọn như C++.',
    fix: 'Xóa các dấu `{` `}`, thêm `:` cuối dòng `if`/`for`/`while`, rồi thụt lề các dòng bên trong.',
    example: 'if a > 0:\n    x = 1',
  })],
  [(t) => new RegExp(`^\\s*(${KEYWORDS.join('|')})\\s*([-+*/]?=)(?!=)`).test(t), (t) => {
    const kw = t.match(new RegExp(`^\\s*(${KEYWORDS.join('|')})`))[1];
    return {
      title: `\`${kw}\` là từ khóa, không dùng làm tên biến`,
      explain: `\`${kw}\` có nghĩa đặc biệt trong Python nên không được đặt làm tên biến.`,
      fix: `Đổi sang tên khác, ví dụ \`${kw}_\` hoặc một tên có nghĩa hơn.`,
    };
  }],
  [(t) => /^\s*for\s*\(/.test(t), () => ({
    mark: /for\s*\(.*\)/,
    title: 'Viết vòng `for` theo kiểu C++',
    explain: 'Python không có dạng `for (i = 0; i < n; i++)`.',
    fix: 'Dùng `range`: `for i in range(n):` chạy i từ 0 đến n - 1.',
    example: 'for i in range(0, n):',
  })],
  [(t) => /^\s*for\b/.test(t) && !/\bin\b/.test(t), () => ({
    title: 'Vòng `for` thiếu từ khóa `in`',
    explain: 'Vòng `for` trong Python có dạng `for biến in dãy:`.',
    fix: 'Thêm `in` giữa tên biến và dãy.',
    example: 'for i in range(n):',
  })],
  [(t, _p, raw) => raw.msg === 'invalid syntax' && /^\s*(elif|else)\b/.test(t), (t) => {
    const kw = t.trim().startsWith('elif') ? 'elif' : 'else';
    return {
      title: `\`${kw}\` không đi kèm \`if\` nào`,
      explain: `\`${kw}\` phải đứng ngay sau khối \`if\` (hoặc \`elif\`), và phải thẳng hàng với \`if\` đó.`,
      fix: `Kiểm tra thụt lề: \`${kw}\` phải thẳng cột với \`if\` tương ứng. Kiểm tra cả khối \`if\` phía trên có bị viết sai không.`,
    };
  }],
  [(t) => /^\s*(int|float|double|long|string|bool|char|var|let|const|auto)\s+[A-Za-z_]\w*\s*([=;,[]|$)/.test(t), () => ({
    mark: /^\s*\w+/,
    title: 'Python không cần khai báo kiểu biến',
    explain: 'Kiểu khai báo `int n;` là của C++. Trong Python, biến được tạo khi gán giá trị lần đầu.',
    fix: 'Bỏ tên kiểu ở đầu, viết thẳng `n = 0` hoặc `n = int(input())`.',
  })],
  [(t) => /\b(cin\s*>>|cout\s*<<|printf\s*\(|scanf\s*\()/.test(t), () => ({
    title: 'Đây là cách nhập/xuất của C/C++',
    explain: 'Python dùng `input()` để nhập và `print()` để in.',
    fix: 'Nhập: `n = int(input())`. In: `print(n)`.',
  })],
  [(t) => /\bthen\s*$|^\s*(begin|end)\b/.test(t), () => ({
    mark: /\bthen\b|\bbegin\b|\bend\b/,
    title: 'Đây là cú pháp của Pascal',
    explain: 'Python không dùng `then`, `begin`, `end`.',
    fix: 'Thay `then` bằng dấu `:`, bỏ `begin`/`end` và dùng thụt lề cho khối lệnh.',
  })],
];

const GENERIC = (msg) =>
  msg === 'invalid syntax' ||
  msg === "expected ':'" ||
  msg.startsWith('invalid syntax.');

// Xóa nội dung chuỗi và chú thích để tránh nhận nhầm ký hiệu nằm trong chuỗi.
function codeOnly(line) {
  return line
    .replace(/(['"])(?:\\.|(?!\1).)*\1/g, (s) => s[0] + ' '.repeat(s.length - 2) + s[0])
    .replace(/#.*$/, '');
}

function translateTarget(t) {
  const map = {
    literal: 'một giá trị cố định (số hoặc chuỗi)',
    'function call': 'một lời gọi hàm',
    expression: 'một biểu thức',
    comparison: 'một phép so sánh',
    'conditional expression': 'một biểu thức điều kiện',
    attribute: 'một thuộc tính',
  };
  return map[t] || `\`${t}\``;
}

// Kiểm tra thêm ngoài cú pháp: những dòng trên đúng cú pháp nhưng gần như chắc chắn là gõ nhầm.
function extraHints(lines, errLine) {
  const hints = [];
  const text = lines[errLine - 1] || '';
  if (/[“”‘’]/.test(text)) hints.push('Dòng này có dấu nháy cong `“ ”`. Hãy gõ lại bằng dấu nháy thẳng `"`.');
  if (/\t/.test(text) && lines.some((l) => /^ +\S/.test(l))) {
    hints.push('Bài làm vừa có Tab vừa có dấu cách ở đầu dòng. Nên thống nhất một kiểu.');
  }
  return hints;
}

function sanitizeRange(raw, lines) {
  let line = raw.line || 1;
  if (line > lines.length) line = lines.length || 1;
  const text = lines[line - 1] || '';
  let col = Math.max(1, Math.min(raw.col || 1, text.length + 1));
  let endLine = line;
  let endCol = col + 1;
  if (raw.end_line && raw.end_line >= line && raw.end_col > 0) {
    if (raw.end_line > line || raw.end_col > col) {
      endLine = raw.end_line;
      endCol = raw.end_col;
    }
  }
  // Lỗi thụt lề: tô cả phần khoảng trắng đầu dòng
  if (/indent|tabs and spaces/.test(raw.msg)) {
    const lead = text.match(/^\s*/)[0].length;
    col = 1;
    endLine = line;
    endCol = Math.max(lead, 1) + 1;
  }
  return { line, col, endLine, endCol };
}

const WARNING_RULES = [
  [/^"is not" with .*literal/, () => ({
    title: 'Dùng `is not` để so sánh với một giá trị',
    fix: '`is not` dùng để so sánh đối tượng, không phải giá trị. Đổi thành `!=`.',
  })],
  [/^"is" with .*literal/, () => ({
    title: 'Dùng `is` để so sánh với một giá trị',
    fix: '`is` không dùng để so sánh số hay chuỗi, kết quả có thể sai. Đổi `is` thành `==`.',
  })],
  [/^invalid escape sequence '(.+)'$/, (m) => ({
    title: `Chuỗi chứa \`${m[1]}\` không hợp lệ`,
    fix: 'Muốn có dấu `\\` trong chuỗi thì viết `\\\\`, hoặc thêm chữ `r` trước chuỗi: `r"..."`.',
  })],
  [/object is not (callable|subscriptable); perhaps you missed a comma\?$/, () => ({
    title: 'Có thể thiếu dấu phẩy giữa các phần tử',
    fix: 'Kiểm tra danh sách trên dòng này: giữa các phần tử như `(1, 2) (3, 4)` cần có dấu `,`.',
  })],
];

function explainWarnings(warnings = []) {
  return warnings.map((w) => {
    for (const [re, build] of WARNING_RULES) {
      const m = w.msg.match(re);
      if (m) return { line: w.line, raw: w.msg, ...build(m) };
    }
    return { line: w.line, raw: w.msg, title: 'Cảnh báo từ Python', fix: 'Đọc thông báo gốc bên dưới để xem chi tiết.' };
  });
}

// Đúng cú pháp Python nhưng là thói quen từ C++, chạy sẽ lỗi ngay.
function styleWarnings(code) {
  const out = [];
  code.split('\n').forEach((l, i) => {
    const t = codeOnly(l);
    if (/\b(cin\s*>>|cout\s*<<)/.test(t)) {
      out.push({ line: i + 1, raw: null, title: 'Dòng này là cách nhập/xuất của C++', fix: 'Python dùng `input()` để nhập và `print()` để in, ví dụ `n = int(input())`, `print(n)`. Cú pháp vẫn hợp lệ nhưng chạy sẽ báo lỗi.' });
    } else if (/\b(printf|scanf)\s*\(/.test(t)) {
      out.push({ line: i + 1, raw: null, title: 'Python không có `printf`/`scanf`', fix: 'Dùng `print()` và `input()`. Muốn định dạng số thì dùng f-string: `print(f"{x:.2f}")`.' });
    }
  });
  return out;
}

/**
 * @param raw  kết quả từ py-worker.js
 * @param code mã nguồn học sinh
 */
export function explainPython(raw, code) {
  const warnings = [...explainWarnings(raw.warnings), ...styleWarnings(code)];
  warnings.sort((a, b) => (a.line || 0) - (b.line || 0));
  if (raw.ok) return { ok: true, warnings };

  const lines = code.split('\n');
  if (!raw.line) {
    return {
      ok: false, line: 1, col: 1, endLine: 1, endCol: 2, warnings,
      title: 'Không đọc được code',
      explain: 'Code có ký tự đặc biệt khiến Python không đọc được.',
      fix: 'Thử gõ lại hoặc dán lại code dưới dạng văn bản thuần.',
      hints: [], raw: { type: raw.type, msg: raw.msg },
    };
  }

  const range = sanitizeRange(raw, lines);
  const lineText = codeOnly(lines[range.line - 1] || '');
  const prevText = codeOnly(lines[range.line - 2] || '');

  let info = null;
  if (GENERIC(raw.msg)) {
    for (const [test, build] of SPECIALS) {
      if (test(lineText, prevText, raw)) { info = build(lineText); break; }
    }
  }
  if (!info) {
    for (const [re, build] of RULES) {
      const m = raw.msg.match(re);
      if (m) { info = build(m, lineText); break; }
    }
  }
  if (!info) {
    info = {
      title: 'Viết sai cú pháp',
      explain: 'Python không hiểu đoạn code ở vị trí được đánh dấu.',
      fix: 'Kiểm tra dòng này và cuối dòng ngay phía trên: thiếu `:`, thiếu hoặc thừa ngoặc, thiếu dấu phẩy, gõ sai tên lệnh, hoặc dùng cú pháp của ngôn ngữ khác.',
    };
  }

  // Gạch đỏ đúng cụm bị sai (ví dụ cả `else if`) thay vì chỉ một ký tự
  if (info.mark) {
    const m = lineText.match(info.mark);
    if (m) {
      const lead = m[0].match(/^\s*/)[0].length;
      Object.assign(range, { col: m.index + lead + 1, endLine: range.line, endCol: m.index + m[0].length + 1 });
    }
    delete info.mark;
  }

  return { ok: false, ...range, ...info, hints: extraHints(lines, range.line), warnings, raw: { type: raw.type, msg: raw.msg } };
}
