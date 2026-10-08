import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DraftPage from './pages/DraftPage'
import LeaguePage from './pages/LeaguePage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/admin/AdminPage'

function AppLayout({ children }) {
  return (<><Navbar /><main>{children}</main></>)
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/draft" element={<ProtectedRoute><AppLayout><DraftPage /></AppLayout></ProtectedRoute>} />
          <Route path="/league" element={<ProtectedRoute><AppLayout><LeaguePage /></AppLayout></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><AppLayout><LeaderboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AppLayout><AdminPage /></AppLayout></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
