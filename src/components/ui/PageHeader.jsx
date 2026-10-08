// Cabecera de página: etiqueta pequeña, titular condensado y subtítulo
export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="mb-5 flex animate-fade-up flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5">{typeof eyebrow === 'string' ? <p className="label">{eyebrow}</p> : eyebrow}</div>}
        <h1 className="headline text-[3.2rem] sm:text-6xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
