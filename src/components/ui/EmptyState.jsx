export default function EmptyState({ title, children, action }) {
  return (
    <div className="px-2 py-6 text-center">
      <p className="text-sm text-muted">{title}</p>
      {children}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
