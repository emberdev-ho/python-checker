// Hiển thị chuỗi có `code` thành chữ thường xen lẫn thẻ <code>
export default function Rich({ text }) {
  if (!text) return null;
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1
      ? <code key={i}>{part.slice(1, -1)}</code>
      : <span key={i}>{part}</span>
  );
}
