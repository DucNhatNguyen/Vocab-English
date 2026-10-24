export type DeliveryResult = 'shared' | 'downloaded' | 'cancelled'

function isAbort(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError'
}

function download(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before the blob goes away
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function makeBackupFile(text: string, fileName: string): File {
  return new File([text], fileName, { type: 'application/json' })
}

/**
 * Hands a prepared backup file to the user. Prefers the share sheet (an "<a download>" is unreliable
 * in a standalone iOS PWA), falling back to a normal download. Dismissing the share sheet
 * resolves to 'cancelled'.
 *
 * iOS only allows sharing while the click's transient user activation is alive, so the file must
 * be built beforehand and this must be called straight from the click handler: everything up to
 * the navigator.share() call runs synchronously (no await before it).
 */
export async function deliverFile(file: File): Promise<DeliveryResult> {
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sao lưu Từ Ngày' })
      return 'shared'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
      // Any other failure (e.g. the user activation expired): fall through to a download
    }
  }

  download(file)
  return 'downloaded'
}
