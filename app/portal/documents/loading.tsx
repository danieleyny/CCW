export default function DocumentsLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <div className="border-b border-hairline pb-5">
        <div className="h-3 w-44 rounded bg-surface-3" />
        <div className="mt-3 h-10 w-full max-w-md rounded bg-surface-3" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-surface-2" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-hairline bg-white p-4">
            <div className="h-3 w-20 rounded bg-surface-3" />
            <div className="mt-4 h-8 w-12 rounded bg-surface-3" />
            <div className="mt-3 h-3 w-28 rounded bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-hairline bg-white">
          <div className="h-16 border-b border-hairline bg-surface-2/40" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex h-20 items-center gap-4 border-b border-hairline px-4 last:border-b-0">
              <div className="size-10 rounded-lg bg-surface-3" />
              <div className="flex-1"><div className="h-3 w-1/3 rounded bg-surface-3" /><div className="mt-2 h-3 w-1/2 rounded bg-surface-2" /></div>
              <div className="h-7 w-24 rounded-full bg-surface-3" />
            </div>
          ))}
        </div>
        <div className="hidden h-80 rounded-2xl border border-hairline bg-white xl:block" />
      </div>
    </div>
  )
}
