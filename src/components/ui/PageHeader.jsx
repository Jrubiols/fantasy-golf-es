export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="mb-6 flex animate-fade-up flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-sm text-muted">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold text-cream">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
