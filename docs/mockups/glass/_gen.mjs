// Generates mockup.html from lucide icons (run: node docs/mockups/glass/_gen.mjs)
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync } from 'node:fs'
import * as L from 'lucide-react'

const ic = (C, size = 22, sw = 2, extra = {}) =>
  renderToStaticMarkup(createElement(C, { size, strokeWidth: sw, 'aria-hidden': 'true', ...extra }))

const tabs = [
  ['Trang chủ', L.House, true],
  ['Học', L.GraduationCap],
  ['Ôn tập', L.BookOpen],
  ['Sổ tay', L.NotebookPen],
  ['Cài đặt', L.Settings],
]
const tab = ([label, C, active]) =>
  `<a class="tabbar__item"${active ? ' aria-current="page"' : ''}>${ic(C, 22, active ? 2.25 : 2)}<span>${label}</span></a>`

const ticks = (n) => `<span class="ticks" role="img" aria-label="Cấp ${n}/5">${Array.from({ length: n }, () => ic(L.Check, 16, 3)).join('')}</span>`
const levels = [12, 8, 6, 3, 1]
const rows = levels.map((c, i) => `<li>${ticks(i + 1)}<span class="scores__bar" aria-hidden="true"><span style="--p:${c / 12}"></span></span><span class="scores__count"><strong>${c}</strong> từ</span></li>`).join('')

const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mockup - Trang chủ (liquid glass)</title>
${['400','500','600','700'].flatMap(w => ['latin','latin-ext','vietnamese'].map(s => `<link rel="stylesheet" href="../../../node_modules/@fontsource/be-vietnam-pro/${s}-${w}.css">`)).join('\n')}
<link rel="stylesheet" href="../../../src/index.css">
<link rel="stylesheet" href="../../../src/app/layout.css">
<link rel="stylesheet" href="../../../src/components/components.css">
<link rel="stylesheet" href="mockup.css">
<script>
  // ?dark forces the night theme
  if (location.search.indexOf('dark') >= 0) document.documentElement.setAttribute('data-theme', 'dark')
  else if (location.search.indexOf('light') >= 0) document.documentElement.setAttribute('data-theme', 'light')
</script>
</head><body>
<div class="app"><main class="app-main"><div class="home">
<header class="home-head"><h1 class="home-head__date">Thứ Bảy, 24/10</h1>
<p class="streak streak--done">${ic(L.Flame, 22, 2.25)}<span class="visually-hidden">Chuỗi ngày học liên tiếp:</span><span class="streak__num">12</span><span class="streak__unit">ngày</span></p></header>
<section class="home-review glass"><h2 class="home-review__title">Đến giờ ôn rồi!</h2>
<p class="home-review__count"><span class="home-review__num">12</span><span class="home-review__unit">từ đang chờ</span></p>
<a class="btn btn--primary home-review__go">${ic(L.Play, 20, 2.25)}Ôn tập ngay</a></section>
<section class="home-lesson glass"><span class="icon-badge icon-badge--violet">${ic(L.GraduationCap, 22, 2.25)}</span><div class="home-lesson__main"><p class="home-lesson__title">Bài mới: <strong>10 từ</strong></p>
<p class="home-lesson__sub">Hôm nay: 4/10 từ mới</p></div>
<a class="btn btn--ghost home-lesson__go">Học ngay</a>
<div class="meter" role="progressbar" aria-label="Từ mới hôm nay" aria-valuemin="0" aria-valuemax="10" aria-valuenow="4"><div class="meter__fill" style="--p:0.4"></div></div></section>
<section class="home-scores"><div class="home-scores__head"><h2 class="label">Sổ điểm</h2></div>
<div class="sheet"><a class="home-scores__link"><ul class="scores ruled">${rows}</ul><span class="home-scores__more"><span>Xem thống kê</span>${ic(L.ChevronRight, 18)}</span></a>
<nav class="home-links" aria-label="Lối tắt">
<a><span class="icon-badge icon-badge--blue">${ic(L.Library, 22, 2.25)}</span>Bộ từ vựng</a>
<a><span class="icon-badge icon-badge--pink">${ic(L.Search, 22, 2.25)}</span>Tìm kiếm</a>
<a><span class="icon-badge icon-badge--orange">${ic(L.PenLine, 22, 2.25)}</span>Từ của tôi</a></nav></div></section>
</div></main>
<nav class="tabbar" aria-label="Điều hướng chính">${tabs.map(tab).join('')}</nav></div>
</body></html>
`
writeFileSync(new URL('./mockup.html', import.meta.url), html)

// --- components.html: buttons, badges, chips, fields (visual target for shared components)
const head = html.slice(0, html.indexOf('</head>')).replace('Trang chủ (liquid glass)', 'Thành phần (liquid glass)')
const badge = (c, I) => `<span class="icon-badge icon-badge--${c}">${ic(I, 22, 2.25)}</span>`
const comp = `${head}</head><body><div class="app"><main class="app-main"><div class="home">
<section class="glass comp-card"><h2 class="label">Nút</h2>
<div class="comp-col"><button class="btn btn--primary">${ic(L.Play, 20, 2.25)}Ôn tập ngay</button>
<button class="btn btn--success">Đúng rồi, tiếp</button>
<button class="btn btn--danger">Xóa từ này</button>
<button class="btn btn--ghost">Để sau</button>
<div class="comp-row"><button class="icon-btn icon-btn--filled" aria-label="Phát âm">${ic(L.Volume2, 22, 2.25)}</button><button class="icon-btn icon-btn--soft" aria-label="Phát âm chậm">${ic(L.Snail, 22, 2.25)}</button><button class="icon-btn" aria-label="Quay lại">${ic(L.ArrowLeft, 22)}</button><button class="btn btn--primary" disabled>Tắt</button></div></div></section>
<section class="glass comp-card"><h2 class="label">Icon badge</h2><div class="comp-row">
${badge('blue', L.Library)}${badge('violet', L.GraduationCap)}${badge('pink', L.Heart)}${badge('orange', L.Flame)}${badge('green', L.Check)}</div></section>
<section class="glass comp-card"><h2 class="label">Ô nhập, lựa chọn, chip</h2>
<input class="input" placeholder="Nhập nghĩa của từ" />
<div class="segmented" style="margin-top:12px"><label class="segmented__item"><input type="radio" name="s" class="segmented__input" checked><span class="segmented__label">Hệ thống</span></label><label class="segmented__item"><input type="radio" name="s" class="segmented__input"><span class="segmented__label">Sáng</span></label><label class="segmented__item"><input type="radio" name="s" class="segmented__input"><span class="segmented__label">Tối</span></label></div>
<div class="comp-row" style="margin-top:12px"><span class="chip">Động từ</span><span class="chip chip--mine">Của tôi</span><input type="checkbox" class="switch" checked><input type="checkbox" class="switch"></div></section>
</div></main></div></body></html>`
writeFileSync(new URL('./components.html', import.meta.url), comp)
