import type { ReactNode } from "react"

export function PortalPageHeader({
  title,
  lede,
  stepper,
}: {
  title: string
  lede: string
  stepper?: ReactNode
}) {
  return (
    <header className="portal-page-header">
      {stepper}
      <h1 className="portal-t-h1">{title}</h1>
      <p className="portal-page-lede portal-t-lede">{lede}</p>
    </header>
  )
}
