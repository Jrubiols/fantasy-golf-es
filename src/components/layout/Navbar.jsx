import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/draft', label: 'Mi Equipo' },
  { to: '/league', label: 'Mi Liga' },
  { to: '/leaderboard', label: 'Ranking' },
]

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav style={{ background: 'rgba(13, 40, 24, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(201, 168, 76, 0.15)' }} className="sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span style={{ fontSize: '1.3rem' }}>⛳</span>
          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Playfair Display, serif' }}>
            FantasyGolf<span style={{ color: 'var(--text-primary)' }}>ES</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              color: location.pathname === to ? 'var(--gold)' : 'var(--text-muted)',
              fontWeight: location.pathname === to ? 600 : 400,
              fontSize: '0.9rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              background: location.pathname === to ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
              transition: 'all 0.15s',
            }}>
              {label}
            </Link>
          ))}
          {profile?.isAdmin && (
            <Link to="/admin" style={{ color: '#e57373', fontSize: '0.85rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
              Admin
            </Link>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-3">
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.3)' }} />
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} className="hidden md:block">
              {user.displayName?.split(' ')[0]}
            </span>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#e57373', border: '1px solid rgba(229,115,115,0.3)', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
              Salir
            </button>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-2 px-2" style={{ background: 'rgba(13, 40, 24, 0.95)', borderTop: '1px solid rgba(201, 168, 76, 0.15)', backdropFilter: 'blur(16px)' }}>
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to} style={{ color: location.pathname === to ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0.3rem 0.5rem' }}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
