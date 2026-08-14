import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import 'leaflet/dist/leaflet.css'

const CENTRO_ECUADOR: [number, number] = [-1.3, -78.4]

export default function DashboardPage() {
  const { colors } = useTheme()
  const [fotos, setFotos] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const cargarDatos = useCallback(async () => {
    try {
      const [fotosRes, eventosRes] = await Promise.all([
        API.get('/drones'),
        API.get('/eventos'),
      ])
      setFotos(fotosRes.data || [])
      setEventos(eventosRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const dentroDelRango = (fecha: Date) => {
    if (fechaDesde && fecha < new Date(fechaDesde)) return false
    if (fechaHasta) {
      const fin = new Date(fechaHasta)
      fin.setHours(23, 59, 59)
      if (fecha > fin) return false
    }
    return true
  }

  const fotosFiltradas = fotos.filter(f => dentroDelRango(new Date(f.fechaCaptura || f.createdAt)))
  const eventosFiltrados = eventos.filter(e => dentroDelRango(new Date(e.fechaHora)))

  const fotosSinGps = fotosFiltradas.filter(f => !f.latitud).length
  const operadoresActivos = new Set([
    ...fotosFiltradas.map(f => f.operadorId),
    ...eventosFiltrados.map(e => e.operadorId),
  ]).size
  const provinciasActivas = new Set([
    ...fotosFiltradas.filter(f => f.provincia).map(f => f.provincia),
    ...eventosFiltrados.filter(e => e.provincia).map(e => e.provincia),
  ]).size

  const eventosPorTipoMap: Record<string, number> = {}
  eventosFiltrados.forEach(e => {
    const tipo = e.tipoActividad?.nombre || 'Sin tipo'
    eventosPorTipoMap[tipo] = (eventosPorTipoMap[tipo] || 0) + 1
  })
  const eventosPorTipo = Object.entries(eventosPorTipoMap).map(([name, value]) => ({ name, value }))

  const actividadMap: Record<string, { fecha: string; fotos: number; eventos: number }> = {}
  fotosFiltradas.forEach(f => {
    const key = new Date(f.fechaCaptura || f.createdAt).toISOString().slice(0, 10)
    if (!actividadMap[key]) actividadMap[key] = { fecha: key, fotos: 0, eventos: 0 }
    actividadMap[key].fotos++
  })
  eventosFiltrados.forEach(e => {
    const key = new Date(e.fechaHora).toISOString().slice(0, 10)
    if (!actividadMap[key]) actividadMap[key] = { fecha: key, fotos: 0, eventos: 0 }
    actividadMap[key].eventos++
  })
  const actividadPorFecha = Object.values(actividadMap)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(item => ({ ...item, fechaLabel: new Date(item.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }) }))

  const provinciaMap: Record<string, { provincia: string; fotos: number; eventos: number; total: number }> = {}
  fotosFiltradas.forEach(f => {
    if (!f.provincia) return
    if (!provinciaMap[f.provincia]) provinciaMap[f.provincia] = { provincia: f.provincia, fotos: 0, eventos: 0, total: 0 }
    provinciaMap[f.provincia].fotos++
    provinciaMap[f.provincia].total++
  })
  eventosFiltrados.forEach(e => {
    if (!e.provincia) return
    if (!provinciaMap[e.provincia]) provinciaMap[e.provincia] = { provincia: e.provincia, fotos: 0, eventos: 0, total: 0 }
    provinciaMap[e.provincia].eventos++
    provinciaMap[e.provincia].total++
  })
  const provinciasTop = Object.values(provinciaMap).sort((a, b) => b.total - a.total).slice(0, 8)

  if (loading) return <div style={{ color: colors.text }}>Cargando...</div>

  const cardStyle = { backgroundColor: colors.bgCard, padding: '15px', textAlign: 'center' as const }
  const labelStyle = { color: colors.textSecondary, margin: '0 0 8px 0', fontSize: '12px' }
  const valueStyle = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0' }

  return (
    <div>
      <h2 style={{ color: colors.text, marginBottom: '8px' }}>📊 Dashboard</h2>
      <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>Resumen operacional</p>

      <div className="card animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '12px', backgroundColor: colors.bgCard, marginBottom: '20px', border: `1px solid ${colors.border}` }}>
        <div>
          <label style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'bold' }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 'bold' }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>
        {(fechaDesde || fechaHasta) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} className="btn" style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, fontSize: '12px' }}>
              Limpiar filtro
            </button>
          </div>
        )}
      </div>

      <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div className="card card-hover" style={cardStyle}>
          <p style={labelStyle}>📸 Fotos</p>
          <p style={{ ...valueStyle, color: '#58a6ff' }}>{fotosFiltradas.length}</p>
        </div>
        <div className="card card-hover" style={cardStyle}>
          <p style={labelStyle}>📍 Sin GPS</p>
          <p style={{ ...valueStyle, color: fotosSinGps > 0 ? '#f85149' : '#3fb950' }}>{fotosSinGps}</p>
        </div>
        <div className="card card-hover" style={cardStyle}>
          <p style={labelStyle}>⚠️ Eventos</p>
          <p style={{ ...valueStyle, color: '#ffa657' }}>{eventosFiltrados.length}</p>
        </div>
        <div className="card card-hover" style={cardStyle}>
          <p style={labelStyle}>👤 Operadores</p>
          <p style={{ ...valueStyle, color: '#3fb950' }}>{operadoresActivos}</p>
        </div>
        <div className="card card-hover" style={cardStyle}>
          <p style={labelStyle}>🗺️ Provincias</p>
          <p style={{ ...valueStyle, color: '#db61a2' }}>{provinciasActivas}</p>
        </div>
      </div>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '15px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Mapa de Operaciones</h3>
        <div style={{ height: '350px', borderRadius: '6px', overflow: 'hidden' }}>
          <MapContainer center={CENTRO_ECUADOR} zoom={6} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
            {fotosFiltradas.filter(f => f.latitud && f.longitud).map(f => (
              <CircleMarker key={`foto-${f.id}`} center={[f.latitud, f.longitud]} radius={6} pathOptions={{ color: '#58a6ff', fillColor: '#58a6ff', fillOpacity: 0.8 }}>
                <Popup><div style={{ fontSize: '12px' }}><strong>📸 {f.nombreArchivo}</strong><br />{f.provincia || 'Sin ubicación'}</div></Popup>
              </CircleMarker>
            ))}
            {eventosFiltrados.map(e => (
              <CircleMarker key={`evento-${e.id}`} center={[e.latitud, e.longitud]} radius={7} pathOptions={{ color: '#ffa657', fillColor: '#ffa657', fillOpacity: 0.9 }}>
                <Popup><div style={{ fontSize: '12px' }}><strong>⚠️ {e.tipoActividad?.nombre}</strong><br />{e.provincia || 'Sin ubicación'}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px', marginBottom: '15px' }}>
        {eventosPorTipo.length > 0 && (
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Eventos por Tipo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={eventosPorTipo}>
                <CartesianGrid stroke={colors.border} />
                <XAxis dataKey="name" stroke={colors.textSecondary} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.textSecondary} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
                <Bar dataKey="value" fill="#58a6ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {provinciasTop.length > 0 && (
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Provincias con más actividad</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={provinciasTop} layout="vertical">
                <CartesianGrid stroke={colors.border} />
                <XAxis type="number" stroke={colors.textSecondary} allowDecimals={false} />
                <YAxis type="category" dataKey="provincia" stroke={colors.textSecondary} tick={{ fontSize: 10 }} width={110} />
                <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="fotos" name="Fotos" fill="#58a6ff" stackId="a" />
                <Bar dataKey="eventos" name="Eventos" fill="#ffa657" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {actividadPorFecha.length > 0 && (
        <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '15px', border: `1px solid ${colors.border}` }}>
          <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Actividad en el Tiempo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={actividadPorFecha}>
              <CartesianGrid stroke={colors.border} />
              <XAxis dataKey="fechaLabel" stroke={colors.textSecondary} tick={{ fontSize: 11 }} />
              <YAxis stroke={colors.textSecondary} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="fotos" name="Fotos" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.25} />
              <Area type="monotone" dataKey="eventos" name="Eventos" stroke="#ffa657" fill="#ffa657" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
