import { useState, useEffect, useRef } from 'react'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import UbicacionMiniMapa from '../components/UbicacionMiniMapa'
import { getImageUrl } from '../utils/media'

const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')

const initialFormData = {
  id: null as string | null,
  nombre: '',
  apellido: '',
  username: '',
  password: '',
  rol: 'OPERADOR',
  activo: true,
  tagRfid: '',
  grado: '',
  fechaNacimiento: '',
  cedula: '',
  chapa: '',
}

export default function GestionUsuariosPage() {
  const { colors, isDarkMode } = useTheme()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<any>(initialFormData)
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [previewFoto, setPreviewFoto] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editando = formData.id !== null

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    try {
      const res = await API.get('/usuarios')
      setUsuarios(res.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setListLoading(false)
    }
  }

  const abrirCrear = () => {
    setFormData(initialFormData)
    setUsuarioEditando(null)
    setError('')
    setShowModal(true)
  }

  const abrirEditar = (usr: any) => {
    setFormData({
      id: usr.id,
      nombre: usr.nombre,
      apellido: usr.apellido,
      username: usr.username,
      password: '',
      rol: usr.rol,
      activo: usr.activo,
      tagRfid: usr.tagRfid || '',
      grado: usr.grado || '',
      fechaNacimiento: usr.fechaNacimiento ? usr.fechaNacimiento.slice(0, 10) : '',
      cedula: usr.cedula || '',
      chapa: usr.chapa || '',
    })
    setUsuarioEditando(usr)
    setArchivoFoto(null)
    setPreviewFoto(null)
    setError('')
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setFormData(initialFormData)
    setUsuarioEditando(null)
    setArchivoFoto(null)
    setPreviewFoto(null)
    setError('')
  }

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

    try {
      const tagRfid = formData.tagRfid.trim() || null
      if (editando) {
        const payload: any = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          rol: formData.rol,
          activo: formData.activo,
          tagRfid,
          grado: formData.grado.trim() || undefined,
          fechaNacimiento: formData.fechaNacimiento || undefined,
          cedula: formData.cedula.trim() || undefined,
          chapa: formData.chapa.trim() || undefined,
        }
        if (formData.password) payload.nuevaPassword = formData.password
        await API.patch(`/usuarios/${formData.id}`, payload)
        if (archivoFoto) {
          setSubiendoFoto(true)
          const fd = new FormData()
          fd.append('foto', archivoFoto)
          await API.post(`/usuarios/${formData.id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          setSubiendoFoto(false)
        }
      } else {
        await API.post('/usuarios', {
          nombre: formData.nombre,
          apellido: formData.apellido,
          username: formData.username,
          password: formData.password,
          rol: formData.rol,
          tagRfid,
        })
      }
      cerrarModal()
      cargarUsuarios()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (usr: any) => {
    try {
      await API.patch(`/usuarios/${usr.id}`, { activo: !usr.activo })
      cargarUsuarios()
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el estado del usuario')
    }
  }

  const handleDelete = async (usr: any) => {
    if (!window.confirm(`¿Eliminar permanentemente a ${usr.nombreCompleto}? Esta acción no se puede deshacer.`)) return
    try {
      await API.delete(`/usuarios/${usr.id}`)
      cargarUsuarios()
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el usuario')
    }
  }

  const inputStyle = { width: '100%', padding: '9px 10px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '12px', fontWeight: 'bold' as const }

  const rolColor = (rol: string) =>
    rol === 'ADMINISTRADOR' ? '#f85149' : rol === 'SUPERVISOR' ? '#ffa657' : rol === 'BODEGUERO' ? '#a371f7' : '#58a6ff'

  if (listLoading) return <div style={{ color: colors.text }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: colors.text, margin: '0 0 8px 0' }}>🛠️ Gestionar Usuarios</h2>
          <p style={{ color: colors.textSecondary, margin: 0 }}>Crea, edita, elimina y administra cuentas y roles del sistema</p>
        </div>
        <button onClick={abrirCrear} className="btn" style={{ padding: '10px 20px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          + Nuevo Usuario
        </button>
      </div>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Usuarios del Sistema ({usuarios.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Nombre</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Rol</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Estado</th>
                <th style={{ padding: '10px', textAlign: 'right', color: colors.textSecondary, fontSize: '12px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(usr => {
                const esUno = usr.id === usuarioActual.id
                return (
                  <tr key={usr.id} className="row-hover" style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '10px', color: colors.text, fontSize: '13px' }}>
                      {usr.nombreCompleto} {esUno && <span style={{ color: colors.textTertiary, fontSize: '11px' }}>(tú)</span>}
                      <div style={{ fontSize: '11px', color: colors.textSecondary }}>{usr.username}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: rolColor(usr.rol), color: 'white', borderRadius: '4px', fontSize: '11px' }}>{usr.rol}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: usr.activo ? '#3fb950' : '#8b949e', color: 'white', borderRadius: '4px', fontSize: '11px' }}>
                        {usr.activo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEditar(usr)} className="btn" style={{ padding: '6px 10px', marginRight: '6px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(usr)}
                        disabled={esUno && usr.activo}
                        title={esUno && usr.activo ? 'No puedes desactivar tu propia cuenta' : ''}
                        className="btn"
                        style={{ padding: '6px 10px', marginRight: '6px', backgroundColor: 'transparent', color: usr.activo ? '#ffa657' : '#3fb950', border: `1px solid ${usr.activo ? '#ffa657' : '#3fb950'}`, borderRadius: '5px', fontSize: '12px', cursor: esUno && usr.activo ? 'not-allowed' : 'pointer', opacity: esUno && usr.activo ? 0.4 : 1 }}
                      >
                        {usr.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => handleDelete(usr)}
                        disabled={esUno}
                        title={esUno ? 'No puedes eliminar tu propia cuenta' : ''}
                        className="btn"
                        style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: '5px', fontSize: '12px', cursor: esUno ? 'not-allowed' : 'pointer', opacity: esUno ? 0.4 : 1 }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={cerrarModal}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '440px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={cerrarModal} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input type="text" value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} style={inputStyle} required />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Usuario</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={{ ...inputStyle, opacity: editando ? 0.6 : 1 }} required disabled={editando} />
                {editando && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: colors.textTertiary }}>El nombre de usuario no se puede cambiar.</p>}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>{editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={inputStyle} placeholder={editando ? 'Dejar en blanco para no cambiarla' : ''} required={!editando} minLength={8} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editando ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '18px' }}>
                <div>
                  <label style={labelStyle}>Rol</label>
                  <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })} style={inputStyle}>
                    <option value="OPERADOR">Operador</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="BODEGUERO">Bodeguero</option>
                  </select>
                </div>
                {editando && (
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select value={formData.activo ? '1' : '0'} onChange={(e) => setFormData({ ...formData, activo: e.target.value === '1' })} style={inputStyle}>
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>

              {editando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                      backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                      border: `2px solid ${colors.border}`, overflow: 'hidden',
                      backgroundImage: (previewFoto || getImageUrl(usuarioEditando?.foto)) ? `url(${previewFoto || getImageUrl(usuarioEditando?.foto)})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}
                  >
                    {!(previewFoto || usuarioEditando?.foto) && '👤'}
                  </div>
                  <div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn" style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>
                      📷 Cambiar foto
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFotoChange} style={{ display: 'none' }} />
                    {subiendoFoto && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: colors.textSecondary }}>Subiendo...</p>}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Grado</label>
                  <input type="text" value={formData.grado} onChange={(e) => setFormData({ ...formData, grado: e.target.value })} style={inputStyle} placeholder="Ej. Capt, Tnte" />
                </div>
                <div>
                  <label style={labelStyle}>Chapa (alias)</label>
                  <input type="text" value={formData.chapa} onChange={(e) => setFormData({ ...formData, chapa: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Fecha de nacimiento</label>
                  <input type="date" value={formData.fechaNacimiento} onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cédula</label>
                  <input type="text" value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Tag RFID (opcional)</label>
                <input type="text" value={formData.tagRfid} onChange={(e) => setFormData({ ...formData, tagRfid: e.target.value.toUpperCase() })} style={inputStyle} placeholder="Ej. 04A3B2C1" />
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: colors.textTertiary }}>
                  UID de la tarjeta personal para el Gestor de Drones. Se puede dejar en blanco y asignar después.
                </p>
              </div>

              {editando && usuarioEditando && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Última ubicación conocida</label>
                  {usuarioEditando.ultimaUbicacionLat != null && usuarioEditando.ultimaUbicacionLon != null ? (
                    <div style={{ marginTop: '6px' }}>
                      <UbicacionMiniMapa lat={usuarioEditando.ultimaUbicacionLat} lon={usuarioEditando.ultimaUbicacionLon} height="140px" />
                      <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: colors.textSecondary }}>
                        {[usuarioEditando.ultimaUbicacionParroquia, usuarioEditando.ultimaUbicacionCanton, usuarioEditando.ultimaUbicacionProvincia].filter(Boolean).join(', ') || 'Fuera de zonas conocidas'}
                        {' · '}
                        {usuarioEditando.ultimaUbicacionLat.toFixed(4)}°, {usuarioEditando.ultimaUbicacionLon.toFixed(4)}°
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.textTertiary }}>Sin registro (se captura al iniciar/cerrar sesión).</p>
                  )}
                </div>
              )}

              {error && (
                <p style={{ color: '#f85149', fontSize: '12px', marginTop: '-8px', marginBottom: '14px' }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={cerrarModal} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
