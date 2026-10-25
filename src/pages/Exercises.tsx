import { FileText } from 'lucide-react'
import IconBadge from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'

/** Bài tập: exercises built from documents the user imports. Not built yet. */
export default function Exercises() {
  return (
    <>
      <PageHeader title="Bài tập" />
      <div className="page">
        <section className="soon glass">
          <IconBadge icon={FileText} hue="violet" size="lg" />
          <h2 className="soon__title">Sắp ra mắt</h2>
          <p className="soon__text muted">
            Bạn sẽ nhập tài liệu của mình (bài đọc, đề, ghi chú) và làm bài tập từ đó.
          </p>
        </section>
      </div>
    </>
  )
}
