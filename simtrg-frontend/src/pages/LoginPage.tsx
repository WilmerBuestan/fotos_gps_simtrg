import { useState } from 'react'
import API from '../services/api'

export default function LoginPage({ onLogin }: { onLogin: (usuario: any) => void }) {
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

  return (
    <div className="login-page">
      <div className="scanline" />

      <div className="login-container">
        <div className="login-panel">
          <div className="screw top-left" />
          <div className="screw top-right" />
          <div className="screw bottom-left" />
          <div className="screw bottom-right" />

          <div className="panel-header">
            <img src="/login/emblema.png" alt="Emblema Unidad" className="logo" />
            <h1>SIMTRG</h1>
            <p>Sistema de Monitoreo Táctico · 29 BIM - GMREC</p>
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="login-footer">
            <p>Desarrollado por: <strong>Mashi - Wilo</strong></p>
            <p>Powered by: <strong>Sanchez</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
