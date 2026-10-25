import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../db/settings.ts'
import type { CardProgress, CustomWord, ExerciseAttempt, ExerciseResult, StudyLog } from '../db/types.ts'
import {
  backupFileName,
  buildBackup,
  describeBackupData,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup.ts'

const progress: CardProgress = {
  wordId: 'resilient',
  level: 3,
  dueDate: '2026-10-30',
  learnedAt: '2026-10-20',
  lastReviewedAt: '2026-10-24',
  correctCount: 4,
  wrongCount: 1,
  favorite: true,
  ignored: false,
}

const customWord: CustomWord = {
  id: 'custom:abc-123',
  word: 'serendipity',
  emoji: '🍀',
  ipa: '/ˌserənˈdɪpəti/',
  pos: 'noun',
  meaningVi: 'sự tình cờ may mắn',
  exampleEn: 'Pure serendipity.',
  exampleVi: 'Hoàn toàn là sự tình cờ may mắn.',
  level: 'custom',
  topics: ['custom'],
  createdAt: '2026-10-22',
  createdAtMs: 1_790_000_000_000,
}

const log: StudyLog = { id: 1, date: '2026-10-24', newLearned: 5, reviewed: 3, correct: 7, wrong: 1 }

const attempt: ExerciseAttempt = {
  id: 3,
  setId: 'practice-test-01',
  sectionId: 'pt01-p2c',
  startedAt: '2026-10-25T08:00:00.000Z',
  updatedAt: '2026-10-25T08:05:00.000Z',
  finishedAt: '2026-10-25T08:06:00.000Z',
  answers: {
    'pt01-q46': { value: 'a funny film', correct: true, selfMarked: true },
    'pt01-q47': { value: 2, correct: false },
  },
}

const result: ExerciseResult = {
  questionId: 'pt01-q46',
  setId: 'practice-test-01',
  value: 'a funny film',
  correct: true,
  selfMarked: true,
  answeredAt: '2026-10-25T08:05:00.000Z',
}

const wrongResult: ExerciseResult = {
  questionId: 'wp01-q1',
  setId: 'writing-practice',
  value: 1,
  correct: false,
  answeredAt: '2026-10-25T08:07:00.000Z',
}

function sampleData(): BackupData {
  return {
    progress: [
      progress,
      { wordId: 'fav-only', level: 0, correctCount: 0, wrongCount: 0, favorite: true, ignored: false },
    ],
    customWords: [customWord],
    studyLogs: [log],
    exerciseAttempts: [structuredClone(attempt)],
    exerciseResults: [{ ...result }, { ...wrongResult }],
    settings: {
      ...DEFAULT_SETTINGS,
      reminders: { ...DEFAULT_SETTINGS.reminders },
      activeDeckIds: [...DEFAULT_SETTINGS.activeDeckIds],
    },
  }
}

/** A valid backup file as a loose object, so tests can break one thing at a time. */
// oxlint-disable-next-line no-explicit-any
type Loose = any

function sampleFile(): Loose {
  return JSON.parse(serializeBackup(buildBackup(sampleData(), new Date('2026-10-24T10:00:00Z'))))
}

function expectRejected(file: unknown, message?: RegExp) {
  const result = parseBackup(typeof file === 'string' ? file : JSON.stringify(file))
  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.errors.length).toBeGreaterThan(0)
    if (message) expect(result.errors.join('\n')).toMatch(message)
  }
}

describe('building', () => {
  it('wraps the data with app id, format version and timestamp', () => {
    const file = buildBackup(sampleData(), new Date('2026-10-24T10:00:00Z'))
    expect(file).toMatchObject({ app: 'tu-ngay', formatVersion: 2, exportedAt: '2026-10-24T10:00:00.000Z' })
  })

  it('names the file after the local date', () => {
    expect(backupFileName(new Date(2026, 9, 5, 23, 59))).toBe('tu-ngay-sao-luu-2026-10-05.json')
  })

  it('describes the data, with the exercise answers when there are some', () => {
    expect(describeBackupData(sampleData())).toBe('1 từ đã học, 1 từ của tôi, 1 ngày học, 2 câu bài tập đã làm')
    expect(describeBackupData({ ...sampleData(), exerciseResults: [] })).toBe(
      '1 từ đã học, 1 từ của tôi, 1 ngày học',
    )
  })
})

describe('parseBackup', () => {
  it('accepts what it builds, field for field', () => {
    const result = parseBackup(serializeBackup(buildBackup(sampleData())))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(sampleData())
  })

  it('accepts empty tables', () => {
    const file = sampleFile()
    file.data.progress = []
    file.data.customWords = []
    file.data.studyLogs = []
    file.data.exerciseAttempts = []
    file.data.exerciseResults = []
    expect(parseBackup(JSON.stringify(file)).ok).toBe(true)
  })

  it('drops unknown extra fields', () => {
    const file = sampleFile()
    file.data.progress[0].mood = 'happy'
    file.data.settings.key = 'app'
    file.extra = true
    const result = parseBackup(JSON.stringify(file))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.progress[0]).not.toHaveProperty('mood')
      expect(result.data.settings).not.toHaveProperty('key')
    }
  })

  it('rejects text that is not JSON', () => {
    expectRejected('not json {', /JSON/)
    expectRejected('')
  })

  it('rejects JSON that is not a backup of this app', () => {
    expectRejected([], /không phải file sao lưu/)
    expectRejected('null', /không phải file sao lưu/)
    expectRejected({ ...sampleFile(), app: 'other-app' }, /không phải file sao lưu/)
  })

  it('rejects a newer format with a clear message, and invalid versions', () => {
    expectRejected({ ...sampleFile(), formatVersion: 3 }, /mới hơn/)
    expectRejected({ ...sampleFile(), formatVersion: '1' }, /phiên bản/)
    expectRejected({ ...sampleFile(), formatVersion: 0 }, /phiên bản/)
    expectRejected({ ...sampleFile(), formatVersion: 1.5 }, /phiên bản/)
  })

  it('requires data and its arrays', () => {
    const noData = sampleFile()
    delete noData.data
    expectRejected(noData, /data/)
    for (const key of ['progress', 'customWords', 'studyLogs', 'exerciseAttempts', 'exerciseResults']) {
      const file = sampleFile()
      file.data[key] = {}
      expectRejected(file, new RegExp(key))
      delete file.data[key]
      expectRejected(file, new RegExp(key))
    }
  })

  describe('a version 1 file', () => {
    function v1File(): Loose {
      const file = sampleFile()
      file.formatVersion = 1
      delete file.data.exerciseAttempts
      delete file.data.exerciseResults
      return file
    }

    it('is accepted, with empty exercise tables', () => {
      const parsed = parseBackup(JSON.stringify(v1File()))
      expect(parsed.ok).toBe(true)
      if (parsed.ok) {
        expect(parsed.data.exerciseAttempts).toEqual([])
        expect(parsed.data.exerciseResults).toEqual([])
        expect(parsed.data.progress).toEqual(sampleData().progress)
      }
    })

    it('still rejects exercise tables that are present but not lists', () => {
      const file = v1File()
      file.data.exerciseResults = {}
      expectRejected(file, /exerciseResults/)
    })

    it('reads exercise tables if a version 1 file happens to have them', () => {
      const file = v1File()
      file.data.exerciseResults = [{ ...result }]
      const parsed = parseBackup(JSON.stringify(file))
      expect(parsed.ok && parsed.data.exerciseResults).toEqual([result])
    })
  })

  describe('progress', () => {
    it.each([
      ['level above 5', { level: 6 }],
      ['negative level', { level: -1 }],
      ['fractional level', { level: 1.5 }],
      ['string level', { level: '3' }],
      ['impossible dueDate', { dueDate: '2026-02-30' }],
      ['wrongly formatted date', { learnedAt: '24/10/2026' }],
      ['non-string wordId', { wordId: 5 }],
      ['empty wordId', { wordId: '' }],
      ['negative count', { correctCount: -1 }],
      ['non-boolean flag', { favorite: 'yes' }],
      ['missing ignored', { ignored: undefined }],
    ])('rejects %s', (_name, patch) => {
      const file = sampleFile()
      Object.assign(file.data.progress[0], patch)
      expectRejected(file)
    })

    it('requires a due date for learned words', () => {
      const file = sampleFile()
      delete file.data.progress[0].dueDate
      expectRejected(file, /dueDate/)
    })

    it('rejects duplicate word ids', () => {
      const file = sampleFile()
      file.data.progress.push({ ...file.data.progress[0] })
      expectRejected(file, /trùng/)
    })

    it('rejects records that are not objects', () => {
      const file = sampleFile()
      file.data.progress.push('x')
      expectRejected(file)
    })
  })

  describe('custom words', () => {
    it.each([
      ['id without the custom: prefix', { id: 'abc' }],
      ['bare prefix', { id: 'custom:' }],
      ['blank word', { word: '  ' }],
      ['blank meaning', { meaningVi: '' }],
      ['non-string ipa', { ipa: 3 }],
      ['topics not an array', { topics: 'custom' }],
      ['topics with non-strings', { topics: [1] }],
      ['bad createdAt', { createdAt: 'yesterday' }],
      ['bad createdAtMs', { createdAtMs: 'now' }],
      ['bad emoji', { emoji: 5 }],
    ])('rejects %s', (_name, patch) => {
      const file = sampleFile()
      Object.assign(file.data.customWords[0], patch)
      expectRejected(file)
    })

    it('rejects duplicate ids', () => {
      const file = sampleFile()
      file.data.customWords.push({ ...file.data.customWords[0] })
      expectRejected(file, /trùng/)
    })

    it('accepts a word without emoji and createdAtMs', () => {
      const file = sampleFile()
      delete file.data.customWords[0].emoji
      delete file.data.customWords[0].createdAtMs
      expect(parseBackup(JSON.stringify(file)).ok).toBe(true)
    })
  })

  describe('study logs', () => {
    it('rejects duplicate dates', () => {
      const file = sampleFile()
      file.data.studyLogs.push({ ...file.data.studyLogs[0], id: 2 })
      expectRejected(file, /trùng ngày/)
    })

    it('rejects duplicate ids', () => {
      const file = sampleFile()
      file.data.studyLogs.push({ ...file.data.studyLogs[0], date: '2026-10-23' })
      expectRejected(file, /trùng "id"/)
    })

    it.each([
      ['bad date', { date: '2026-13-01' }],
      ['negative count', { reviewed: -2 }],
      ['fractional count', { correct: 1.5 }],
      ['zero id', { id: 0 }],
    ])('rejects %s', (_name, patch) => {
      const file = sampleFile()
      Object.assign(file.data.studyLogs[0], patch)
      expectRejected(file)
    })

    it('accepts logs without ids', () => {
      const file = sampleFile()
      delete file.data.studyLogs[0].id
      expect(parseBackup(JSON.stringify(file)).ok).toBe(true)
    })
  })

  describe('exercise attempts', () => {
    it('round-trips every field, including optional ones and mixed answer values', () => {
      const parsed = parseBackup(serializeBackup(buildBackup(sampleData())))
      expect(parsed.ok && parsed.data.exerciseAttempts).toEqual([attempt])
    })

    it('accepts an open whole-set attempt without id, sectionId or finishedAt', () => {
      const open = {
        setId: 'grammar-practice-01',
        startedAt: '2026-10-25T08:00:00Z',
        updatedAt: '2026-10-25T08:01:00Z',
        answers: {},
      }
      const file = sampleFile()
      file.data.exerciseAttempts = [open]
      const parsed = parseBackup(JSON.stringify(file))
      expect(parsed.ok && parsed.data.exerciseAttempts).toEqual([open])
    })

    it('drops unknown fields, and a false selfMarked', () => {
      const file = sampleFile()
      file.data.exerciseAttempts[0].mood = 'happy'
      file.data.exerciseAttempts[0].answers['pt01-q47'].selfMarked = false
      file.data.exerciseAttempts[0].answers['pt01-q47'].extra = 1
      const parsed = parseBackup(JSON.stringify(file))
      expect(parsed.ok).toBe(true)
      if (parsed.ok) {
        expect(parsed.data.exerciseAttempts[0]).not.toHaveProperty('mood')
        expect(parsed.data.exerciseAttempts[0].answers['pt01-q47']).toEqual({ value: 2, correct: false })
      }
    })

    it('drops attempts of a set that is not in the catalog, keeping the rest', () => {
      const file = sampleFile()
      file.data.exerciseAttempts.push({ ...file.data.exerciseAttempts[0], id: 9, setId: 'practice-test-99' })
      const parsed = parseBackup(JSON.stringify(file))
      expect(parsed.ok && parsed.data.exerciseAttempts.map((a) => a.id)).toEqual([3])
    })

    it.each([
      ['missing setId', { setId: undefined }],
      ['empty sectionId', { sectionId: '' }],
      ['bad startedAt', { startedAt: 'yesterday' }],
      ['missing updatedAt', { updatedAt: undefined }],
      ['bad finishedAt', { finishedAt: 5 }],
      ['zero id', { id: 0 }],
      ['answers not an object', { answers: [] }],
      ['answer that is not a record', { answers: { q: 'x' } }],
      ['answer without correct', { answers: { q: { value: 1 } } }],
      ['answer with a boolean value', { answers: { q: { value: true, correct: true } } }],
      ['non-boolean selfMarked', { answers: { q: { value: 1, correct: true, selfMarked: 'yes' } } }],
    ])('rejects %s', (_name, patch) => {
      const file = sampleFile()
      Object.assign(file.data.exerciseAttempts[0], patch)
      expectRejected(file)
    })

    it('rejects a malformed attempt even when its set is unknown', () => {
      const file = sampleFile()
      Object.assign(file.data.exerciseAttempts[0], { setId: 'gone', startedAt: 'bad' })
      expectRejected(file, /startedAt/)
    })

    it('rejects duplicate ids and records that are not objects', () => {
      const dup = sampleFile()
      dup.data.exerciseAttempts.push({ ...dup.data.exerciseAttempts[0] })
      expectRejected(dup, /trùng/)
      const junk = sampleFile()
      junk.data.exerciseAttempts.push('x')
      expectRejected(junk)
    })
  })

  describe('exercise results', () => {
    it('round-trips results, leaving out selfMarked when it is not set', () => {
      const parsed = parseBackup(serializeBackup(buildBackup(sampleData())))
      expect(parsed.ok && parsed.data.exerciseResults).toEqual([result, wrongResult])
    })

    it('drops results of a set that is not in the catalog, keeping the rest', () => {
      const file = sampleFile()
      file.data.exerciseResults.push({ ...result, questionId: 'old-q1', setId: 'removed-set' })
      const parsed = parseBackup(JSON.stringify(file))
      expect(parsed.ok && parsed.data.exerciseResults.map((r) => r.questionId)).toEqual(['pt01-q46', 'wp01-q1'])
    })

    it.each([
      ['missing questionId', { questionId: undefined }],
      ['empty setId', { setId: '' }],
      ['bad answeredAt', { answeredAt: 'soon' }],
      ['missing value', { value: undefined }],
      ['null value', { value: null }],
      ['non-boolean correct', { correct: 1 }],
      ['non-boolean selfMarked', { selfMarked: 'yes' }],
    ])('rejects %s', (_name, patch) => {
      const file = sampleFile()
      Object.assign(file.data.exerciseResults[0], patch)
      expectRejected(file)
    })

    it('rejects duplicate question ids', () => {
      const file = sampleFile()
      file.data.exerciseResults.push({ ...file.data.exerciseResults[0] })
      expectRejected(file, /trùng/)
    })
  })

  describe('settings', () => {
    it('are required', () => {
      const file = sampleFile()
      delete file.data.settings
      expectRejected(file, /Cài đặt/)
    })

    it.each([
      ['daily goal', { dailyGoal: 7 }],
      ['voice', { voice: 'fr-FR' }],
      ['rate that is too fast', { speechRate: 1.5 }],
      ['rate that is too slow', { speechRate: 0.5 }],
      ['sound flag', { soundEffects: 1 }],
      ['theme', { theme: 'sepia' }],
      ['reminders', { reminders: { morning: true } }],
      ['deck ids', { activeDeckIds: [1] }],
    ])('reject a bad %s', (_name, patch) => {
      const file = sampleFile()
      Object.assign(file.data.settings, patch)
      expectRejected(file)
    })

    it('accept the rate limits', () => {
      for (const speechRate of [0.8, 1.2]) {
        const file = sampleFile()
        file.data.settings.speechRate = speechRate
        expect(parseBackup(JSON.stringify(file)).ok).toBe(true)
      }
    })
  })

  it('reports every problem it finds, not just the first', () => {
    const file = sampleFile()
    file.data.progress[0].level = 9
    file.data.studyLogs[0].date = 'bad'
    const result = parseBackup(JSON.stringify(file))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('caps the list of errors for a badly broken file', () => {
    const file = sampleFile()
    file.data.progress = Array.from({ length: 500 }, () => 'junk')
    const result = parseBackup(JSON.stringify(file))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeLessThanOrEqual(40)
  })
})
