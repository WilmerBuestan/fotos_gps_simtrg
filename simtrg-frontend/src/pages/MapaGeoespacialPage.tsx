import { useState, useEffect } from 'react'
import { MapContainer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import API from '../services/api'
import { getImageUrl } from '../utils/media'
import { useTheme } from '../contexts/ThemeContext'
import CapasBaseMapa from '../components/CapasBaseMapa'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapaGeoespacialPage() {
  const { colors } = useTheme()
  const [fotos, setFotos] = useState([])
  const [eventos, setEventos] = useState([])
  const [filtros, setFiltros] = useState({ fechas: [], operadores: [] })
  const [operadoresMap, setOperadoresMap] = useState({})
  const [mapView, setMapView] = useState('fotos')
  const [selectedFechaInicio, setSelectedFechaInicio] = useState('')
  const [selectedFechaFin, setSelectedFechaFin] = useState('')
  const [selectedOperador, setSelectedOperador] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [selectedFotoIndex, setSelectedFotoIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [timelineMode, setTimelineMode] = useState(false)
  const [timelineTs, setTimelineTs] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [velocidad, setVelocidad] = useState(1)

  useEffect(() => {
    cargarDatos()
    cargarFiltros()
    cargarOperadores()
  }, [])

  const cargarDatos = async () => {
    try {
      const [fotosRes, eventosRes] = await Promise.all([
        API.get('/drones'),
        API.get('/eventos'),
      ])
      setFotos(fotosRes.data.filter(f => f.latitud && f.longitud) || [])
      setEventos(eventosRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const cargarFiltros = async () => {
    try {
      const res = await API.get('/drones/filtros')
      setFiltros(res.data || { fechas: [], operadores: [] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const cargarOperadores = async () => {
    try {
      const res = await API.get('/usuarios')
      const map = {}
      res.data.forEach(u => {
        map[u.id] = u.nombreCompleto || u.username
      })
      setOperadoresMap(map)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fotosFiltradas = fotos.filter(foto => {
    if (selectedFechaInicio || selectedFechaFin) {
      const fechaFoto = new Date(foto.fechaCaptura || foto.createdAt)
      if (selectedFechaInicio) {
        const inicio = new Date(selectedFechaInicio)
        if (fechaFoto < inicio) return false
      }
      if (selectedFechaFin) {
        const fin = new Date(selectedFechaFin)
        fin.setHours(23, 59, 59)
        if (fechaFoto > fin) return false
      }
    }
    if (selectedOperador && selectedOperador !== '') {
      if (foto.operadorId !== selectedOperador) return false
    }
    return true
  })

  const agruparFotosPorUbicacion = () => {
    const grupos = {}
    fotosFiltradas.forEach(foto => {
      const key = `${foto.latitud.toFixed(4)},${foto.longitud.toFixed(4)}`
      if (!grupos[key]) {
        grupos[key] = { lat: foto.latitud, lon: foto.longitud, fotos: [] }
      }
      grupos[key].fotos.push(foto)
    })
    return Object.values(grupos)
  }

  const eventosFiltrados = eventos.filter(evento => {
    if (selectedFechaInicio || selectedFechaFin) {
      const fechaEvento = new Date(evento.fechaHora)
      if (selectedFechaInicio) {
        const inicio = new Date(selectedFechaInicio)
        if (fechaEvento < inicio) return false
      }
      if (selectedFechaFin) {
        const fin = new Date(selectedFechaFin)
        fin.setHours(23, 59, 59)
        if (fechaEvento > fin) return false
      }
    }
    if (selectedOperador && selectedOperador !== '') {
      if (evento.operadorId !== selectedOperador) return false
    }
    return true
  })

  const eventosOrdenados = [...eventosFiltrados].sort((a: any, b: any) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
  const rangoTimeline = eventosOrdenados.length > 0
    ? { min: new Date(eventosOrdenados[0].fechaHora).getTime(), max: new Date(eventosOrdenados[eventosOrdenados.length - 1].fechaHora).getTime() }
    : null

  useEffect(() => {
    if (timelineMode && rangoTimeline) {
      setTimelineTs(rangoTimeline.min)
      setIsPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineMode, rangoTimeline?.min, rangoTimeline?.max])

  useEffect(() => {
    if (!isPlaying || !rangoTimeline) return
    const totalSteps = 200
    const step = (rangoTimeline.max - rangoTimeline.min) / totalSteps
    const id = setInterval(() => {
      setTimelineTs(prev => {
        const next = (prev ?? rangoTimeline.min) + step * velocidad
        if (next >= rangoTimeline.max) {
          setIsPlaying(false)
          return rangoTimeline.max
        }
        return next
      })
    }, 100)
    return () => clearInterval(id)
  }, [isPlaying, rangoTimeline?.min, rangoTimeline?.max, velocidad])

  const eventosVisibles = timelineMode && rangoTimeline
    ? eventosOrdenados.filter((e: any) => new Date(e.fechaHora).getTime() <= (timelineTs ?? rangoTimeline.max))
    : eventosFiltrados

  const progresoTimeline = rangoTimeline && rangoTimeline.max > rangoTimeline.min
    ? ((timelineTs ?? rangoTimeline.min) - rangoTimeline.min) / (rangoTimeline.max - rangoTimeline.min) * 100
    : 100

  if (loading) return <div style={{ color: colors.text, padding: '20px' }}>Cargando...</div>

  const fotosAgrupadas = agruparFotosPorUbicacion()
  const currentFoto = selectedMarker?.tipo === 'foto' && selectedMarker?.fotos ? selectedMarker.fotos[selectedFotoIndex] : selectedMarker?.data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: colors.bg }}>
      {/* Header */}
      <div style={{ padding: '15px 20px', backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <h2 style={{ color: colors.text, margin: '0 0 8px 0' }}>🗺️ Mapa Geoespacial</h2>
        <p style={{ color: colors.textSecondary, margin: '0', fontSize: '12px' }}>Ecuador - {mapView === 'fotos' ? fotosFiltradas.length : eventosFiltrados.length} resultado(s)</p>
      </div>

      {/* Controles */}
      <div style={{ padding: '10px 20px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => setMapView('fotos')} className="btn" style={{ padding: '8px 16px', backgroundColor: mapView === 'fotos' ? '#58a6ff' : colors.bgCard, color: mapView === 'fotos' ? 'white' : colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold', fontSize: '13px' }}>📸 Fotos ({fotosFiltradas.length})</button>
          <button onClick={() => setMapView('eventos')} className="btn" style={{ padding: '8px 16px', backgroundColor: mapView === 'eventos' ? '#58a6ff' : colors.bgCard, color: mapView === 'eventos' ? 'white' : colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold', fontSize: '13px' }}>⚠️ Eventos ({eventosFiltrados.length})</button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn" style={{ padding: '8px 16px', backgroundColor: colors.bgCard, color: colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold', fontSize: '13px' }}>🔍 Filtros</button>
          {mapView === 'eventos' && (
            <button onClick={() => setTimelineMode(!timelineMode)} className="btn" style={{ padding: '8px 16px', backgroundColor: timelineMode ? '#58a6ff' : colors.bgCard, color: timelineMode ? 'white' : colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold', fontSize: '13px' }}>🕐 Línea de tiempo</button>
          )}
        </div>

        {mapView === 'eventos' && timelineMode && rangoTimeline && (
          <div className="card animate-in" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: colors.bgCard, marginBottom: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setIsPlaying(p => !p)} className="btn" style={{ padding: '6px 12px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
              {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
            </button>
            <button onClick={() => { setTimelineTs(rangoTimeline.min); setIsPlaying(false) }} className="btn" style={{ padding: '6px 12px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontSize: '12px' }}>
              ⏮️ Reiniciar
            </button>
            <select value={velocidad} onChange={(e) => setVelocidad(Number(e.target.value))} style={{ padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', fontSize: '12px' }}>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
            <input
              type="range"
              min={0}
              max={100}
              value={progresoTimeline}
              onChange={(e) => {
                setIsPlaying(false)
                setTimelineTs(rangoTimeline.min + (rangoTimeline.max - rangoTimeline.min) * (Number(e.target.value) / 100))
              }}
              style={{ flex: 1, minWidth: '150px' }}
            />
            <span style={{ color: colors.text, fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {timelineTs ? new Date(timelineTs).toLocaleDateString('es-EC') : ''} · {eventosVisibles.length}/{eventosOrdenados.length}
            </span>
          </div>
        )}

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '10px', backgroundColor: colors.bgCard, borderRadius: '6px' }}>
            <div>
              <label style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'bold' }}>Desde</label>
              <input type="date" value={selectedFechaInicio} onChange={(e) => setSelectedFechaInicio(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'bold' }}>Hasta</label>
              <input type="date" value={selectedFechaFin} onChange={(e) => setSelectedFechaFin(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'bold' }}>Operador</label>
              <select value={selectedOperador} onChange={(e) => setSelectedOperador(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '12px' }}>
                <option value="">Todos</option>
                {filtros.operadores && filtros.operadores.map(id => <option key={id} value={id}>{operadoresMap[id] || id}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: colors.border, minHeight: '0' }}>
        <MapContainer center={[-0.2226, -78.5125]} zoom={10} style={{ width: '100%', height: '100%' }}>
          <CapasBaseMapa predeterminada="satelital" />

          {mapView === 'fotos' && fotosAgrupadas.map((grupo, idx) => (
            <Marker key={idx} position={[grupo.lat, grupo.lon]} eventHandlers={{ click: () => { setSelectedMarker({ tipo: 'foto', fotos: grupo.fotos }); setSelectedFotoIndex(0); } }}>
              <Popup><div style={{ fontSize: '12px' }}><strong>{grupo.fotos.length} foto(s)</strong></div></Popup>
            </Marker>
          ))}

          {mapView === 'eventos' && eventosVisibles.map((evento: any) => (
            <Marker key={evento.id} position={[evento.latitud, evento.longitud]} eventHandlers={{ click: () => setSelectedMarker({ tipo: 'evento', data: evento }) }}>
              <Popup><div style={{ fontSize: '12px' }}><strong>{evento.tipoActividad?.nombre}</strong></div></Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Panel de detalles */}
        {selectedMarker && (() => {
          return (
            <div className="card animate-in" style={{ position: 'absolute', bottom: '20px', right: '20px', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, padding: '15px', width: '380px', maxHeight: '600px', overflowY: 'auto', boxShadow: 'var(--shadow-md)', zIndex: 1000 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: colors.text, margin: '0', fontSize: '14px', fontWeight: 'bold' }}>{selectedMarker.tipo === 'foto' ? '📸 Foto' : '⚠️ Evento'}</h3>
                <button onClick={() => setSelectedMarker(null)} style={{ backgroundColor: 'transparent', border: 'none', color: colors.text, fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              {selectedMarker.tipo === 'foto' && (
                <>
                  {getImageUrl(currentFoto.rutaMiniatura) && (
                    <div style={{ marginBottom: '15px' }}>
                      <img src={getImageUrl(currentFoto.rutaMiniatura)!} alt={currentFoto.nombreArchivo} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', marginBottom: '8px' }} onClick={() => setShowPreview(true)} />
                      <button onClick={() => setShowPreview(true)} style={{ width: '100%', padding: '8px', backgroundColor: '#58a6ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>🔍 Ampliar</button>
                    </div>
                  )}

                  {selectedMarker.fotos.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', justifyContent: 'center' }}>
                      {selectedMarker.fotos.map((_, i) => (
                        <button key={i} onClick={() => setSelectedFotoIndex(i)} style={{ width: '30px', height: '30px', backgroundColor: selectedFotoIndex === i ? '#58a6ff' : colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div style={{ backgroundColor: colors.bg, padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                <h4 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>📍 Ubicación</h4>
                <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.8' }}>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Lat:</strong> {currentFoto.latitud.toFixed(4)}°</p>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Lon:</strong> {currentFoto.longitud.toFixed(4)}°</p>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Provincia:</strong> {currentFoto.provincia || 'Desconocida'}</p>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Cantón:</strong> {currentFoto.canton || 'Desconocido'}</p>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Parroquia:</strong> {currentFoto.parroquia || 'Desconocida'}</p>
                </div>
              </div>

              <div style={{ backgroundColor: colors.bg, padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                <h4 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>📅 Temporal</h4>
                <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.8' }}>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Fecha:</strong> {new Date(currentFoto.fechaCaptura || currentFoto.fechaHora || currentFoto.createdAt).toLocaleDateString('es-EC')}</p>
                  <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Hora:</strong> {new Date(currentFoto.fechaCaptura || currentFoto.fechaHora || currentFoto.createdAt).toLocaleTimeString('es-EC')}</p>
                </div>
              </div>

              <div style={{ backgroundColor: colors.bg, padding: '12px', borderRadius: '6px' }}>
                <h4 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>ℹ️ Info</h4>
                <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.8' }}>
                  {selectedMarker.tipo === 'foto' ? (
                    <>
                      <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Archivo:</strong> {currentFoto.nombreArchivo}</p>
                      <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Tamaño:</strong> {(currentFoto.tamanoBytes / 1024).toFixed(2)} KB</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Tipo:</strong> {currentFoto.tipoActividad?.nombre}</p>
                      <p style={{ margin: '3px 0' }}><strong style={{ color: colors.text }}>Desc:</strong> {currentFoto.descripcion}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Estadísticas */}
      <div style={{ padding: '15px 20px', backgroundColor: colors.bgCard, borderTop: `1px solid ${colors.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}><p style={{ color: colors.textSecondary, margin: '0 0 5px 0', fontSize: '12px' }}>📸</p><p style={{ color: '#58a6ff', fontSize: '20px', fontWeight: 'bold', margin: '0' }}>{fotosFiltradas.length}</p></div>
        <div style={{ textAlign: 'center' }}><p style={{ color: colors.textSecondary, margin: '0 0 5px 0', fontSize: '12px' }}>⚠️</p><p style={{ color: '#ffa657', fontSize: '20px', fontWeight: 'bold', margin: '0' }}>{eventosFiltrados.length}</p></div>
        <div style={{ textAlign: 'center' }}><p style={{ color: colors.textSecondary, margin: '0 0 5px 0', fontSize: '12px' }}>🌍</p><p style={{ color: '#3fb950', fontSize: '20px', fontWeight: 'bold', margin: '0' }}>Ecuador</p></div>
      </div>

      {/* Preview */}
      {showPreview && selectedMarker?.tipo === 'foto' && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowPreview(false)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img src={getImageUrl(currentFoto.rutaMiniatura)!} alt={currentFoto.nombreArchivo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <button onClick={() => setShowPreview(false)} style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
