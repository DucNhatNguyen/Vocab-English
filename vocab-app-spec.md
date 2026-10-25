# Đặc tả dự án: Từ Ngày — App học từ vựng tiếng Anh (PWA cho iPhone)

> Tài liệu này tổng hợp các quyết định đã thống nhất, dùng làm đầu vào cho Claude Code triển khai.
> Ngôn ngữ giao diện: **tiếng Việt**. Code, tên biến, comment kỹ thuật: tiếng Anh.

---

## 1. Bối cảnh và ràng buộc

- Người dùng chính dùng **iPhone (iOS 16.4+)**.
- Nhà phát triển chỉ có **máy Windows**, không có Mac.
- Yêu cầu **triển khai miễn phí hoàn toàn**, cho nhiều người dùng (vài người đến vài nghìn).
- Không dùng App Store / TestFlight (cần tài khoản Apple Developer 99 USD/năm).

**Quyết định:** xây dựng **PWA (Progressive Web App)**. Người dùng mở link bằng Safari → *Chia sẻ → Thêm vào Màn hình chính* → app có icon riêng, chạy toàn màn hình, hoạt động offline, nhận thông báo đẩy.

**Mô hình tham khảo:** app **MochiVocab** (Mochidemy). Lấy luồng học cốt lõi: học bài từ mới → ôn tập "Thời điểm vàng" bằng quiz tự chấm → **5 cấp độ nhớ** (đúng lên 1 cấp, sai về cấp 1) → Sổ tay từ vựng theo cấp. Không làm các phần cần server (bảng xếp hạng, cộng đồng).

Các phương án đã cân nhắc và loại bỏ:
- App native qua Xcode + Apple ID miễn phí: cần Mac, app hết hạn sau 7 ngày.
- Flutter + build trên mây + Sideloadly: phải ký lại mỗi 7 ngày, không hợp để phát cho người khác.
- Expo Go: app chạy bên trong Expo Go, mỗi người dùng iOS phải được mời vào team Expo, không hợp phát hành rộng.
- EAS Build / TestFlight: cần tài khoản Apple trả phí.

---

## 2. Tech stack

| Hạng mục | Công cụ | Ghi chú |
|---|---|---|
| Framework | **React + Vite + TypeScript** | |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest, service worker, offline cache |
| Lưu trữ trên máy | **IndexedDB** qua **Dexie.js** | Tiến độ học, lịch ôn, cài đặt |
| Phát âm | **Web Speech API** (`speechSynthesis`) | Có sẵn trong Safari, chọn giọng en-US / en-GB |
| Dữ liệu từ vựng | File **JSON** đóng gói trong app | Tự soạn, chia theo chủ đề và cấp độ |
| Gợi ý khi tự nhập từ | Free Dictionary API (`https://api.dictionaryapi.dev`) | IPA, ví dụ tiếng Anh (không có nghĩa tiếng Việt); cần mạng |
| Thông báo đẩy có lịch | **OneSignal** (Web Push, gói Free) | Không cần server riêng |
| Hosting | **Cloudflare Pages** | Miễn phí, tên miền `*.pages.dev`, HTTPS sẵn |
| Quản lý code | GitHub | Cloudflare Pages tự deploy khi push |

Không cần backend/database server cho MVP. (Tuỳ chọn sau này: Supabase để đồng bộ/sao lưu — lưu ý dự án Free bị tạm dừng sau 7 ngày không hoạt động.)

---

## 3. Chức năng

### 3.1. MVP (phiên bản 1)

**Kho từ vựng**
- Danh sách bộ từ theo **chủ đề** (giao tiếp, du lịch, công việc, IELTS, TOEIC…) và **cấp độ** (A1–C2).
- Mỗi từ: emoji minh hoạ (tuỳ chọn), từ, phiên âm IPA, từ loại, nghĩa tiếng Việt, câu ví dụ (EN + VI).
- Nút phát âm thường và nút **phát âm chậm** 🐌 (Web Speech API).
- Tìm kiếm từ (Anh → Việt, Việt → Anh), **không phân biệt dấu** ("kien cuong" tìm ra "kiên cường"). Tìm cả trong các từ tự nhập (tab Tự học).

**Tự học (người dùng tự nhập từ muốn học)**
- Tab riêng **Tự học** (`/tu-hoc`): các từ tự nhập ("Từ của tôi", id `custom:*`) lưu trong IndexedDB, học và ôn 5 cấp giống hệt từ có sẵn.
- Từ tự nhập được học trong các lượt riêng ("Học ngay", `/learn?nguon=tu-hoc`), mỗi lượt tối đa N từ (N = mục tiêu mỗi ngày), **không giới hạn số lượt trong ngày** (xong lượt có nút "Học tiếp N từ"). Chúng không còn trộn vào bài học hằng ngày và không cộng vào "Hôm nay: x/N từ mới".
- Từ tự nhập tới hạn xuất hiện trong lượt ôn chung ở tab Học, và cả trong lượt riêng "Ôn từ của tôi" (`/review?nguon=tu-hoc`, chỉ gồm từ tự nhập). Học hay ôn ở Tự học đều tính cho chuỗi ngày học và thống kê.
- Màn Tự học: thẻ kính với số từ chưa học, số từ tới hạn ôn, nút "Học ngay" và "Ôn từ của tôi"; nút "Thêm từ"; danh sách từ của tôi có ô tìm trong danh sách.
- Form thêm từ: gõ từ tiếng Anh → app tự gợi ý:
  1. Nếu từ có trong kho sẵn → điền đủ mọi trường.
  2. Nếu không → gọi Free Dictionary API lấy IPA, từ loại, câu ví dụ tiếng Anh (cần mạng; offline thì bỏ qua bước này).
  3. **Nghĩa tiếng Việt** người dùng tự gõ (bắt buộc) nếu kho sẵn không có. Câu ví dụ tiếng Việt, emoji: tuỳ chọn.
- Người dùng sửa được mọi trường trước khi lưu; sửa / xoá từ đã thêm (xoá từ thì xoá luôn tiến độ).
- Không cho thêm trùng: nếu từ đã có trong "Từ của tôi" thì báo và mở từ đó.
- Có thể thêm nhanh từ màn hình Tìm kiếm khi không tìm thấy từ ("Thêm '<từ>' vào Từ của tôi").

**Học từ mới (bài học)**
- Mỗi bài gồm N từ mới, N = mục tiêu mỗi ngày (5 / 10 / 20, người dùng chọn). Lấy lần lượt từ các bộ từ đang chọn (`activeDeckIds`); không lấy từ tự nhập (chúng học ở tab Tự học).
- Bước 1 – Xem thẻ: lần lượt từng từ với emoji, từ, IPA, từ loại, nghĩa, ví dụ EN + VI; tự phát âm khi mở thẻ; nút phát âm thường / chậm.
- Bước 2 – Kiểm tra nhanh: sau khi xem hết, mỗi từ 1 câu chọn nghĩa đúng. Sai thì hỏi lại ở cuối lượt cho đến khi đúng. Bước này không ảnh hưởng cấp độ.
- Kết thúc: các từ vào **cấp 1**, hạn ôn = ngày mai. Hiện màn hình tổng kết.

**Ôn tập "Thời điểm vàng" (5 cấp độ nhớ)** — chức năng quan trọng nhất
- Mỗi từ đã học có cấp 1–5; thuật toán xem mục 5.
- Trang chủ (tab Học) hiện số từ đến hạn hôm nay (gồm cả từ tự nhập) + nút "Ôn tập ngay". Nếu không có từ nào, hiện "Lượt ôn tiếp theo: <ngày>, X từ".
- Một lượt ôn: các từ đến hạn (`dueDate <= hôm nay`, không bị bỏ tick), xáo trộn, tối đa 20 từ; còn thì làm lượt tiếp.
- Mỗi từ 1 câu hỏi, app **tự chấm**. Dạng câu hỏi chọn ngẫu nhiên theo cấp:
  1. Nhìn từ tiếng Anh → chọn nghĩa đúng (4 lựa chọn).
  2. Nghe phát âm → chọn từ đúng (4 lựa chọn).
  3. Điền từ vào chỗ trống trong câu ví dụ (4 lựa chọn).
  4. Nhìn nghĩa tiếng Việt → gõ từ tiếng Anh.
  5. Nghe phát âm → gõ lại từ.
  - Cấp 1–2: dạng 1, 2, 3. Cấp 3: dạng 1–5. Cấp 4–5: dạng 3, 4, 5.
- Chỉ **lần trả lời đầu tiên** của mỗi từ trong lượt được tính để lên/xuống cấp. Từ trả lời sai được hỏi lại ở cuối lượt (không tính lại).
- Sau mỗi câu: hiện đúng/sai, đáp án đúng, phát âm, nút "Tiếp".
- Câu gõ từ: so khớp không phân biệt hoa thường, bỏ khoảng trắng thừa.
- Kết thúc lượt: tổng kết số từ lên cấp / về cấp 1.

**Sổ tay từ vựng**
- Danh sách tất cả từ đã học, lọc theo cấp 1–5, có tìm kiếm.
- **Bỏ tick** một từ → không đưa vào ôn tập nữa, giữ nguyên cấp. Tick lại → ôn bình thường.
- Đánh dấu yêu thích (cả với từ chưa học, từ màn hình Kho từ vựng), lọc theo yêu thích.

**Thống kê** (tóm tắt trên Trang chủ, chi tiết ở trang Thống kê)
- Biểu đồ cột số từ ở mỗi cấp 1–5.
- Số từ đã học, số từ đã thuộc (cấp 5).
- Chuỗi ngày học liên tiếp (streak): một ngày được tính khi hoàn thành ít nhất 1 bài học hoặc 1 lượt ôn.
- Tỷ lệ trả lời đúng.

**Cài đặt**
- Mục tiêu mỗi ngày.
- Giọng phát âm (Anh–Mỹ / Anh–Anh), tốc độ đọc.
- Hiệu ứng âm thanh đúng/sai: bật/tắt.
- Giao diện sáng / tối (theo hệ thống mặc định).
- **Nhắc học**: bật/tắt từng khung giờ Sáng / Trưa / Tối (xem mục 6).
- **Sao lưu**: xuất / nhập toàn bộ dữ liệu ra file JSON (vì Safari có thể xoá dữ liệu nếu lâu không dùng). Khi khởi động, gọi `navigator.storage.persist()` để giảm nguy cơ bị xoá.

**Hướng dẫn cài đặt**
- Trang "Cài app lên iPhone": hướng dẫn có hình minh hoạ thao tác *Chia sẻ → Thêm vào Màn hình chính*.
- Phát hiện nếu đang mở trong Safari thường (chưa cài) thì hiện banner gợi ý cài, và giải thích rằng thông báo chỉ hoạt động sau khi cài.

### 3.2. Phiên bản 2 (sau MVP)
- Gamification: khu vườn kiểu Mochi Garden (mỗi ngày đạt mục tiêu trồng thêm 1 cây), huy hiệu, linh vật.
- Từ điển tra từ ngoài kho (nghĩa tiếng Việt) và lưu vào Sổ tay để ôn.
- Hình minh hoạ thật thay cho emoji.
- **Bài tập (chưa triển khai):** tab thứ ba của thanh điều hướng, hiện màn "Sắp ra mắt". Dự kiến: người dùng nhập tài liệu của mình (bài đọc, đề, ghi chú) và làm bài tập từ đó.
- Nhiều bộ từ tự tạo (ngoài từ tự nhập ở Tự học), nhập hàng loạt từ file CSV.
- Bài kiểm tra đầu vào xác định trình độ.
- Đồng bộ đa thiết bị (Supabase).

### 3.3. Phiên bản 3 (nâng cao)
- Luyện phát âm (ghi âm + nhận dạng giọng nói).
- AI giải thích cách dùng từ, chấm câu người dùng tự đặt.
- Từ đồng nghĩa / trái nghĩa, collocation, word family.
- Chuyển sang app iOS native (Capacitor hoặc viết lại bằng Expo) khi có tài khoản Apple Developer.

---

## 4. Mô hình dữ liệu

### 4.1. Dữ liệu từ vựng tĩnh (JSON trong `src/data/`)

```ts
interface Deck {
  id: string;            // "ielts-environment"
  name: string;          // "IELTS – Môi trường"
  topic: string;         // "ielts"
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  wordIds: string[];
}

interface Word {
  id: string;            // "resilient"
  word: string;          // "resilient"
  emoji?: string;        // "💪"
  ipa: string;           // "/rɪˈzɪl.i.ənt/"
  pos: string;           // "adj"
  meaningVi: string;     // "kiên cường, mau phục hồi"
  exampleEn: string;
  exampleVi: string;
  level: string;
  topics: string[];
}
```

Cần tạo sẵn dữ liệu mẫu: ít nhất 3–5 bộ từ, mỗi bộ 20–30 từ.

### 4.2. Dữ liệu người dùng (IndexedDB / Dexie)

```ts
interface CardProgress {
  wordId: string;        // primary key
  level: 0 | 1 | 2 | 3 | 4 | 5;  // 0 = chưa học (bản ghi tồn tại chỉ vì được yêu thích)
  dueDate?: string;      // ngày địa phương "2026-10-25"; không có khi level = 0
  learnedAt?: string;    // ngày địa phương
  lastReviewedAt?: string;
  correctCount: number;
  wrongCount: number;
  favorite: boolean;
  ignored: boolean;      // bỏ tick trong Sổ tay → không ôn
}

// Từ người dùng tự nhập. Cùng cấu trúc với Word; id dạng "custom:<uuid>"
// để không trùng id với từ có sẵn. CardProgress dùng chung cho cả hai loại.
interface CustomWord extends Word {
  createdAt: string;     // ngày địa phương
}

interface StudyLog {
  id?: number;
  date: string;          // "2026-10-24"
  newLearned: number;
  reviewed: number;
  correct: number;
  wrong: number;
}

interface Settings {
  dailyGoal: number;                 // 5 | 10 | 20
  voice: "en-US" | "en-GB";
  speechRate: number;                // 0.8 – 1.2
  soundEffects: boolean;
  theme: "system" | "light" | "dark";
  reminders: { morning: boolean; noon: boolean; evening: boolean };
  activeDeckIds: string[];
}
```

---

## 5. Thuật toán SRS (5 cấp độ nhớ, kiểu MochiVocab)

```
INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

học xong từ mới:            level = 1
trả lời đúng (lần đầu):     level = min(level + 1, 5)
trả lời sai (lần đầu):      level = 1

dueDate = hôm nay + INTERVAL_DAYS[level]
```

- Ôn trễ hạn vẫn tính như trên, không phạt thêm.
- "Đã thuộc" = cấp 5. Từ cấp 5 trả lời đúng vẫn ở cấp 5, ôn lại sau 30 ngày.
- `INTERVAL_DAYS` là hằng số, dễ chỉnh sau này.
- **Ngày luôn tính theo giờ địa phương** (helper trong `src/lib/date.ts`), không dùng `toISOString()` vì sẽ lệch ngày với múi giờ UTC+7.

Viết thành hàm thuần (pure function) trong `src/lib/srs.ts` và có unit test (Vitest).

---

## 6. Thông báo nhắc học (OneSignal Web Push)

### 6.1. Nguyên tắc
- Dữ liệu học nằm trong app. **OneSignal chỉ biết các tag do app gửi lên.**
- Mỗi khi người dùng học xong hoặc đổi cài đặt nhắc, app cập nhật tag.
- Đến giờ, OneSignal Journey tự gửi thông báo, chèn giá trị tag vào nội dung.
- Không cần server, không cần cron riêng.

### 6.2. Điều kiện trên iPhone
- iOS 16.4+, app **đã thêm vào Màn hình chính**.
- Xin quyền thông báo **chỉ khi người dùng bấm nút** "Bật nhắc học" (iOS không cho tự bật hộp thoại).
- Nếu người dùng xoá app khỏi màn hình chính → mất đăng ký, phải bật lại.

### 6.3. Giới hạn gói Free của OneSignal (đã kiểm tra 10/2026)
- Web push: không giới hạn số người đăng ký và số thông báo; tối đa **10.000 người nhận mỗi lần gửi**.
- Giới hạn 1.000 MAU của gói Free **chỉ áp dụng cho mobile push**, không ảnh hưởng web push.
- Gói Free: **3 Journeys, 6 Segments, 6 Data Tags** → phải thiết kế gọn.
- 3–4 thông báo/ngày cho mỗi người: miễn phí, không thời hạn.
- Điều khoản có thể thay đổi → giữ code gửi/nhận thông báo trong một module riêng (`src/lib/notifications.ts`) để dễ thay nhà cung cấp.

### 6.4. Thiết kế tag (tối đa 6)

| Tag | Giá trị ví dụ | Mục đích |
|---|---|---|
| `nhac_sang` | `"1"` / `"0"` | Nhận nhắc buổi sáng |
| `nhac_trua` | `"1"` / `"0"` | Nhận nhắc buổi trưa |
| `nhac_toi` | `"1"` / `"0"` | Nhận nhắc buổi tối |
| `tu_moi` | `"resilient"` | Từ mới chèn vào thông báo sáng |
| `so_tu_on` | `"8"` | Số từ cần ôn (ngày mai) |
| `streak` | `"12"` | Số ngày học liên tiếp |

"Hôm nay đã mở app chưa" → dùng bộ lọc **Last Session** có sẵn của OneSignal, không tốn tag.

### 6.5. Khi nào cập nhật tag
- Kết thúc mỗi buổi học / ôn tập.
- Khi mở app.
- Khi người dùng đổi cài đặt nhắc học.
- Luôn **chọn trước từ cho lần nhắc tiếp theo** (vì thông báo đến lúc app đang đóng).

```ts
// src/lib/notifications.ts
export async function syncNotificationTags() {
  const nextWord = await getNextNewWord();
  const dueTomorrow = await countDueCards(tomorrow());
  const streak = await getStreak();
  await OneSignal.User.addTags({
    tu_moi: nextWord?.word ?? "",
    so_tu_on: String(dueTomorrow),
    streak: String(streak),
  });
}

export async function saveReminderSchedule(r: { morning: boolean; noon: boolean; evening: boolean }) {
  await OneSignal.User.addTags({
    nhac_sang: r.morning ? "1" : "0",
    nhac_trua: r.noon ? "1" : "0",
    nhac_toi: r.evening ? "1" : "0",
  });
}
```

### 6.6. Mẫu nội dung thông báo (cấu hình trên dashboard OneSignal)

Chèn tag bằng cú pháp Liquid `{{ ten_tag | default: "..." }}`. Chuẩn bị 2–3 biến thể mỗi khung giờ để luân phiên.

**Sáng (7:30) – Từ mới** — Launch URL: `/?tu=moi`
- Tiêu đề: `☀️ Từ mới hôm nay`
- Nội dung: `{{ tu_moi | default: "Một từ mới" }} nghĩa là gì? Chạm để xem và học thêm 4 từ nữa.`

**Trưa (12:15) – Ôn nhanh** — Launch URL: `/?tu=on`
- Tiêu đề: `🍚 Ôn 2 phút trong giờ nghỉ trưa`
- Nội dung: `Bạn có {{ so_tu_on | default: "vài" }} từ cần ôn. Làm nhanh trước khi quên nhé!`

**Tối (21:00) – Giữ streak** (chỉ gửi nếu hôm nay chưa mở app) — Launch URL: `/?tu=on`
- Tiêu đề: `🔥 Đừng để mất chuỗi {{ streak | default: "học" }} ngày!`
- Nội dung: `Chỉ cần 3 phút ôn tập là giữ được streak hôm nay.`

**Lâu không mở app** (Last Session > 3 ngày, không dùng tag vì có thể đã cũ) — Launch URL: `/`
- Tiêu đề: `📚 Lâu rồi không gặp!`
- Nội dung: `Quay lại ôn 5 từ thôi, chỉ mất 2 phút.`

### 6.7. Cấu hình Journey (1 Journey duy nhất, cho phép vào lại hằng ngày)

```
Bắt đầu (re-entry: hằng ngày)
 ├─ Time Window 07:30–07:45 (giờ người dùng) → nếu nhac_sang = 1 → gửi mẫu Sáng
 ├─ Time Window 12:15–12:30                  → nếu nhac_trua = 1 → gửi mẫu Trưa
 └─ Time Window 21:00–21:15                  → nếu nhac_toi = 1 và chưa mở app hôm nay → gửi mẫu Tối
Nhánh riêng: Last Session > 3 ngày → gửi mẫu "Lâu không mở app" (tối đa 1 lần/ngày)
```

Bật tuỳ chọn dùng **múi giờ của người dùng** cho Time Window.

### 6.8. Xử lý khi bấm thông báo
- App đọc query param `tu`:
  - `moi` → mở màn hình Học từ mới.
  - `on` → mở màn hình Ôn tập.
- Nội dung hiển thị lấy từ dữ liệu trên máy (luôn mới nhất, kể cả khi tag đã cũ).

### 6.9. Lưu ý kỹ thuật
- OneSignal Web SDK mặc định dùng file service worker riêng (`OneSignalSDKWorker.js`). **Đã chọn gộp vào service worker của app**: `src/sw.ts` (chế độ `injectManifest`, build dạng `iife`) gọi `importScripts` SDK worker của OneSignal ở cấp đầu file; khởi tạo OneSignal với `serviceWorkerPath: "sw.js"`, scope `/`. Không cần file `OneSignalSDKWorker.js`.
- Khởi tạo OneSignal với `appId` lấy từ biến môi trường `VITE_ONESIGNAL_APP_ID`.
- Không đưa thông tin nhạy cảm vào tag.

---

## 7. Cấu trúc thư mục đề xuất

```
src/
  app/                 # router, layout
  pages/
    Home.tsx           # tổng quan hôm nay: từ mới, từ cần ôn, streak
    Learn.tsx          # bài học từ mới: xem thẻ + kiểm tra nhanh
    Review.tsx         # ôn tập "Thời điểm vàng"
    Notebook.tsx       # sổ tay từ vựng theo cấp
    SelfStudy.tsx      # tab Tự học: thẻ Học ngay / Ôn từ của tôi + danh sách từ tự nhập
    Exercises.tsx      # tab Bài tập (chưa triển khai: "Sắp ra mắt")
    my-words/          # form thêm/sửa từ tự nhập, danh sách từ
    Decks.tsx          # danh sách bộ từ
    WordDetail.tsx
    Search.tsx
    Stats.tsx
    Settings.tsx       # mục tiêu, giọng đọc, nhắc học, sao lưu
    InstallGuide.tsx   # hướng dẫn thêm vào màn hình chính
  components/
    quiz/              # 5 dạng câu hỏi
  data/                # JSON bộ từ
  db/                  # Dexie schema
  lib/
    date.ts            # ngày theo giờ địa phương
    dictionary.ts      # gợi ý từ kho sẵn + Free Dictionary API
    srs.ts
    speech.ts
    notifications.ts
    backup.ts
public/
  icons/               # icon PWA 192, 512, maskable, apple-touch-icon 180 (nguồn: icon.svg)
```

---

## 8. Yêu cầu giao diện
- Thiết kế **mobile-first**, tối ưu cho iPhone; tôn trọng safe area (notch, home indicator) bằng `env(safe-area-inset-*)`.
- Thanh điều hướng dưới có 3 mục: **Học** (Trang chủ) / **Tự học** / **Bài tập**. Tìm kiếm và Cài đặt là hai nút icon ở góc trên Trang chủ; Sổ tay, Thống kê, Bộ từ vựng là lối tắt trên Trang chủ. Chi tiết từ sáng tab Tự học nếu là từ tự nhập, ngược lại sáng tab Học.
- Nút bấm lớn, dễ chạm bằng một tay.
- Hỗ trợ chế độ tối.
- Manifest: `display: "standalone"`, có `apple-touch-icon`, `theme_color`, `name` / `short_name`: **"Từ Ngày"**.

### 8.1. Định hướng thiết kế: "Kính lỏng" (liquid glass)

- **Ý tưởng:** giao diện sáng, nhẹ như kính mờ nổi trên nền pastel; nút bấm to, "mập" kiểu MochiVocab để học vui và dễ chạm. Tránh kiểu app học ngôn ngữ chung chung (linh vật, thẻ icon–tiêu đề–mô tả lặp lại) và tránh làm kính nặng nề, khó đọc.
- **Màu (chế độ sáng):** nền gần trắng `#f7f8ff` với lưới màu pastel mờ (tím lavender, hồng, xanh trời, bạc hà) vẽ trên một lớp cố định. Thẻ và thanh là **kính mờ** (nền trắng trong suốt, `backdrop-filter` blur + bão hoà, viền sáng, bóng nhẹ). **Xanh chàm** `#2558e6` là màu nhấn (số lớn, tiêu đề, từ vựng), **tím** `#6a4cf0` làm cặp với xanh trong dải gradient (thanh tiến độ, biểu đồ, ô tab đang chọn). Xanh lá cho đáp án đúng. Chữ thân màu mực đậm `#1d2340`.
- **Màu (chế độ tối):** **kính đêm** – nền xanh đen `#0d1024` với lưới màu tím, hồng, xanh dịu; thẻ là kính trắng mờ 8%, chữ gần trắng, màu nhấn sáng hơn (xanh `#8fb4ff`, tím `#b39dff`). Mọi cặp chữ/nền, kể cả chữ trên kính ở vùng lưới màu đậm nhất và chữ trên huy hiệu, đạt tương phản ≥ 4.5:1 (chữ lớn ≥ 3:1).
- **Nút bấm "mập":** nút chính (`primary`, xanh), `success` (xanh lá, nút "Tiếp" sau câu trả lời đúng), `danger` (đỏ, xác nhận xoá/thoát) là khối màu đặc có "gờ" tối hơn cùng tông ở cạnh dưới (`box-shadow` 4px), nhấn xuống thì gờ biến mất và nút lún 4px; `ghost` là nút trắng viền nhạt. Chiều cao ≥ 52px, vùng chạm ≥ 44px. Chip, ô lựa chọn và nút tròn dùng cùng ngôn ngữ nhưng gờ mỏng hơn; blur chỉ đặt trên vùng lớn (thẻ, thanh, hộp thoại), không đặt trên từng dòng hay chip.
- **Huy hiệu icon:** icon luôn nằm trong ô vuông bo tròn pastel (xanh, tím, hồng, cam, xanh lá) với icon `lucide-react` đậm màu cùng tông; dùng cho dòng cài đặt, lối tắt, trạng thái rỗng, màn tổng kết. Không dùng emoji làm icon giao diện; emoji chỉ làm hình minh hoạ cho từ vựng.
- **Thanh tab nổi:** thanh trắng bo tròn lớn, cách mép dưới, bóng đổ mềm; tab đang chọn là ô gradient pastel (lavender → xanh trời) với icon và nhãn màu xanh đậm. Ảnh tham chiếu: `docs/mockups/glass/reference-tabbar.png`. Nội dung cuối mỗi trang phải chừa chỗ cho thanh này.
- **Chữ:** *Be Vietnam Pro* cho giao diện và nội dung (hỗ trợ tiếng Việt đầy đủ), số dùng chữ số đều nét (`tabular-nums`). Font viết tay có hỗ trợ tiếng Việt (*Patrick Hand*) chỉ dùng cho nét "bút đỏ" khi chấm bài (lời chấm, đáp án sửa). Tự host font qua `@fontsource` để chạy offline.
- **Bút đỏ chỉ để chấm:** bút đỏ chỉ còn dùng cho dấu tích cấp độ (1–5 dấu ✓ ở "Sổ điểm", Sổ tay, Thống kê) và khoảnh khắc chấm bài. Đúng là màu xanh lá; sai là gạch đỏ kèm đáp án viết tay.
- **Khoảnh khắc đặc trưng:** khi trả lời đúng, nét tích xanh lá được "vẽ" ra (animation stroke) kèm âm thanh. Khi sai, bút đỏ gạch đáp án sai và viết đáp án đúng bên cạnh bằng chữ viết tay. Tôn trọng `prefers-reduced-motion`.
- **Trang chủ:** dòng ngày + viên streak (ngọn lửa cam), thẻ kính "Đến giờ ôn rồi! – X từ đang chờ" với số xanh lớn và nút chính, thẻ bài mới có huy hiệu tím và thanh tiến độ gradient, "Sổ điểm" 5 cấp, ba lối tắt (Sổ tay / Thống kê / Bộ từ vựng) dạng ô có huy hiệu; góc trên phải có viên streak và hai nút tròn Tìm kiếm, Cài đặt (≥ 44px).
- **Rủi ro cần tránh:** kính chồng kính làm chữ khó đọc và máy chậm. Mỗi vùng lớn chỉ một lớp blur; luôn có nền đặc dự phòng khi không hỗ trợ `backdrop-filter`.
- **Quy trình:** trước khi code từng màn hình chính (Trang chủ, Học, Ôn tập), dựng ảnh mẫu ở kích thước iPhone (390×844, có safe area). Sau đó code khớp ảnh, chụp lại bản chạy thật để so sánh và sửa.

---

## 9. Triển khai (miễn phí)

1. Tạo repo GitHub, đẩy code lên.
2. **Cloudflare Pages**: kết nối repo, build command `npm run build`, output `dist`. Mỗi lần push là tự deploy.
3. **OneSignal**:
   - Tạo app loại Web, nhập URL site (`https://<ten-app>.pages.dev`).
   - Lấy App ID → đặt biến môi trường `VITE_ONESIGNAL_APP_ID` trên Cloudflare Pages.
   - Tạo các mẫu thông báo (mục 6.6) và Journey (mục 6.7).
4. Thử trên iPhone: mở link bằng Safari → Thêm vào Màn hình chính → mở app → Cài đặt → Bật nhắc học → kiểm tra nhận thông báo test từ dashboard OneSignal.
5. Gửi link + trang hướng dẫn cài đặt cho người dùng.

---

## 10. Thứ tự triển khai đề xuất cho Claude Code

1. Khởi tạo dự án Vite + React + TS + vite-plugin-pwa, cấu hình manifest, icon, offline.
2. Dexie schema + dữ liệu từ vựng mẫu.
3. Thuật toán SRS 5 cấp + helper ngày địa phương + unit test.
4. Màn hình Bộ từ, Chi tiết từ, Tìm kiếm, Phát âm (thường / chậm).
5. Bài học từ mới (xem thẻ + kiểm tra nhanh).
6. Ôn tập "Thời điểm vàng" với 5 dạng câu hỏi + Sổ tay từ vựng.
6b. Tự học ("Từ của tôi"): form thêm/sửa từ, gợi ý tự động, lượt học và ôn riêng.
6c. Thanh điều hướng 3 mục (Học / Tự học / Bài tập), tab Bài tập "Sắp ra mắt".
7. Thống kê (biểu đồ cấp độ) + streak.
8. Cài đặt + sao lưu/khôi phục JSON.
9. Trang hướng dẫn cài lên iPhone + banner phát hiện chưa cài.
10. Tích hợp OneSignal: gộp service worker, nút bật nhắc học, đồng bộ tag, xử lý deep link `?tu=`.
11. Viết README hướng dẫn chạy local, deploy Cloudflare Pages và cấu hình OneSignal.

## 11. Tiêu chí hoàn thành MVP
- Cài được lên iPhone qua Safari, mở toàn màn hình, có icon.
- Dùng được khi mất mạng (trừ thông báo).
- Học từ mới, ôn tập 5 cấp bằng quiz, Sổ tay hoạt động và lưu tiến độ sau khi đóng app.
- Tự thêm từ ở tab Tự học (có gợi ý khi có mạng, nhập tay khi offline) và học/ôn được các từ đó.
- Xuất/nhập dữ liệu JSON hoạt động.
- Bật nhắc học → nhận được thông báo đúng khung giờ, bấm vào mở đúng màn hình.
