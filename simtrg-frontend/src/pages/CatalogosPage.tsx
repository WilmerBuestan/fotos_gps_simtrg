import { useState, useEffect } from 'react'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

export default function CatalogosPage() {
  const { colors } = useTheme()
  const [tipos, setTipos] = useState<any[]>([])
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarTipos()
  }, [])

  const cargarTipos = async () => {
    try {
      const res = await API.get('/catalogos/tipos-actividad')
      setTipos(res.data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      await API.post('/catalogos/tipos-actividad', formData)
      setFormData({ nombre: '', descripcion: '' })
      cargarTipos()
    } catch (err: any) {
      console.error('Error:', err)
      alert(err.response?.data?.message || 'Error al crear tipo')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await API.patch(`/catalogos/tipos-actividad/${id}/toggle`, {})
      cargarTipos()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const inputStyle = { width: '100%', padding: '8px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '12px', fontWeight: 'bold' as const }

  return (
    <div>
      <h2 style={{ color: colors.text, marginBottom: '8px' }}>📚 Catálogos - Tipos de Actividad</h2>
      <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>Administra los tipos de actividad usados en eventos tácticos</p>

      <div className="card" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Crear Tipo de Actividad</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Nombre</label>
            <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Descripción</label>
            <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} style={{ ...inputStyle, height: '80px', resize: 'vertical' as const }} />
          </div>
          <button type="submit" disabled={loading} className="btn" style={{ padding: '10px 20px', backgroundColor: '#3fb950', color: 'white', fontSize: '13px', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creando...' : 'Crear Tipo'}
          </button>
        </form>
      </div>

      <div className="card" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Tipos Disponibles ({tipos.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {tipos.map(tipo => (
            <div key={tipo.id} className="card card-hover" style={{ padding: '15px', border: `1px solid ${tipo.activo ? colors.success : colors.border}`, backgroundColor: colors.bg }}>
              <h4 style={{ margin: '0 0 8px 0', color: colors.text }}>{tipo.nombre}</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: colors.textSecondary }}>{tipo.descripcion}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ padding: '4px 8px', backgroundColor: tipo.activo ? colors.success : colors.danger, color: 'white', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  {tipo.activo ? '✓ Activo' : '✗ Inactivo'}
                </span>
                <button onClick={() => handleToggle(tipo.id)} className="btn" style={{ padding: '5px 10px', backgroundColor: colors.primary, color: 'white', fontSize: '11px' }}>
                  {tipo.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
