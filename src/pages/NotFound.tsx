import { Link } from 'react-router'
import { paths } from '../app/paths.ts'
import PageHeader from '../components/PageHeader.tsx'

interface NotFoundProps {
  /** What was not found; defaults to the page itself. */
  message?: string
  backTo?: string
}

export default function NotFound({ message = 'Không tìm thấy trang', backTo }: NotFoundProps) {
  return (
    <>
      <PageHeader title="Không tìm thấy" backTo={backTo} />
      <div className="page empty">
        <p className="empty__title">{message}</p>
        <Link to={paths.home} className="btn btn--primary">
          Về trang chủ
        </Link>
      </div>
    </>
  )
}
