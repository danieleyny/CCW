export default function MarketplaceLoading() {
  return (
    <div className="marketplace-v2-page marketplace-v2-loading" aria-busy="true">
      <div className="marketplace-v2-skeleton is-eyebrow" />
      <div className="marketplace-v2-skeleton is-title" />
      <div className="marketplace-v2-skeleton is-copy" />
      <div className="marketplace-v2-skeleton is-steps" />
      <div className="marketplace-v2-loading-grid">
        <div className="marketplace-v2-skeleton is-card" />
        <div className="marketplace-v2-skeleton is-card" />
      </div>
    </div>
  )
}
