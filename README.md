# Từ Ngày

PWA học từ vựng tiếng Anh cho iPhone: học từ mới, ôn tập theo 5 cấp độ nhớ ("Thời điểm vàng"), sổ tay, tab Tự học (tự thêm từ và học riêng), tab Bài tập (sắp ra mắt), thống kê và streak.

- **Offline-first**: bộ từ đóng gói sẵn trong app, service worker cache toàn bộ; dùng được khi mất mạng (trừ thông báo đẩy và gợi ý từ khi tự thêm từ).
- **Dữ liệu nằm trên máy**: tiến độ học, lịch ôn và cài đặt lưu trong IndexedDB của trình duyệt (Dexie). Không có backend, không tài khoản.
- **Sao lưu**: Cài đặt → Dữ liệu → xuất/nhập file JSON. Xoá app khỏi màn hình chính hoặc xoá dữ liệu Safari sẽ mất tiến độ nếu chưa sao lưu.
- Thông báo nhắc học dùng OneSignal Web Push (gói Free), tuỳ chọn.

Đặc tả đầy đủ: [`vocab-app-spec.md`](vocab-app-spec.md).

## Chạy trên máy

Yêu cầu: **Node.js 22.12 trở lên** (Vitest 5 cần `^22.12 || ^24`; Vite 8 cần `^20.19 || >=22.12`) và npm.

```bash
npm install
npm run dev
```

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Dev server (`vite --host`), mở được từ điện thoại cùng mạng LAN qua IP máy tính |
| `npm test` | Unit test (Vitest) |
| `npm run lint` | Lint (oxlint) |
| `npm run build` | Kiểm tra kiểu (`tsc -b`) rồi build ra `dist/` (kèm service worker và manifest) |
| `npm run preview` | Chạy thử bản build trong `dist/` (cũng `--host`) |
| `npm run generate-pwa-assets` | Sinh lại icon PWA trong `public/icons/` từ `public/icons/icon.svg` |

Lưu ý:

- Điện thoại truy cập qua IP LAN (`http://192.168.x.x:5173`) **không phải HTTPS**, nên không cài được PWA đúng nghĩa và không có push. Thử cài đặt và thông báo trên bản đã deploy (HTTPS).
- Muốn thử offline/service worker ở máy: `npm run build` rồi `npm run preview` (dev server không dùng service worker).

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `VITE_ONESIGNAL_APP_ID` | Không | App ID của OneSignal. Để trống: nhắc học chỉ lưu cài đặt trên máy, **không tải bất kỳ mã OneSignal nào** (cả trang lẫn `sw.js`). |

Biến được nhúng vào bản build (cho cả trang và `sw.js`) nên **đổi giá trị thì phải build/deploy lại**. Chạy local: tạo `.env.local` (git bỏ qua), mẫu ở [`.env.example`](.env.example):

```
VITE_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

App ID không phải bí mật (nằm trong JavaScript phía client).

## Deploy lên Cloudflare Pages

1. Đẩy code lên GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git, chọn repo.
3. Cấu hình build:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: để trống
4. Environment variables (Settings → Variables and Secrets):
   - `NODE_VERSION` = `22` (toolchain cần Node 22.12+; ghim để build không phụ thuộc mặc định của build image).
   - `VITE_ONESIGNAL_APP_ID` = App ID của OneSignal (xem mục dưới). Đặt cho **Production**. Chỉ đặt cho **Preview** nếu muốn thử push ở bản preview, và khi đó cần một app OneSignal riêng có Site URL là origin của preview (mỗi app OneSignal chỉ gắn với một origin).
5. Save and Deploy. Từ đó mỗi lần push vào `main` là tự deploy.
6. Đổi biến môi trường xong thì Deployments → Retry deployment (hoặc push commit mới) để build lại.

Đã kiểm tra:

- **Đường dẫn SPA** (`/learn`, `/review`, `/install`, `/?tu=on`...): bản build không có `404.html` ở thư mục gốc, nên Pages tự trả `index.html` cho mọi đường dẫn không có file thật. Không cần `_redirects`. Khi app đã cài, service worker cũng tự trả `index.html` cho điều hướng (`NavigationRoute` trong `src/sw.ts`). **Đừng thêm `404.html`** vào `public/`, nếu không Pages ngừng fallback SPA.
- **Cache của `sw.js`**: Pages mặc định trả static asset với `Cache-Control: public, max-age=0, must-revalidate`, và trình duyệt cũng không dùng HTTP cache cho file service worker chính khi kiểm tra bản mới. Vì vậy không cần file `_headers`; chưa thêm.

## Cấu hình OneSignal

Làm sau khi đã có URL production (`https://<project>.pages.dev` hoặc tên miền riêng). Tên các mục trên dashboard có thể đổi theo thời gian; ý nghĩa vẫn như dưới.

1. **Tạo app**: New App/Website → platform **Web** → cách tích hợp **Typical Site / Custom Code**.
2. **Site URL** = đúng origin production (`https://<project>.pages.dev`, không có đường dẫn). Chỉ bật "Local Testing" nếu cần thử trên `localhost`. Đổi tên miền sau này nghĩa là phải cập nhật Site URL, và người dùng đã đăng ký ở origin cũ phải bật lại.
3. **iPhone**: web app trên màn hình chính (iOS 16.4+) dùng Web Push chuẩn, **không cần chứng chỉ Safari**. Phần cấu hình Safari (desktop) có thể bỏ qua.
4. **Tắt mọi lời nhắc tự động**: auto prompt, slidedown, native prompt, welcome notification và subscription bell. App chỉ xin quyền khi người dùng bấm "Bật nhắc học" (iOS yêu cầu xin quyền từ một cú chạm). Code cũng đã tắt bell và welcome notification trong `init`.
5. **Service worker**: dùng `sw.js` của chính app, scope `/`. Worker của OneSignal được gộp vào bằng `importScripts` (xem `src/sw.ts`). **Không** host `OneSignalSDKWorker.js`. Nếu dashboard hỏi đường dẫn/tên file worker, nhập `sw.js` và scope `/`.
6. **App ID**: copy từ Settings → Keys & IDs, đặt `VITE_ONESIGNAL_APP_ID` trên Cloudflare Pages rồi deploy lại.
7. **Tags**: app tự tạo và cập nhật đúng 6 tag sau, không cần tạo tay:

   | Tag | Giá trị | Ý nghĩa |
   |---|---|---|
   | `nhac_sang` | `1` / `0` | Nhận nhắc buổi sáng |
   | `nhac_trua` | `1` / `0` | Nhận nhắc buổi trưa |
   | `nhac_toi` | `1` / `0` | Nhận nhắc buổi tối |
   | `tu_moi` | ví dụ `resilient` | Từ mới chèn vào thông báo sáng (rỗng thì dùng giá trị `default` của mẫu) |
   | `so_tu_on` | ví dụ `8` | Số từ cần ôn ngày mai |
   | `streak` | ví dụ `12` | Số ngày học liên tiếp |

   Tag chỉ được gửi sau khi người dùng đã bật nhắc học (đã đăng ký push). "Hôm nay đã mở app chưa" dùng bộ lọc **Last Session** có sẵn, không tốn tag.

8. **Message templates** (Messages → New → Push). Chèn tag bằng Liquid. Nên chuẩn bị thêm 2–3 biến thể mỗi khung giờ để luân phiên. Launch URL ghi dưới đây ở dạng đường dẫn; nếu dashboard không nhận đường dẫn tương đối thì nhập URL đầy đủ, ví dụ `https://<project>.pages.dev/?tu=moi`.

   - **Sáng, Từ mới**. Launch URL `/?tu=moi`
     - Tiêu đề: `☀️ Từ mới hôm nay`
     - Nội dung: `{{ tu_moi | default: "Một từ mới" }} nghĩa là gì? Chạm để xem và học thêm 4 từ nữa.`
   - **Trưa, Ôn nhanh**. Launch URL `/?tu=on`
     - Tiêu đề: `🍚 Ôn 2 phút trong giờ nghỉ trưa`
     - Nội dung: `Bạn có {{ so_tu_on | default: "vài" }} từ cần ôn. Làm nhanh trước khi quên nhé!`
   - **Tối, Giữ streak**. Launch URL `/?tu=on`
     - Tiêu đề: `🔥 Đừng để mất chuỗi {{ streak | default: "học" }} ngày!`
     - Nội dung: `Chỉ cần 3 phút ôn tập là giữ được streak hôm nay.`
   - **Lâu không mở app**. Launch URL `/`
     - Tiêu đề: `📚 Lâu rồi không gặp!`
     - Nội dung: `Quay lại ôn 5 từ thôi, chỉ mất 2 phút.`

9. **Journey** (một Journey duy nhất, theo spec mục 6.7):

   ```
   Bắt đầu (re-entry: hằng ngày)
    ├─ Time Window 07:30–07:45 → nếu nhac_sang = 1 → gửi mẫu Sáng
    ├─ Time Window 12:15–12:30 → nếu nhac_trua = 1 → gửi mẫu Trưa
    └─ Time Window 21:00–21:15 → nếu nhac_toi = 1 và chưa mở app hôm nay → gửi mẫu Tối
   Nhánh riêng: Last Session > 3 ngày → gửi mẫu "Lâu không mở app" (tối đa 1 lần/ngày)
   ```

   Bật tuỳ chọn dùng **múi giờ của người dùng** cho Time Window. "Chưa mở app hôm nay" đặt bằng bộ lọc Last Session.

10. **Giới hạn gói Free**: 3 Journeys, 6 Segments, 6 Data Tags. Thiết kế dùng 1 Journey, 0 Segment và đúng 6 tag, tức là **không còn tag dự phòng**: đừng thêm tag khác vào app này.

## Thử trên iPhone

1. Mở link production bằng **Safari**.
2. Share → **Thêm vào Màn hình chính**.
3. Mở app từ icon vừa tạo (push chỉ hoạt động khi mở từ màn hình chính).
4. Cài đặt → Nhắc học → chọn buổi → **Bật nhắc học** → Cho phép.
5. Trên dashboard OneSignal, vào Audience → Subscriptions, tìm đăng ký mới và gửi thông báo test.
6. Bấm vào thông báo: app phải mở đúng màn hình (`/?tu=moi` mở Học, `/?tu=on` mở Ôn tập, `/` mở trang chủ).

Xoá app khỏi màn hình chính rồi cài lại sẽ **mất đăng ký push** (và dữ liệu học nếu chưa sao lưu): phải bật nhắc học lại.

## Gửi cho người học

Gửi link production kèm trang hướng dẫn `https://<project>.pages.dev/install` (cách thêm vào Màn hình chính, bật nhắc học). Nhắc họ **sao lưu dữ liệu** định kỳ ở Cài đặt → Dữ liệu, nhất là trước khi xoá hoặc cài lại app.

## Cấu trúc dự án

```
src/
  app/          router, layout, thanh tab, xử lý deep link ?tu=, hook cài đặt/push
  pages/        các màn hình (Home, Learn, Review, Notebook, Settings, Install...)
  components/   thành phần dùng chung, quiz/ (5 dạng câu hỏi)
  data/         bộ từ vựng JSON đóng gói sẵn
  db/           schema Dexie và các truy vấn (tiến độ, ôn tập, sao lưu...)
  lib/          logic thuần: srs, date, search, speech, backup, notifications...
  sw.ts         service worker (Workbox injectManifest, gộp worker của OneSignal)
public/icons/   icon PWA (nguồn: icon.svg)
```

Mã làm việc với OneSignal nằm trong `src/lib/notifications.ts`; phần phía service worker chỉ là khối `importScripts` ở đầu `src/sw.ts`. Muốn đổi nhà cung cấp thông báo thì viết lại file đầu và khối đó.

## Hạn chế đã biết

- Chưa thử trên iPhone thật: phát âm (Web Speech), âm thanh hiệu ứng, bàn phím, sao lưu qua share sheet và push thật. Nên thử theo mục "Thử trên iPhone" trước khi giao cho người học.
- Thanh tab có 3 mục (Học, Tự học, Bài tập). Chi tiết từ (`/words/*`) sáng tab Tự học với từ tự nhập, ngược lại sáng tab Học.
- Gợi ý khi tự thêm từ dùng Free Dictionary API nên cần mạng; offline vẫn nhập tay được.
