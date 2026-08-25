import { useState, useEffect, useRef } from 'react'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { getImageUrl } from '../utils/media'

export default function MiPerfilPage() {
  const { colors, isDarkMode } = useTheme()
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ nombre: '', apellido: '', grado: '', fechaNacimiento: '', cedula: '', chapa: '' })
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [previewFoto, setPreviewFoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarPerfil = async () => {
    setLoading(true)
    try {
      const res = await API.get('/usuarios/mi-perfil-completo')
      setPerfil(res.data)
      setFormData({
        nombre: res.data.nombre || '',
        apellido: res.data.apellido || '',
        grado: res.data.grado || '',
        fechaNacimiento: res.data.fechaNacimiento ? res.data.fechaNacimiento.slice(0, 10) : '',
        cedula: res.data.cedula || '',
        chapa: res.data.chapa || '',
      })
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarPerfil()
  }, [])

  const handleFotoChange = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivoFoto(file)
    setPreviewFoto(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMensaje('')
    try {
      const res = await API.patch('/usuarios/mi-perfil', {
        nombre: formData.nombre,
        apellido: formData.apellido,
        grado: formData.grado.trim() || undefined,
        fechaNacimiento: formData.fechaNacimiento || undefined,
        cedula: formData.cedula.trim() || undefined,
        chapa: formData.chapa.trim() || undefined,
      })

      let fotoActualizada = perfil?.foto
      if (archivoFoto) {
        const fd = new FormData()
        fd.append('foto', archivoFoto)
        const resFoto = await API.post(`/usuarios/${perfil.id}/foto`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        fotoActualizada = resFoto.data.foto
      }

      const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}')
      localStorage.setItem('usuario', JSON.stringify({
        ...usuarioLocal,
        nombreCompleto: res.data.nombreCompleto,
        foto: fotoActualizada,
      }))

      setMensaje('Perfil actualizado correctamente.')
      setArchivoFoto(null)
      cargarPerfil()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '12px', fontWeight: 'bold' as const }

  if (loading) return <div style={{ color: colors.text }}>Cargando...</div>

  const fotoUrl = previewFoto || getImageUrl(perfil?.foto)
  const iniciales = `${formData.nombre?.[0] || ''}${formData.apellido?.[0] || ''}`.toUpperCase()

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: colors.text, margin: '0 0 8px 0' }}>👤 Mi Perfil</h2>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Edita tus datos personales y tu foto de perfil</p>
      </div>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '24px', border: `1px solid ${colors.border}` }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '80px', height: '80px', borderRadius: '50%', cursor: 'pointer',
                backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 'bold', flexShrink: 0, overflow: 'hidden',
                border: `2px solid ${colors.border}`,
                backgroundImage: fotoUrl ? `url(${fotoUrl})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}
              title="Click para cambiar la foto"
            >
              {!fotoUrl && (iniciales || '👤')}
            </div>
            <div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                📷 Cambiar foto
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFotoChange} style={{ display: 'none' }} />
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: colors.textTertiary }}>JPG o PNG, máx. 5MB</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Nombres</label>
              <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Apellidos</label>
              <input type="text" value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Grado</label>
              <input type="text" value={formData.grado} onChange={(e) => setFormData({ ...formData, grado: e.target.value })} style={inputStyle} placeholder="Ej. Capt, Tnte, Sgto" />
            </div>
            <div>
              <label style={labelStyle}>Chapa (alias)</label>
              <input type="text" value={formData.chapa} onChange={(e) => setFormData({ ...formData, chapa: e.target.value })} style={inputStyle} placeholder="Ej. Halcón" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div>
              <label style={labelStyle}>Fecha de nacimiento</label>
              <input type="date" value={formData.fechaNacimiento} onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cédula</label>
              <input type="text" value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {error && <p style={{ color: '#f85149', fontSize: '12px', marginBottom: '14px' }}>{error}</p>}
          {mensaje && <p style={{ color: '#3fb950', fontSize: '12px', marginBottom: '14px' }}>{mensaje}</p>}

          <button type="submit" disabled={saving} className="btn" style={{ padding: '10px 24px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
