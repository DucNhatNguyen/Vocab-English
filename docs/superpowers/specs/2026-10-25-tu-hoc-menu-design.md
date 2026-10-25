# Thiết kế: menu 3 mục, tab Tự học, tab Bài tập (chưa triển khai)

Ngày: 2026-10-25 · Trạng thái: đã duyệt hướng, chờ duyệt văn bản

## Mục tiêu

- Đơn giản hoá thanh menu dưới còn 3 mục: **Học · Tự học · Bài tập**.
- **Tự học**: nơi nhập từ của mình và học, ôn riêng những từ đó.
- **Bài tập**: chỗ dành sẵn cho chức năng làm bài tập theo tài liệu người dùng import. Lần này chỉ có màn "Sắp ra mắt".

Không đổi: thuật toán SRS 5 cấp, dữ liệu IndexedDB (không cần migration), giao diện kính và hiệu ứng chuyển trang.

## Cách làm

Dùng lại màn học (`/learn`) và màn ôn (`/review`), thêm tham số **nguồn từ**:

| Nguồn | Học từ mới lấy từ | Ôn tập lấy từ |
|---|---|---|
| `decks` (mặc định cho bài mới) | các bộ từ đang chọn (`activeDeckIds`) | — |
| `mine` | "Từ của tôi" (id `custom:*`) | từ tự nhập tới hạn |
| `all` (mặc định cho ôn) | — | mọi từ tới hạn |

Truyền qua query: `/learn?nguon=tu-hoc`, `/review?nguon=tu-hoc`. Không có query thì giữ hành vi mặc định ở bảng trên. Logic chọn từ nằm trong hàm thuần (`src/lib/lesson.ts` và phần lọc ôn tập) để viết unit test.

## 1. Điều hướng

Thanh tab có 3 mục, giữ ô gradient trượt (`layoutId`):

1. **Học** (`/`, icon `GraduationCap`): Trang chủ hiện tại.
   - Góc trên phải: viên chuỗi ngày, nút **Tìm kiếm** (kính lúp, mở `/search`) và nút **Cài đặt** (bánh răng, mở `/settings`), mỗi nút ≥44px.
   - Ba ô lối tắt cuối trang: **Sổ tay · Thống kê · Bộ từ vựng**. Bỏ ô "Từ của tôi" (đã có tab riêng) và bỏ dòng "Xem thống kê" (đã có ô lối tắt).
   - Được coi là đang chọn khi ở: `/`, `/learn`, `/review` (không có `nguon=tu-hoc`), `/notebook`, `/stats`, `/decks…`, `/search`, `/settings`, `/install`.
2. **Tự học** (`/tu-hoc`, icon `PencilLine`): màn mới, xem phần 2.
   - Được coi là đang chọn khi ở: `/tu-hoc`, `/my-words…`, `/learn?nguon=tu-hoc`, `/review?nguon=tu-hoc`.
3. **Bài tập** (`/bai-tap`, icon `ClipboardList`): màn "Sắp ra mắt", xem phần 3.

`/words/:id` (chi tiết từ): sáng **Tự học** nếu id bắt đầu bằng `custom:`, ngược lại sáng **Học**. Cách này sửa luôn lỗi cũ "trang con luôn sáng Trang chủ".

Các đường dẫn cũ giữ nguyên và vẫn hoạt động, kể cả deep link `?tu=`. `/my-words` chuyển hướng (replace) sang `/tu-hoc`. Các nút "Quay lại" và nút sau khi lưu hoặc xoá từ tự nhập trở về `/tu-hoc` thay vì `/my-words`.

Hiệu ứng chuyển trang: `/`, `/tu-hoc`, `/bai-tap` là gốc tab (chuyển giữa chúng dùng hiệu ứng fade). `/learn`, `/review`, `/notebook`, `/settings` trở thành trang con (dùng hiệu ứng trượt push/pop). Cập nhật `isTabRoot` và `classifyNavigation` cùng test của chúng.

## 2. Tab Tự học (`/tu-hoc`)

Trên xuống dưới:

- **Tiêu đề** "Tự học".
- **Thẻ kính hành động**:
  - Hai số liệu kèm huy hiệu: "X từ chưa học", "Y từ tới hạn ôn".
  - Nút chính **Học ngay** (`/learn?nguon=tu-hoc`), bị vô hiệu khi X = 0 kèm dòng giải thích ngắn.
  - Nút phụ **Ôn từ của tôi** (`/review?nguon=tu-hoc`), chỉ hiện khi Y > 0.
- **Nút Thêm từ**: mở form hiện có (`/my-words/new`, giữ gợi ý từ điển và chặn trùng).
- **Danh sách "Từ của tôi"**: dùng lại danh sách của `MyWords` (từ, nghĩa, dấu tích cấp độ). Bấm vào một từ mở `/words/:id`, nơi có sửa và xoá như hiện nay.
- **Trạng thái trống** (chưa có từ nào): huy hiệu lớn, một câu hướng dẫn, nút Thêm từ.

Lượt học Tự học:

- Lấy tối đa N từ tự nhập chưa học, với N = mục tiêu mỗi ngày (5/10/20), theo thứ tự tạo cũ → mới như hiện nay.
- Không giới hạn số lượt trong ngày. Màn tổng kết có nút **Học tiếp N từ** nếu còn từ chưa học, ngoài nút về Tự học.
- Không cộng vào "Hôm nay: x/N từ mới" của tab Học.

Lượt ôn Tự học chỉ gồm từ tự nhập tới hạn, dùng cùng dạng câu hỏi và cùng cách chấm cấp.

Màn bắt đầu, tổng kết và trạng thái trống của học hoặc ôn khi `nguon=tu-hoc` dùng lời lẽ riêng ("Học từ của bạn", "Hết từ chưa học — thêm từ mới nhé"), và nút thoát quay về `/tu-hoc`.

## 3. Tab Bài tập (`/bai-tap`)

- Màn tĩnh: tiêu đề "Bài tập", một thẻ kính có huy hiệu lớn (icon `FileText`).
- Nội dung thẻ:
  - Tiêu đề "Sắp ra mắt".
  - Mô tả: "Bạn sẽ nhập tài liệu của mình (bài đọc, đề, ghi chú) và làm bài tập từ đó."
- Không có nút hành động giả. Chưa lưu dữ liệu, chưa import.

## 4. Thay đổi logic học

- **Bài mới hằng ngày (tab Học)** chỉ lấy từ bộ từ (`decks`), bỏ ưu tiên "Từ của tôi". "Hôm nay: x/N từ mới" chỉ đếm từ bộ từ được học hôm nay.
- **Ôn tập chung (tab Học)** và **thông báo nhắc học** giữ nguyên: đếm mọi từ tới hạn, kể cả từ tự nhập. Tag OneSignal không đổi.
- **Chuỗi ngày học, Sổ điểm, Thống kê, Sổ tay** tính mọi từ như hiện nay. Học hoặc ôn ở Tự học đều tính cho chuỗi ngày học.
- **Sao lưu/khôi phục** không đổi (không có dữ liệu mới).

## 5. Tài liệu

Cập nhật `vocab-app-spec.md`:

- Phần chức năng: mục "Từ của tôi" thành "Tự học"; bài học hằng ngày không còn ưu tiên từ tự nhập; thêm mục "Bài tập (chưa triển khai)".
- Mục 8: thanh điều hướng 3 mục, Cài đặt và Tìm kiếm ở góc trên Trang chủ.
- Mục 8.1: mô tả Trang chủ.

## 6. Kiểm thử

- **Unit test**:
  - Chọn từ mới theo nguồn: `decks` không chứa `custom:*`, `mine` chỉ chứa `custom:*`, giới hạn N.
  - Lọc ôn theo nguồn.
  - Tính "x/N từ mới hôm nay" chỉ đếm từ bộ từ.
  - Logic tab đang chọn (gồm `/words/custom:…` và `?nguon=tu-hoc`).
  - `isTabRoot` / `classifyNavigation` với gốc tab mới.
- **Duyệt trình duyệt** (headless Edge, `--mute-audio`, chặn `speechSynthesis` và `AudioContext`, một lượt sáng 390×844, ảnh tối chỉ cho Học, Tự học, Bài tập):
  - Chuyển tab.
  - Thêm từ, Học ngay, tổng kết, Học tiếp.
  - Ôn từ của tôi.
  - Mở Cài đặt và Tìm kiếm từ Trang chủ.
  - Deep link `?tu=on`.
  - `/my-words` chuyển hướng.
- `npm run build`, `npm test`, `npm run lint` đều qua.

## Ngoài phạm vi

- Chức năng import tài liệu và làm bài tập (sẽ có thiết kế riêng).
- Đổi tên id dữ liệu `custom:*` hoặc bảng IndexedDB.
- Giới hạn số từ học mỗi ngày ở Tự học.
