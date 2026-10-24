import { afterEach, describe, expect, it, vi } from 'vitest'
import { deliverFile, makeBackupFile } from './backupDelivery.ts'

/** Minimal DOM stand-in: just enough for the `<a download>` fallback. */
function stubDom() {
  const link = { href: '', download: '', style: {} as Record<string, string>, click: vi.fn(), remove: vi.fn() }
  vi.stubGlobal('document', {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn() },
  })
  const createObjectURL = vi.fn(() => 'blob:fake')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  return { link, createObjectURL, revokeObjectURL }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const file = () => makeBackupFile('{}', 'a.json')

describe('makeBackupFile', () => {
  it('makes a JSON file with the given name and text', async () => {
    const f = makeBackupFile('{"a":1}', 'x.json')
    expect(f.name).toBe('x.json')
    expect(f.type).toBe('application/json')
    expect(await f.text()).toBe('{"a":1}')
  })
})

describe('deliverFile', () => {
  it('calls navigator.share synchronously, before any await (iOS user activation)', () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })
    void deliverFile(file())
    // No await happened yet: the share sheet must already have been requested
    expect(share).toHaveBeenCalledTimes(1)
  })

  it('shares the file when the share sheet can take files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: vi.fn(() => true), share })
    await expect(deliverFile(file())).resolves.toBe('shared')
    const [{ files }] = share.mock.calls[0]
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('a.json')
    expect(files[0].type).toBe('application/json')
    expect(await files[0].text()).toBe('{}')
  })

  it('treats dismissing the share sheet as a quiet cancel, without a download', async () => {
    const dom = stubDom()
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'))
    vi.stubGlobal('navigator', { canShare: () => true, share })
    await expect(deliverFile(file())).resolves.toBe('cancelled')
    expect(dom.link.click).not.toHaveBeenCalled()
  })

  it('downloads through a link when files cannot be shared', async () => {
    vi.useFakeTimers()
    const dom = stubDom()
    vi.stubGlobal('navigator', { canShare: () => false, share: vi.fn() })
    await expect(deliverFile(file())).resolves.toBe('downloaded')
    expect(dom.link.download).toBe('a.json')
    expect(dom.link.href).toBe('blob:fake')
    expect(dom.link.click).toHaveBeenCalledTimes(1)
    vi.runAllTimers()
    expect(dom.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })

  it('downloads when navigator.canShare does not exist', async () => {
    const dom = stubDom()
    vi.stubGlobal('navigator', {})
    await expect(deliverFile(file())).resolves.toBe('downloaded')
    expect(dom.link.click).toHaveBeenCalledTimes(1)
  })

  it('falls back to a download when sharing fails for another reason', async () => {
    const dom = stubDom()
    const share = vi.fn().mockRejectedValue(new DOMException('no gesture', 'NotAllowedError'))
    vi.stubGlobal('navigator', { canShare: () => true, share })
    await expect(deliverFile(file())).resolves.toBe('downloaded')
    expect(dom.link.click).toHaveBeenCalledTimes(1)
  })
})
