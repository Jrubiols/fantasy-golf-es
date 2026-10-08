// Tema claro / oscuro. La preferencia ('auto', 'light', 'dark') se guarda en este navegador;
// index.html aplica la guardada antes de pintar para que no haya parpadeo.
const KEY = 'fg-theme'
const COLORS = { light: '#f6f5f1', dark: '#0b1410' }

export function getThemePref() {
  try { return localStorage.getItem(KEY) ?? 'auto' } catch { return 'auto' }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function applyTheme(pref = getThemePref()) {
  const theme = pref === 'auto' ? (systemDark() ? 'dark' : 'light') : pref
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref) } catch { /* solo esta sesión */ }
  applyTheme(pref)
}

/** En automático, sigue los cambios del sistema (por ejemplo, al anochecer). */
export function watchSystemTheme() {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onChange = () => { if (getThemePref() === 'auto') applyTheme('auto') }
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}
