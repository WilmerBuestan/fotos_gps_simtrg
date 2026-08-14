import { useState } from 'react'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

export default function LoginPage({ onLogin }: { onLogin: (usuario: any) => void }) {
  const { colors } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await API.post('/auth/login', { username, password })
      localStorage.setItem('token', res.data.accessToken)
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      onLogin(res.data.usuario)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    marginTop: '6px',
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  }
  const labelStyle = { color: colors.textSecondary, fontSize: '12px', fontWeight: 'bold' as const }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      fontFamily: 'var(--font-sans)',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <div className="card animate-in" style={{
        width: '100%',
        maxWidth: '380px',
        padding: '32px 28px',
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            margin: '0 auto 16px',
          }}>
            🎯
          </div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold', color: colors.text }}>SIMTRG</h1>
          <p style={{ margin: 0, fontSize: '12px', color: colors.textTertiary }}>Sistema de Monitoreo Táctico · 29 BIM - GMREC</p>
        </div>

        {error && (
          <div className="animate-in" style={{ backgroundColor: 'rgba(248,81,73,0.12)', border: `1px solid ${colors.danger}`, color: colors.danger, borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: colors.primary,
              color: '#ffffff',
              fontSize: '14px',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
