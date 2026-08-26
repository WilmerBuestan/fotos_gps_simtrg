import { useState, useEffect } from 'react'
import API from './services/api'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FotosPage from './pages/FotosPage'
import EventosPage from './pages/EventosPage'
import HeatmapPage from './pages/HeatmapPage'
import MapaGeoespacialPage from './pages/MapaGeoespacialPage'
import UsuariosPage from './pages/UsuariosPage'
import GestionUsuariosPage from './pages/GestionUsuariosPage'
import CatalogosPage from './pages/CatalogosPage'
import LogsPage from './pages/LogsPage'
import GestorDronesPage from './pages/GestorDronesPage'
import MiPerfilPage from './pages/MiPerfilPage'
import { useTheme } from './contexts/ThemeContext'
import { obtenerGeolocalizacion } from './utils/geolocalizacion'
import { getImageUrl } from './utils/media'

// El bodeguero solo administra inventario de drones — no tiene por qué
// aterrizar en el Dashboard táctico, que además no puede ver.
const paginaInicialParaRol = (rol: string) => (rol === 'BODEGUERO' ? 'gestor-drones' : 'dashboard')

export default function App() {
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const { isDarkMode, toggleDarkMode, colors } = useTheme()

  const iniciarSesion = (u: any) => {
    setUsuario(u)
    setCurrentPage(paginaInicialParaRol(u.rol))
  }

  useEffect(() => {
    const storedUsuario = localStorage.getItem('usuario')
    const storedToken = localStorage.getItem('token')
    if (storedUsuario && storedToken) {
      iniciarSesion(JSON.parse(storedUsuario))
      // La sesión guardada puede tener un JWT vencido (expira a las 8h).
      // Se valida contra el backend; si ya no es válido, el interceptor
      // 401 de api.ts dispara 'auth:unauthorized' y se limpia sola.
      API.get('/usuarios/mi-perfil-completo').catch(() => {})
    }
    setLoading(false)

    if (window.innerWidth < 768) setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const cerrarSesionExpirada = () => setUsuario(null)
    window.addEventListener('auth:unauthorized', cerrarSesionExpirada)
    return () => window.removeEventListener('auth:unauthorized', cerrarSesionExpirada)
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial' }}>Cargando...</div>
  }

  if (!usuario) {
    return <LoginPage onLogin={iniciarSesion} />
  }

  // El bodeguero solo administra el inventario de drones — no ve el
  // resto del sistema táctico (dashboard, mapas, fotos, eventos).
  const navItems = usuario.rol === 'BODEGUERO' ? [] : [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'mapa', label: 'Mapa Geoespacial', icon: '🗺️' },
    { id: 'fotos', label: 'Fotos de Drones', icon: '📸' },
    { id: 'eventos', label: 'Eventos Tácticos', icon: '⚠️' },
    { id: 'heatmap', label: 'Mapa de Calor', icon: '🔥' },
  ]

  const gestionItems = [
    ...(usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'SUPERVISOR'
      ? [{ id: 'usuarios', label: 'Usuarios', icon: '👥' }]
      : []),
    ...(usuario.rol === 'ADMINISTRADOR'
      ? [{ id: 'gestion-usuarios', label: 'Gestionar Usuarios', icon: '🛠️' }]
      : []),
    ...(usuario.rol === 'ADMINISTRADOR'
      ? [{ id: 'catalogos', label: 'Catálogos', icon: '📚' }]
      : []),
    ...(usuario.rol === 'ADMINISTRADOR'
      ? [{ id: 'logs', label: 'Logs de Auditoría', icon: '📋' }]
      : []),
  ]

  const puedeGestionarDrones = usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'BODEGUERO'
  const gestorDronesSubItems = [
    { id: 'gestor-drones-movimientos', label: 'Movimientos', icon: '🔄' },
    { id: 'gestor-drones-inventario', label: 'Inventario', icon: '📦' },
    { id: 'gestor-drones-usuarios', label: 'Tags de usuarios', icon: '🏷️' },
  ]

  const irA = (id: string) => {
    setCurrentPage(id)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-sans)' }}>
      {sidebarOpen && (
        <div className={`sidebar-backdrop${sidebarOpen ? ' sidebar-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <nav
        className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
        onTransitionEnd={() => window.dispatchEvent(new Event('resize'))}
        style={{
          backgroundColor: colors.bgSecondary,
          borderRight: `1px solid ${colors.border}`,
          padding: sidebarOpen ? '15px' : '0',
        }}
      >
        {/* Área con scroll propio: el bloque de abajo (oscuro/cerrar/firma) queda
            fuera de esto para que nunca tape los últimos ítems del menú. */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}>
          <img src="/login/emblema.png" alt="Emblema Unidad" style={{ width: '52px', height: '52px', objectFit: 'contain', marginBottom: '8px' }} />
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: colors.primary }}>SIMTRG</h2>
          <p style={{ margin: '0', fontSize: '11px', color: colors.textTertiary }}>Sistema de Monitoreo Táctico</p>
        </div>

        {navItems.length > 0 && (
          <ul style={{ listStyle: 'none', padding: '0', margin: '0 0 20px 0' }}>
            {navItems.map(item => (
              <li key={item.id} style={{ marginBottom: '6px' }}>
                <button
                  onClick={() => irA(item.id)}
                  className="row-hover"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    backgroundColor: currentPage === item.id ? colors.primary : 'transparent',
                    color: currentPage === item.id ? (isDarkMode ? '#0d1117' : '#ffffff') : colors.text,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: currentPage === item.id ? 'bold' : 'normal',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {(gestionItems.length > 0 || puedeGestionarDrones) && (
          <>
            <hr style={{ margin: '15px 0', borderColor: colors.bgSecondary, borderWidth: '1px 0 0 0' }} />
            <p style={{ margin: '8px 0', fontSize: '11px', color: colors.textTertiary, fontWeight: 'bold' }}>ADMINISTRACIÓN</p>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0 0 20px 0' }}>
              {gestionItems.map(item => (
                <button key={item.id}
                  onClick={() => irA(item.id)}
                  className="row-hover"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    border: 'none',
                    backgroundColor: currentPage === item.id ? colors.primary : 'transparent',
                    color: currentPage === item.id ? (isDarkMode ? '#0d1117' : '#ffffff') : colors.text,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: currentPage === item.id ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              {puedeGestionarDrones && (
                <>
                  <button
                    onClick={() => irA('gestor-drones')}
                    className="row-hover"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: '6px',
                      border: 'none',
                      backgroundColor: currentPage === 'gestor-drones' ? colors.primary : 'transparent',
                      color: currentPage === 'gestor-drones' ? (isDarkMode ? '#0d1117' : '#ffffff') : colors.text,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: currentPage === 'gestor-drones' ? 'bold' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>🚁</span>
                    <span>Gestor de Drones</span>
                  </button>
                  {gestorDronesSubItems.map(item => (
                    <button key={item.id}
                      onClick={() => irA(item.id)}
                      className="row-hover"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 30px',
                        marginBottom: '4px',
                        border: 'none',
                        backgroundColor: currentPage === item.id ? colors.primary : 'transparent',
                        color: currentPage === item.id ? (isDarkMode ? '#0d1117' : '#ffffff') : colors.textSecondary,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: currentPage === item.id ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </>
              )}
            </ul>
          </>
        )}
        </div>

        <div style={{ flexShrink: 0, paddingTop: '12px', marginTop: '8px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              onClick={toggleDarkMode}
              className="btn"
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: colors.bgTertiary,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <button
              onClick={async () => {
                if (!window.confirm('¿Seguro que quieres cerrar sesión?')) return
                // El registro de logout necesita el token vigente, así que se
                // llama ANTES de limpiar localStorage. Nunca debe bloquear el
                // cierre de sesión: errores de red o de geolocalización se ignoran.
                try {
                  const { latitud, longitud } = await obtenerGeolocalizacion()
                  await API.post('/auth/logout', { latitud, longitud })
                } catch {
                  // Cerrar sesión igual aunque falle el registro del evento.
                }
                localStorage.removeItem('token')
                localStorage.removeItem('usuario')
                setUsuario(null)
              }}
              className="btn"
              title="Cerrar sesión"
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: colors.danger,
                color: 'white',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🚪
            </button>
          </div>

          <div style={{ textAlign: 'center', paddingTop: '10px', borderTop: `1px solid ${colors.border}` }}>
            <p style={{ margin: '0 0 2px 0', fontSize: '10px', letterSpacing: '0.3px', color: colors.textTertiary }}>
              💻 Development by: <strong style={{ color: colors.textSecondary }}>Mashi - Wilo</strong>
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '10px', letterSpacing: '0.3px', color: colors.textTertiary }}>
              ⚡ Powered by: <strong style={{ color: colors.textSecondary }}>Sanchez</strong>
            </p>
            <p style={{ margin: 0, fontSize: '10px', letterSpacing: '0.3px', color: colors.textTertiary }}>
              🎖️ Corporate Mentor: <strong style={{ color: colors.textSecondary }}>Capt Muñoz Hugo Fabian</strong>
            </p>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Header */}
        <header style={{
          backgroundColor: colors.bgSecondary,
          borderBottom: `1px solid ${colors.border}`,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: `0 1px 0 ${colors.border}`,
          flexShrink: 0,
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn"
              style={{
                padding: '6px 10px',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Menú"
            >
              ☰
            </button>

            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <h1 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: colors.primary }}>SIMTRG</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: colors.textTertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>29 BIM - GMREC</p>
            </div>
          </div>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px',
                backgroundColor: colors.bgTertiary,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDarkMode ? '#0d1117' : '#ffffff',
                fontWeight: 'bold',
                fontSize: '12px',
                flexShrink: 0,
                backgroundImage: usuario.foto ? `url(${getImageUrl(usuario.foto)})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                {!usuario.foto && usuario.nombreCompleto.charAt(0)}
              </div>
              <span className="hide-on-mobile" style={{ fontSize: '13px' }}>{usuario.nombreCompleto}</span>
            </button>

            {showProfile && (
              <div className="card animate-in" style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                marginTop: '8px',
                padding: '12px',
                minWidth: '220px',
                maxWidth: '80vw',
                zIndex: 1000,
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: colors.text }}>{usuario.nombreCompleto}</p>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: colors.textSecondary }}>{usuario.username}</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: colors.textTertiary }}>🎯 {usuario.rol}</p>
                <button
                  onClick={() => { setCurrentPage('mi-perfil'); setShowProfile(false) }}
                  className="btn"
                  style={{ width: '100%', padding: '8px', backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  👤 Ver mi perfil
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content - Ocupa el espacio restante */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: colors.bg,
        }}>
          {currentPage === 'dashboard' && <div className="page-fade" style={{ padding: '20px' }}><DashboardPage /></div>}
          {currentPage === 'mapa' && <div className="page-fade" style={{ height: '100%' }}><MapaGeoespacialPage /></div>}
          {currentPage === 'fotos' && <div className="page-fade" style={{ padding: '20px' }}><FotosPage /></div>}
          {currentPage === 'eventos' && <div className="page-fade" style={{ padding: '20px' }}><EventosPage /></div>}
          {currentPage === 'heatmap' && <div className="page-fade" style={{ height: '100%' }}><HeatmapPage /></div>}
          {currentPage === 'usuarios' && <div className="page-fade" style={{ padding: '20px' }}><UsuariosPage /></div>}
          {currentPage === 'gestion-usuarios' && <div className="page-fade" style={{ padding: '20px' }}><GestionUsuariosPage /></div>}
          {currentPage === 'catalogos' && <div className="page-fade" style={{ padding: '20px' }}><CatalogosPage /></div>}
          {currentPage === 'logs' && <div className="page-fade" style={{ padding: '20px' }}><LogsPage /></div>}
          {currentPage.startsWith('gestor-drones') && (
            <div className="page-fade" style={{ padding: '20px' }}>
              <GestorDronesPage seccion={
                currentPage === 'gestor-drones-movimientos' ? 'movimientos' :
                currentPage === 'gestor-drones-inventario' ? 'inventario' :
                currentPage === 'gestor-drones-usuarios' ? 'usuarios' : 'dashboard'
              } />
            </div>
          )}
          {currentPage === 'mi-perfil' && <div className="page-fade" style={{ padding: '20px' }}><MiPerfilPage /></div>}
        </main>
      </div>
    </div>
  )
}
