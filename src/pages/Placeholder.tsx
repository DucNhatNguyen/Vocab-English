import PageHeader from '../components/PageHeader.tsx'

/** Stand-in for screens built in later steps. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="page">
        <p className="muted">Đang xây dựng…</p>
      </div>
    </>
  )
}
