import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingScreen from '../ui/LoadingScreen'

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  // Tras entrar se vuelve aquí (por ejemplo, a un enlace de invitación)
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (adminOnly && !profile?.isAdmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
