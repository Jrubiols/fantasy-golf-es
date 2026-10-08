import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/ui/LoadingScreen'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DraftPage = lazy(() => import('./pages/DraftPage'))
const LeaguePage = lazy(() => import('./pages/LeaguePage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/draft" element={<DraftPage />} />
                <Route path="/league" element={<LeaguePage />} />
                <Route path="/league/:leagueId" element={<LeaguePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/unirse/:code" element={<JoinPage />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
