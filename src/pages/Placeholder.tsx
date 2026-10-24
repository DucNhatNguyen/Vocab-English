import PageHeader from '../components/PageHeader.tsx'

/** Stand-in for screens built in later steps. */
export default function Placeholder({ title, backTo }: { title: string; backTo?: string }) {
  return (
    <>
      <PageHeader title={title} backTo={backTo} />
      <div className="page">
        <p className="muted">Đang xây dựng…</p>
      </div>
    </>
  )
}
