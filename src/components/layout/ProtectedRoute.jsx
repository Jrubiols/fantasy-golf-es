import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingScreen from '../ui/LoadingScreen'

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !profile?.isAdmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
