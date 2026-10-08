import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <span style={{ fontSize: '2rem' }}>⛳</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}
