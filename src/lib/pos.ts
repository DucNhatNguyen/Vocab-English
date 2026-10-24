/** Part of speech code (see PARTS_OF_SPEECH) -> Vietnamese label. */
const POS_LABELS: Record<string, string> = {
  noun: 'danh từ',
  verb: 'động từ',
  adj: 'tính từ',
  adv: 'trạng từ',
  phrase: 'cụm từ',
  prep: 'giới từ',
  conj: 'liên từ',
  pron: 'đại từ',
  interj: 'thán từ',
}

/** Unknown codes (e.g. from user-entered words) are shown as-is. */
export function getPosLabel(pos: string): string {
  return POS_LABELS[pos] ?? pos
}
