export default function PaymentsLoading() {
  return <div className="mx-auto max-w-[1520px] animate-pulse motion-reduce:animate-none" aria-label="Loading payments">
    <div className="h-10 w-48 rounded-lg bg-[#E4E7EC]" />
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-2xl bg-white" />)}</div>
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="h-80 rounded-2xl bg-white" /><div className="h-80 rounded-2xl bg-white" /></div>
    <div className="mt-5 h-96 rounded-2xl bg-white" />
  </div>
}
