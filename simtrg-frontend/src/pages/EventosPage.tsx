import { useState, useEffect } from 'react'
import API from '../services/api'
import { getImageUrl } from '../utils/media'
import MapaSelectorModal from '../components/MapaSelectorModal'
import { useTheme } from '../contexts/ThemeContext'

const CENTRO_ECUADOR = { latitud: -0.2226, longitud: -78.5125 }

const initialFormData = {
  id: null as string | null,
  fechaHora: new Date().toISOString().slice(0, 16),
  latitud: CENTRO_ECUADOR.latitud,
  longitud: CENTRO_ECUADOR.longitud,
  tipoActividadId: '',
  descripcionDetallada: '',
}

export default function EventosPage() {
  const { colors } = useTheme()
  const [eventos, setEventos] = useState<any[]>([])
  const [tiposActividad, setTiposActividad] = useState<any[]>([])
  const [formData, setFormData] = useState<any>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [eventoFotos, setEventoFotos] = useState<any[]>([])
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    cargarEventos()
    cargarTipos()
  }, [])

  const cargarEventos = async () => {
    try {
      const res = await API.get('/eventos')
      setEventos(res.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setListLoading(false)
    }
  }

  const cargarTipos = async () => {
    try {
      const res = await API.get('/catalogos/tipos-actividad')
      setTiposActividad(res.data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setSelectedFiles([])
    setEventoFotos([])
  }

  const handleEditar = async (evento: any) => {
    setFormData({
      id: evento.id,
      fechaHora: new Date(evento.fechaHora).toISOString().slice(0, 16),
      latitud: evento.latitud,
      longitud: evento.longitud,
      tipoActividadId: evento.tipoActividadId || evento.tipoActividad?.id || '',
      descripcionDetallada: evento.descripcionDetallada,
    })
    setSelectedFiles([])
    try {
      const res = await API.get(`/eventos/${evento.id}`)
      setEventoFotos(res.data?.fotos || [])
    } catch (err) {
      console.error('Error:', err)
      setEventoFotos([])
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev: any) => ({ ...prev, latitud: pos.coords.latitude, longitud: pos.coords.longitude }))
        setGettingLocation(false)
      },
      () => {
        alert('No se pudo obtener tu ubicación actual')
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleFileSelect = (e: any) => {
    setSelectedFiles((prev) => [...prev, ...(Array.from(e.target.files || []) as File[])])
  }

  const handleDrop = (e: any) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files as File[]).filter((f) =>
      ['image/jpeg', 'image/jpg', 'image/png'].includes(f.type),
    )
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        fechaHora: new Date(formData.fechaHora).toISOString(),
        latitud: parseFloat(formData.latitud),
        longitud: parseFloat(formData.longitud),
        tipoActividadId: formData.tipoActividadId,
        descripcionDetallada: formData.descripcionDetallada,
      }

      let eventoId = formData.id
      if (eventoId) {
        await API.patch(`/eventos/${eventoId}`, payload)
      } else {
        const res = await API.post('/eventos', payload)
        eventoId = res.data.id
      }

      if (selectedFiles.length > 0 && eventoId) {
        const fd = new FormData()
        selectedFiles.forEach((f) => fd.append('fotos', f))
        await API.post(`/eventos/${eventoId}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      resetForm()
      await cargarEventos()
    } catch (err) {
      console.error('Error:', err)
      alert('Error al guardar el evento')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar evento?')) return
    try {
      await API.delete(`/eventos/${id}`)
      if (formData.id === id) resetForm()
      cargarEventos()
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar el evento')
    }
  }

  const handleEliminarFoto = async (fotoId: string) => {
    if (!formData.id) return
    if (!confirm('¿Eliminar esta foto?')) return
    try {
      await API.delete(`/eventos/${formData.id}/fotos/${fotoId}`)
      setEventoFotos((prev) => prev.filter((f) => f.id !== fotoId))
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar la foto')
    }
  }

  const inputStyle = { width: '100%', padding: '8px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '12px', fontWeight: 'bold' as const }

  if (listLoading) return <div style={{ color: colors.text }}>Cargando eventos...</div>

  return (
    <div>
      <h2 style={{ color: colors.text, marginBottom: '8px' }}>⚠️ Eventos Tácticos</h2>
      <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>Registra y gestiona novedades georreferenciadas</p>

      {/* Formulario */}
      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>{formData.id ? '✏️ Editar Evento' : 'Registrar Evento'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Fecha y Hora</label>
              <input type="datetime-local" value={formData.fechaHora} onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo Actividad</label>
              <select value={formData.tipoActividadId} onChange={(e) => setFormData({ ...formData, tipoActividadId: e.target.value })} style={inputStyle}>
                <option value="">Selecciona...</option>
                {tiposActividad.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Latitud</label>
              <input type="number" step="0.0001" value={formData.latitud} onChange={(e) => setFormData({ ...formData, latitud: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Longitud</label>
              <input type="number" step="0.0001" value={formData.longitud} onChange={(e) => setFormData({ ...formData, longitud: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setShowMapPicker(true)} className="btn" style={{ padding: '8px 14px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontSize: '12px', fontWeight: 'bold' }}>
              🗺️ Seleccionar en mapa
            </button>
            <button type="button" onClick={usarUbicacionActual} disabled={gettingLocation} className="btn" style={{ padding: '8px 14px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontSize: '12px', fontWeight: 'bold' }}>
              {gettingLocation ? '⏳ Obteniendo...' : '🎯 Ubicación actual'}
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Descripción</label>
            <textarea value={formData.descripcionDetallada} onChange={(e) => setFormData({ ...formData, descripcionDetallada: e.target.value })} style={{ ...inputStyle, height: '90px', resize: 'vertical' as const }} />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Fotos</label>
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} style={{ border: `2px dashed ${colors.border}`, padding: '16px', borderRadius: '6px', marginTop: '4px', textAlign: 'center', backgroundColor: colors.bg, cursor: 'pointer' }}>
              <input type="file" multiple accept="image/jpeg,image/png" onChange={handleFileSelect} id="evento-file-input" style={{ display: 'none' }} />
              <label htmlFor="evento-file-input" style={{ cursor: 'pointer', color: colors.textSecondary, fontSize: '12px' }}>
                📁 Arrastra fotos aquí o haz clic para agregar
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', padding: '4px 8px', fontSize: '11px', color: colors.text }}>
                    {f.name}
                    <button type="button" onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {formData.id && eventoFotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', marginTop: '10px' }}>
                {eventoFotos.map((foto) => {
                  const url = getImageUrl(foto.rutaMiniatura)
                  return (
                    <div key={foto.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${colors.border}`, height: '80px' }}>
                      {url ? <img src={url} alt={foto.nombreArchivo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      <button type="button" onClick={() => handleEliminarFoto(foto.id)} style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '11px', lineHeight: 1 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} className="btn" style={{ padding: '10px 20px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', fontSize: '13px', opacity: loading ? 0.6 : 1 }}>
              {loading ? '⏳ Guardando...' : formData.id ? '💾 Actualizar' : 'Registrar'}
            </button>
            {formData.id && (
              <button type="button" onClick={resetForm} className="btn" style={{ padding: '10px 20px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, fontSize: '13px' }}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Eventos ({eventos.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Tipo</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Fecha</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Coordenadas</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Descripción</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="row-hover" style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '10px', color: colors.text, fontSize: '12px' }}>{e.tipoActividad?.nombre || e.tipoActividadNombre || 'N/A'}</td>
                  <td style={{ padding: '10px', color: colors.text, fontSize: '12px' }}>{new Date(e.fechaHora).toLocaleDateString('es-EC')}</td>
                  <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '11px' }}>{e.latitud.toFixed(4)}, {e.longitud.toFixed(4)}</td>
                  <td style={{ padding: '10px', color: colors.text, fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.descripcionDetallada}</td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => handleEditar(e)} className="btn" style={{ padding: '5px 10px', backgroundColor: '#58a6ff', color: 'white', fontSize: '11px', marginRight: '6px' }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="btn" style={{ padding: '5px 10px', backgroundColor: '#f85149', color: 'white', fontSize: '11px' }}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showMapPicker && (
        <MapaSelectorModal
          latInicial={parseFloat(formData.latitud)}
          lonInicial={parseFloat(formData.longitud)}
          colors={colors}
          onCerrar={() => setShowMapPicker(false)}
          onConfirmar={(lat, lon) => {
            setFormData((prev: any) => ({ ...prev, latitud: lat, longitud: lon }))
            setShowMapPicker(false)
          }}
        />
      )}
    </div>
  )
}
