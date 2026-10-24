import { ChevronDown, Lightbulb, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useWord } from '../../app/hooks.ts'
import { paths } from '../../app/paths.ts'
import PageHeader from '../../components/PageHeader.tsx'
import { PARTS_OF_SPEECH } from '../../data/types.ts'
import type { Word } from '../../data/types.ts'
import { createCustomWord, findCustomWordByHeadword, updateCustomWord } from '../../db/customWords.ts'
import type { CustomWord } from '../../db/types.ts'
import { isCustomWordId } from '../../db/words.ts'
import { suggestWord, type DictionaryResult } from '../../lib/dictionary.ts'
import { getPosLabel } from '../../lib/pos.ts'
import {
  applySuggestion,
  EMPTY_FORM,
  otherFieldsEmpty,
  suggestionMessage,
  validateWordForm,
  type WordFormValues,
} from '../../lib/wordForm.ts'
import NotFound from '../NotFound.tsx'

type SuggestState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; result: DictionaryResult }

function toValues(word: Word): WordFormValues {
  return {
    word: word.word,
    ipa: word.ipa,
    pos: word.pos,
    meaningVi: word.meaningVi,
    exampleEn: word.exampleEn,
    exampleVi: word.exampleVi,
    emoji: word.emoji ?? '',
  }
}

interface FieldProps {
  label: string
  htmlFor: string
  optional?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

function Field({ label, htmlFor, optional = false, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="field__optional"> (tuỳ chọn)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="field__hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${htmlFor}-error`}>
          <TriangleAlert size={16} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`
  return hint ? `${id}-hint` : undefined
}

/** Add form (`/my-words/new`, optional `?word=` prefill) and edit form (`/my-words/:wordId/edit`). */
export default function MyWordForm() {
  // useParams already URL-decodes, so "custom%3Aabc" arrives as "custom:abc"
  const { wordId } = useParams()
  const editing = wordId !== undefined
  const existing = useWord(wordId ?? '')

  if (!editing) return <WordForm />
  if (!isCustomWordId(wordId) || existing === null) {
    return <NotFound message="Không tìm thấy từ" backTo={paths.myWords} />
  }
  // Loading: render only the shell so a valid word does not flash "not found"
  if (existing === undefined) return <PageHeader title="Sửa từ" backTo={paths.word(wordId)} />
  // Keyed by id: the form owns its state from here on and ignores later live updates
  return <WordForm key={existing.id} existing={existing} />
}

function WordForm({ existing }: { existing?: Word }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const duplicateRef = useRef<HTMLDivElement>(null)
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`

  const [values, setValues] = useState<WordFormValues>(() =>
    existing ? toValues(existing) : { ...EMPTY_FORM, word: (params.get('word') ?? '').trim() },
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [duplicate, setDuplicate] = useState<CustomWord | null>(null)
  const [suggest, setSuggest] = useState<SuggestState>({ status: 'idle' })

  // Request bookkeeping: only the latest request may apply its result, and the same word is not
  // requested twice at once (blur and the "Gợi ý" tap arrive together).
  const requestRef = useRef(0)
  const inFlightRef = useRef('')
  const lastWordRef = useRef('')
  const prefillHandled = useRef(false)

  // The form is long: bring the message into view, next to the Save button that was just tapped
  useEffect(() => {
    if (duplicate) duplicateRef.current?.scrollIntoView({ block: 'center' })
  }, [duplicate])

  const errors = submitted ? validateWordForm(values) : {}

  function set<K extends keyof WordFormValues>(field: K, value: WordFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function runSuggest(word: string) {
    const key = word.trim().toLowerCase()
    if (!key || inFlightRef.current === key) return
    const request = ++requestRef.current
    inFlightRef.current = key
    lastWordRef.current = key
    setSuggest({ status: 'loading' })

    const result = await suggestWord(word)
    if (request !== requestRef.current) return
    inFlightRef.current = ''
    // Only empty fields are filled, judged when the answer arrives, so typing meanwhile is safe
    if ('suggestion' in result) setValues((current) => applySuggestion(current, result.suggestion))
    setSuggest({ status: 'done', result })
  }

  // A word coming from the search screen ("?word=") gets its suggestion straight away
  useEffect(() => {
    if (existing || prefillHandled.current) return
    prefillHandled.current = true
    if (values.word) void runSuggest(values.word)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [])

  function changeWord(value: string) {
    set('word', value)
    setDuplicate(null)
    // The note and any request in flight belong to the previous spelling
    requestRef.current++
    inFlightRef.current = ''
    setSuggest({ status: 'idle' })
  }

  function blurWord() {
    const key = values.word.trim().toLowerCase()
    if (key && key !== lastWordRef.current && otherFieldsEmpty(values)) void runSuggest(values.word)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const problems = validateWordForm(values)
    const first = (['word', 'meaningVi', 'emoji'] as const).find((name) => problems[name])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    setSaving(true)
    setSaveFailed(false)
    try {
      const found = await findCustomWordByHeadword(values.word)
      // Editing: the word itself is not a duplicate
      if (found && found.id !== existing?.id) {
        setDuplicate(found)
        return
      }
      const data = {
        word: values.word.trim(),
        ipa: values.ipa.trim(),
        pos: values.pos,
        meaningVi: values.meaningVi.trim(),
        exampleEn: values.exampleEn.trim(),
        exampleVi: values.exampleVi.trim(),
        // undefined also clears an emoji that was removed while editing
        emoji: values.emoji.trim() || undefined,
      }
      if (existing) {
        await updateCustomWord(existing.id, data)
        void navigate(paths.word(existing.id), { replace: true })
      } else {
        await createCustomWord(data)
        void navigate(paths.myWords, { replace: true })
      }
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const loading = suggest.status === 'loading'
  const wordId = fieldId('word')
  const meaningId = fieldId('meaningVi')
  const emojiId = fieldId('emoji')
  const exampleHint = 'Có câu ví dụ thì từ mới xuất hiện trong dạng bài điền từ khi ôn tập.'

  return (
    <>
      <PageHeader
        title={existing ? 'Sửa từ' : 'Thêm từ'}
        backTo={existing ? paths.word(existing.id) : paths.myWords}
      />
      <form ref={formRef} className="page word-form" noValidate onSubmit={(e) => void save(e)}>
        <Field label="Từ tiếng Anh" htmlFor={wordId} error={errors.word}>
          <input
            id={wordId}
            name="word"
            className="input"
            type="text"
            lang="en"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="next"
            value={values.word}
            aria-invalid={errors.word ? true : undefined}
            aria-describedby={describedBy(wordId, undefined, errors.word)}
            onChange={(e) => changeWord(e.target.value)}
            onBlur={blurWord}
          />
        </Field>

        <div className="suggest">
          <button
            type="button"
            className="btn btn--ghost suggest__btn"
            disabled={loading || values.word.trim() === ''}
            onClick={() => void runSuggest(values.word)}
          >
            {loading ? (
              <LoaderCircle size={20} className="spin" aria-hidden="true" />
            ) : (
              <Lightbulb size={20} aria-hidden="true" />
            )}
            Gợi ý
          </button>
          <p className="suggest__note muted" role="status">
            {suggest.status === 'loading' && 'Đang tìm gợi ý…'}
            {suggest.status === 'done' && suggestionMessage(suggest.result)}
          </p>
        </div>

        <Field label="Phiên âm IPA" htmlFor={fieldId('ipa')} optional>
          <input
            id={fieldId('ipa')}
            className="input"
            type="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            placeholder="/ˈmæŋɡoʊ/"
            value={values.ipa}
            onChange={(e) => set('ipa', e.target.value)}
          />
        </Field>

        <Field label="Từ loại" htmlFor={fieldId('pos')} optional>
          <div className="select">
            <select
              id={fieldId('pos')}
              className="input"
              value={values.pos}
              onChange={(e) => set('pos', e.target.value)}
            >
              <option value="">Chưa chọn</option>
              {PARTS_OF_SPEECH.map((code) => (
                <option key={code} value={code}>
                  {getPosLabel(code)} ({code})
                </option>
              ))}
              {/* A stored value outside the list (older data) stays selectable */}
              {values.pos && !(PARTS_OF_SPEECH as readonly string[]).includes(values.pos) && (
                <option value={values.pos}>{values.pos}</option>
              )}
            </select>
            <ChevronDown size={20} className="select__icon" aria-hidden="true" />
          </div>
        </Field>

        <Field label="Nghĩa tiếng Việt" htmlFor={meaningId} error={errors.meaningVi}>
          <input
            id={meaningId}
            name="meaningVi"
            className="input"
            type="text"
            lang="vi"
            autoCapitalize="off"
            autoComplete="off"
            enterKeyHint="next"
            value={values.meaningVi}
            aria-invalid={errors.meaningVi ? true : undefined}
            aria-describedby={describedBy(meaningId, undefined, errors.meaningVi)}
            onChange={(e) => set('meaningVi', e.target.value)}
          />
        </Field>

        <Field label="Câu ví dụ tiếng Anh" htmlFor={fieldId('exampleEn')} optional hint={exampleHint}>
          <textarea
            id={fieldId('exampleEn')}
            className="input input--area"
            rows={2}
            lang="en"
            autoCapitalize="sentences"
            autoComplete="off"
            aria-describedby={describedBy(fieldId('exampleEn'), exampleHint)}
            value={values.exampleEn}
            onChange={(e) => set('exampleEn', e.target.value)}
          />
        </Field>

        <Field label="Câu ví dụ tiếng Việt" htmlFor={fieldId('exampleVi')} optional>
          <textarea
            id={fieldId('exampleVi')}
            className="input input--area"
            rows={2}
            lang="vi"
            autoCapitalize="sentences"
            autoComplete="off"
            value={values.exampleVi}
            onChange={(e) => set('exampleVi', e.target.value)}
          />
        </Field>

        <Field
          label="Emoji minh hoạ"
          htmlFor={emojiId}
          optional
          hint="Một biểu tượng, ví dụ 🥭"
          error={errors.emoji}
        >
          <input
            id={emojiId}
            name="emoji"
            className="input input--emoji"
            type="text"
            autoComplete="off"
            value={values.emoji}
            aria-invalid={errors.emoji ? true : undefined}
            aria-describedby={describedBy(emojiId, 'hint', errors.emoji)}
            onChange={(e) => set('emoji', e.target.value)}
          />
        </Field>

        {duplicate && (
          <div ref={duplicateRef} className="callout" role="alert">
            <p className="callout__text">
              <TriangleAlert size={20} aria-hidden="true" />
              <span>{`'${duplicate.word}' đã có trong Từ của tôi`}</span>
            </p>
            <Link to={paths.word(duplicate.id)} className="btn btn--ghost">
              Mở từ này
            </Link>
          </div>
        )}
        {saveFailed && (
          <p className="field__error" role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            Không lưu được. Hãy thử lại.
          </p>
        )}

        <button type="submit" className="btn btn--primary word-form__save" disabled={saving}>
          {saving ? 'Đang lưu…' : existing ? 'Lưu thay đổi' : 'Lưu từ'}
        </button>
      </form>
    </>
  )
}
