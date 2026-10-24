import { ChevronRight, Library, PenLine, Search } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../app/paths.ts'
import PageHeader from '../components/PageHeader.tsx'

// Placeholder: the real Home (today's reviews, streak, "Sổ điểm") comes in a later step.
export default function Home() {
  return (
    <>
      <PageHeader title="Từ Ngày" />
      <div className="page">
        <ul className="sheet ruled">
          <li>
            <Link to={paths.decks} className="row">
              <Library size={22} className="row__icon" aria-hidden="true" />
              <span className="row__label">Bộ từ vựng</span>
              <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to={paths.myWords} className="row">
              <PenLine size={22} className="row__icon" aria-hidden="true" />
              <span className="row__label">Từ của tôi</span>
              <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to={paths.search} className="row">
              <Search size={22} className="row__icon" aria-hidden="true" />
              <span className="row__label">Tìm kiếm</span>
              <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </div>
    </>
  )
}
