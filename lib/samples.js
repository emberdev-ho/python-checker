// Các bài mẫu có lỗi, dùng để học sinh thử nút "Nạp bài có lỗi"
export const SAMPLES = [
  `# Tính tổng 1 + 2 + ... + n
n = int(input())
tong = 0
for i in range(1, n + 1)
    tong += i
print(tong)
`,
  `# Số lớn hơn
a, b = map(int, input().split())
if a > b:
    print(a)
else if a < b:
    print(b)
else:
    print("Bang nhau")
`,
  `# Giá trị lớn nhất của dãy
n = int(input())
a = list(map(int, input().split())
print(max(a))
`,
  `# Kiểm tra số nguyên tố
def la_so_nguyen_to(x):
    if x < 2:
        return False
    for i in range(2, int(x ** 0.5) + 1):
        if x % i == 0:
        return False
    return True

print(la_so_nguyen_to(int(input())))
`,
  `# Chẵn hay lẻ
n = int(input())
if n % 2 = 0:
    print("Chan")
else:
    print("Le")
`,
  `# Đếm số trong khoảng (0, 10)
n = int(input())
dem = 0
for x in map(int, input().split()):
    if x > 0 && x < 10:
        dem += 1
print(dem)
`,
  `# Đếm số ước thực sự của n (ước k < n)
n = int ( input (“ Nhập số tự nhiên n: “ ))
count = 0
for k in range (1, n):
    if n%k == 0:
        count = count + 1
print (count)
`,
  `# Đoạn chương trình sau in ra kết quả gì?
n = int (input (“ Nhập số tự nhiên n: “ ))
S = 0
for k in range (n+1):
    S = S + k
print (S*S )
`,
  `# Tính chu vi, diện tích hình tròn bán kính R
R=4.5
Pi=3.14
Print (“chu vi hình tròn”, 2*R*pi)
Print (“diện tích”, pi*R*R)
`,
];
