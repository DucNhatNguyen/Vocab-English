// Generates the Bài tập mockups (run: node docs/mockups/exercises/_gen.mjs)
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, writeFileSync } from 'node:fs'
import * as L from 'lucide-react'

const ic = (C, size = 22, sw = 2) => renderToStaticMarkup(createElement(C, { size, strokeWidth: sw, 'aria-hidden': 'true' }))
const pt01 = JSON.parse(readFileSync(new URL('../../../src/data/exercises/practice-test-01.json', import.meta.url), 'utf8'))
const section = (id) => pt01.sections.find((s) => s.id === id)
const paras = (text) => text.split('\n\n').map((p) => `<p>${p}</p>`).join('')

const head = (title) => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mockup - ${title}</title>
${['400', '500', '600', '700'].flatMap((w) => ['latin', 'latin-ext', 'vietnamese'].map((s) => `<link rel="stylesheet" href="../../../node_modules/@fontsource/be-vietnam-pro/${s}-${w}.css">`)).join('\n')}
${['latin', 'latin-ext', 'vietnamese'].map((s) => `<link rel="stylesheet" href="../../../node_modules/@fontsource/patrick-hand/${s}-400.css">`).join('\n')}
<link rel="stylesheet" href="../../../src/index.css">
<link rel="stylesheet" href="../../../src/app/layout.css">
<link rel="stylesheet" href="../../../src/components/components.css">
<link rel="stylesheet" href="../../../src/components/quiz/quiz.css">
<link rel="stylesheet" href="../../../src/pages/pages.css">
<link rel="stylesheet" href="mockup.css">
<script>
  if (location.search.indexOf('dark') >= 0) document.documentElement.setAttribute('data-theme', 'dark')
  else document.documentElement.setAttribute('data-theme', 'light')
</script>
</head><body>`

const tabbar = `<nav class="tabbar" aria-label="Điều hướng chính">
<a class="tabbar__item">${ic(L.GraduationCap)}<span>Học</span></a>
<a class="tabbar__item">${ic(L.PencilLine)}<span>Tự học</span></a>
<a class="tabbar__item" aria-current="page"><span class="tabbar__tile" aria-hidden="true"></span>${ic(L.ClipboardList, 22, 2.25)}<span>Bài tập</span></a></nav>`

const tabPage = (title, label, body) => `${head(title)}<div class="app"><main class="app-main">
<header class="topbar"><h1 class="topbar__title">Bài tập</h1></header>
<div class="page ex-page">${body}</div></main>${tabbar}</div></body></html>`

const sessionPage = (title, label, count, p, body, bar = '') => `${head(title)}<div class="app app--immersive"><main class="app-main"><div class="session">
<header class="session__top"><button class="icon-btn" aria-label="Thoát">${ic(L.X, 24)}</button>
<div class="session__progress" role="progressbar" aria-valuemin="0" aria-valuemax="50" aria-valuenow="${count}"><div class="session__progress-fill" style="width:${p * 100}%"></div></div>
<span class="session__count">${count}/50</span></header>
<div class="session__body">${body}</div>${bar}</div></main></div></body></html>`

// ---------- Tab Bài tập
const rowsA = [
  ['1', 'Practice Test 1', '50 câu · 6 phần', '<span class="ex-row__score"><strong>42/50</strong><span>cao nhất</span></span>'],
  ['2', 'Practice Test 2', '50 câu · 6 phần', '<span class="ex-row__score"><strong>37/50</strong><span>cao nhất</span></span>'],
  ['3', 'Practice Test 3', '50 câu · 6 phần', '<span class="ex-row__score ex-row__score--doing"><strong>18/50</strong><span>đang làm</span></span>'],
  ['4', 'Practice Test 4', '50 câu · 6 phần', '<span class="ex-status ex-status--new">Chưa làm</span>'],
  ['5', 'Practice Test 5', '50 câu · 6 phần', '<span class="ex-status ex-status--new">Chưa làm</span>'],
]
  .map(([n, name, meta, right]) => `<li><a class="ex-row"><span class="ex-num">${n}</span><span class="ex-row__main"><span class="ex-row__name">${name}</span><br><span class="ex-row__meta">${meta}</span></span>${right}${ic(L.ChevronRight, 18)}</a></li>`)
  .join('')

writeFileSync(new URL('./list.html', import.meta.url), tabPage('Bài tập', 'A · Danh sách theo nhóm', `
<section class="ex-continue glass">
  <p class="ex-continue__kicker"><span class="icon-badge icon-badge--violet icon-badge--sm">${ic(L.ClipboardList, 18, 2.25)}</span>Đang làm dở</p>
  <p class="ex-continue__title">Practice Test 3</p>
  <p class="ex-continue__sub">Câu 18/50 · Paper 2 · Hoàn thành câu</p>
  <div class="ex-meter" aria-hidden="true"><span style="--p:0.36"></span></div>
  <a class="btn btn--primary">${ic(L.Play, 20, 2.25)}Làm tiếp</a>
</section>
<a class="ex-retry glass"><span class="icon-badge icon-badge--pink">${ic(L.RotateCcw, 22, 2.25)}</span><span class="ex-retry__main"><span class="ex-retry__title">Làm lại câu sai</span><br><span class="ex-retry__sub">12 câu từ 2 đề</span></span>${ic(L.ChevronRight, 18)}</a>
<h2 class="ex-label">Đề luyện tập · 10</h2>
<ul class="sheet ruled">${rowsA}</ul>
<h2 class="ex-label">Ngữ pháp · 3</h2>
<ul class="sheet ruled"><li><a class="ex-row"><span class="ex-num">1</span><span class="ex-row__main"><span class="ex-row__name">Grammar Practice 1</span><br><span class="ex-row__meta">20 câu</span></span><span class="ex-status ex-status--new">Chưa làm</span>${ic(L.ChevronRight, 18)}</a></li></ul>`))

// ---------- Reading question: clamped passage above the question
const read1 = section('pt01-p1b-1')
const q12 = read1.questions.find((q) => q.number === 12)
const choices = (q) => `<div class="choices">${q.options.map((o) => `<div class="choice-item"><button class="choice"><span class="choice__text">${o}</span></button></div>`).join('')}</div>`

writeFileSync(new URL('./reading.html', import.meta.url), sessionPage('Đọc hiểu', 'A · Bài đọc thu gọn', 12, 0.24, `
<p class="ex-kicker">Paper 1 · Đọc hiểu · Đoạn 1</p>
<section class="passage passage--clamped glass"><h2 class="passage__title">${read1.passage.title}</h2>
<div class="passage__text">${paras(read1.passage.text)}</div>
<button class="passage__toggle">${ic(L.ChevronDown, 18, 2.25)}Đọc cả bài</button></section>
<p class="ex-question"><span class="ex-question__num">12.</span> ${q12.prompt}</p>
${choices(q12)}`))

// ---------- Cloze: blanks in the passage, current one highlighted
const cloze = section('pt01-p2b')
const answered = { 36: 'called', 37: 'taking' }
const clozeText = cloze.passage.text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
  n = Number(n)
  if (answered[n]) return `<span class="blank blank--right"><span class="blank__n">${n}</span>${answered[n]}</span>`
  if (n === 38) return `<span class="blank blank--current"><span class="blank__n">${n}</span>&nbsp;</span>`
  return `<span class="blank blank--empty"><span class="blank__n">${n}</span></span>`
})
const q38 = cloze.questions.find((q) => q.number === 38)
writeFileSync(new URL('./cloze.html', import.meta.url), sessionPage('Điền từ', 'Cloze · chỗ trống đang chọn', 38, 0.74, `
<p class="ex-kicker">Paper 2 · Điền từ vào đoạn văn</p>
<section class="passage cloze glass"><h2 class="passage__title">${cloze.passage.title}</h2>
<div class="passage__text">${paras(clozeText)}</div></section>
<p class="ex-question">Chọn từ cho chỗ trống <span class="ex-question__num">38</span></p>
<div class="choices choices--grid">${q38.options.map((o) => `<button class="choice"><span class="choice__text">${o}</span></button>`).join('')}</div>`))

// ---------- Rewrite, wrong answer: red pen + explanation + self-mark
const strike = `<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M1 6 C25 3 50 8 99 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
const q46 = section('pt01-p2c').questions.find((q) => q.number === 46)
writeFileSync(new URL('./rewrite-wrong.html', import.meta.url), sessionPage('Viết lại câu', 'Viết lại câu · chấm sai', 46, 0.92, `
<p class="ex-kicker">Paper 2 · Viết lại câu</p>
<section class="source glass"><p class="source__label">Câu gốc</p><p class="source__text">${q46.original}</p></section>
<div class="answer-box"><span class="answer-box__prefix">${q46.prefix}</span> <span class="strike-line">the weather was good,${strike}</span> <span class="strike-line">we stayed indoors.${strike}</span></div>
<p class="fix"><span class="fix__prefix">${q46.prefix}</span> ${q46.answers[0]}</p>
<div class="quiz__verdict"><span>Chưa khớp đáp án.</span><span class="quiz__hint">Nếu bạn chắc câu mình đúng nghĩa và đúng ngữ pháp, bấm “Mình viết đúng”.</span></div>
<section class="explain glass"><p class="explain__head"><span class="icon-badge icon-badge--blue icon-badge--sm">${ic(L.Lightbulb, 18, 2.25)}</span>Giải thích</p>
<p class="explain__text">${q46.explanation}</p>
<p class="explain__alt">Cũng đúng: ${q46.prefix} ${q46.answers[1]}</p></section>`,
`<div class="session__bar"><div class="session__bar-inner"><button class="btn btn--ghost btn--self">${ic(L.Check, 20, 2.25)}Mình viết đúng</button><button class="btn btn--primary">Tiếp${ic(L.ArrowRight, 20, 2.25)}</button></div></div>`))

// ---------- Set detail
const detailRows = [
  [L.BookA, 'blue', 'Từ vựng', 'Paper 1 · Part A · 10 câu', '<span class="ex-row__score"><strong>9/10</strong></span>'],
  [L.BookOpen, 'violet', 'The Origin of Jeans', 'Đọc hiểu · Part B · 5 câu', '<span class="ex-row__score"><strong>4/5</strong></span>'],
  [L.BookOpen, 'violet', 'The Furby Fad', 'Đọc hiểu · Part B · 5 câu', '<span class="ex-row__score"><strong>5/5</strong></span>'],
  [L.ListChecks, 'orange', 'Hoàn thành câu', 'Paper 2 · Part A · 15 câu', '<span class="ex-row__score"><strong>13/15</strong></span>'],
  [L.TextCursorInput, 'pink', 'The Escalator', 'Điền từ · Part B · 10 câu', '<span class="ex-row__score"><strong>8/10</strong></span>'],
  [L.PenLine, 'green', 'Viết lại câu', 'Paper 2 · Part C · 5 câu', '<span class="ex-status ex-status--new">Chưa làm</span>'],
]
  .map(([I, c, name, meta, right]) => `<li><a class="ex-row"><span class="icon-badge icon-badge--${c}">${ic(I, 22, 2.25)}</span><span class="ex-row__main"><span class="ex-row__name">${name}</span><br><span class="ex-row__meta">${meta}</span></span>${right}${ic(L.ChevronRight, 18)}</a></li>`)
  .join('')

writeFileSync(new URL('./detail.html', import.meta.url), `${head('Chi tiết bộ')}<div class="app"><main class="app-main">
<header class="topbar"><button class="icon-btn" aria-label="Quay lại">${ic(L.ArrowLeft, 24)}</button><h1 class="topbar__title">Practice Test 1</h1></header>
<div class="page ex-page">
<section class="ex-hero glass">
  <p class="ex-hero__kicker">Đề luyện tập · 50 câu · 6 phần</p>
  <p class="ex-hero__score"><span class="ex-hero__num">42</span><span class="ex-hero__unit">/50 cao nhất</span></p>
  <p class="ex-hero__sub">Lần gần nhất: 40/50 · 2 lượt đã làm</p>
  <a class="btn btn--primary">${ic(L.Play, 20, 2.25)}Làm cả đề</a>
</section>
<h2 class="ex-label">Các phần · điểm lần gần nhất</h2>
<ul class="sheet ruled">${detailRows}</ul>
<p class="ex-note">${ic(L.Info, 18, 2.25)}<span>Đáp án và giải thích do AI soạn, có thể chưa chính xác. Đề này không có phần Nghe (câu 51–70, thiếu audio) và phần Nói.</span></p>
</div></main>${tabbar}</div></body></html>`)

// ---------- Choice answered wrong, with explanation
const q1 = section('pt01-p1a').questions.find((q) => q.number === 1)
const picked = 3
const prompt1 = q1.prompt.replace('___', '<span class="gap">&nbsp;</span>')
const choiceItems = q1.options
  .map((o, i) => {
    if (i === picked) return `<div class="choice-item"><button class="choice" disabled><span class="choice__text"><span class="strike-line">${o}${strike}</span></span></button><p class="choice-note">${q1.options[q1.answer]}</p></div>`
    if (i === q1.answer) return `<div class="choice-item"><button class="choice choice--right" disabled><span class="choice__text">${o}</span></button></div>`
    return `<div class="choice-item"><button class="choice choice--dim" disabled><span class="choice__text">${o}</span></button></div>`
  })
  .join('')
writeFileSync(new URL('./choice-wrong.html', import.meta.url), sessionPage('Trắc nghiệm', '', 1, 0.02, `
<p class="ex-kicker">Paper 1 · Từ vựng</p>
<p class="ex-question ex-question--top"><span class="ex-question__num">1.</span> ${prompt1}</p>
<div class="choices">${choiceItems}</div>
<div class="quiz__verdict"><span>Chưa đúng.</span></div>
<section class="explain glass"><p class="explain__head"><span class="icon-badge icon-badge--blue icon-badge--sm">${ic(L.Lightbulb, 18, 2.25)}</span>Giải thích</p>
<p class="explain__text">${q1.explanation}</p>
<p class="explain__why"><strong>Vì sao “${q1.options[picked]}” sai:</strong> ${q1.optionNotes[picked]}</p></section>`,
`<div class="session__bar"><div class="session__bar-inner"><button class="btn btn--primary">Tiếp${ic(L.ArrowRight, 20, 2.25)}</button></div></div>`))

// ---------- Summary
const sumRows = [
  ['Từ vựng', 9, 10], ['Đọc hiểu: The Origin of Jeans', 4, 5], ['Đọc hiểu: The Furby Fad', 5, 5],
  ['Hoàn thành câu', 13, 15], ['Điền từ: The Escalator', 8, 10], ['Viết lại câu', 3, 5],
]
  .map(([n, a, b]) => `<li class="sum-row"><span class="sum-row__name">${n}</span><span class="sum-row__bar"><span style="--p:${a / b}"></span></span><span class="sum-row__score"><strong>${a}</strong>/${b}</span></li>`)
  .join('')
const wrong = [
  [5, 'I\'m a bit ___ about the arrangements for tonight…', 'Từ vựng'],
  [13, 'What problem did the prospector have?', 'Đọc hiểu'],
  [27, 'Brand didn\'t complete the project, ___ did he explain…', 'Hoàn thành câu'],
]
  .map(([n, t, k]) => `<li><a class="ex-row"><span class="ex-num ex-num--wrong">${n}</span><span class="ex-row__main"><span class="ex-row__name ex-row__name--clip">${t}</span><span class="ex-row__meta">${k}</span></span>${ic(L.ChevronRight, 18)}</a></li>`)
  .join('')
writeFileSync(new URL('./summary.html', import.meta.url), `${head('Tổng kết')}<div class="app app--immersive"><main class="app-main">
<header class="topbar"><h1 class="topbar__title">Hoàn thành Practice Test 1</h1></header>
<div class="page ex-page ex-page--bar">
<section class="ex-hero glass"><span class="icon-badge icon-badge--orange icon-badge--lg">${ic(L.Trophy, 28, 2.25)}</span>
  <p class="ex-hero__score"><span class="ex-hero__num">42</span><span class="ex-hero__unit">/50 câu đúng</span></p>
  <p class="ex-hero__sub">Cao nhất từ trước tới nay · 1 câu tự chấm</p></section>
<h2 class="ex-label">Theo từng phần</h2>
<ul class="sheet ruled sum-list">${sumRows}</ul>
<h2 class="ex-label">Câu sai · 8</h2>
<ul class="sheet ruled">${wrong}</ul>
</div>
<div class="session__bar"><div class="session__bar-inner"><button class="btn btn--ghost btn--self">Xong</button><button class="btn btn--primary">${ic(L.RotateCcw, 20, 2.25)}Làm lại câu sai</button></div></div>
</main></div></body></html>`)

console.log('ok')
