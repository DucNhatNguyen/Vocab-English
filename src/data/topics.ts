/** Topic id -> Vietnamese label. */
export const TOPIC_LABELS: Record<string, string> = {
  'giao-tiep': 'Giao tiếp',
  'du-lich': 'Du lịch',
  'cong-viec': 'Công việc',
  toeic: 'TOEIC',
  ielts: 'IELTS',
}

export function getTopicLabel(topicId: string): string {
  return TOPIC_LABELS[topicId] ?? topicId
}
