import { useState, useEffect, useCallback } from 'react'
import { MapContainer } from 'react-leaflet'
import API from '../services/api'
import HeatLayer from '../components/HeatLayer'
import CapasBaseMapa from '../components/CapasBaseMapa'
import { useTheme } from '../contexts/ThemeContext'
import 'leaflet/dist/leaflet.css'

const CENTRO_ECUADOR: [number, number] = [-1.3, -78.4]

export default function HeatmapPage() {
  const { isDarkMode, colors } = useTheme()
  const [tab, setTab] = useState<'eventos' | 'fotos'>('eventos')
  const [puntos, setPuntos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tiposActividad, setTiposActividad] = useState<any[]>([])
  const [provincias, setProvincias] = useState<string[]>([])

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipoActividadId, setTipoActividadId] = useState('')
  const [provincia, setProvincia] = useState('')

  useEffect(() => {
    API.get('/catalogos/tipos-actividad').then(res => setTiposActividad(res.data || [])).catch(err => console.error('Error:', err))

    fetch('/provincias.json')
      .then(res => res.json())
      .then((data: Record<string, any>) => {
        const nombres = Object.values(data).filter((p: any) => p.provincia).map((p: any) => p.provincia)
        setProvincias(nombres.sort())
      })
      .catch(err => console.error('Error loading provincias:', err))
  }, [])

  const cargarHeatmap = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (fechaDesde) params.desde = new Date(fechaDesde).toISOString()
      if (fechaHasta) {
        const fin = new Date(fechaHasta)
        fin.setHours(23, 59, 59)
        params.hasta = fin.toISOString()
      }
      if (provincia) params.provincia = provincia
      if (tab === 'eventos' && tipoActividadId) params.tipoActividadId = tipoActividadId

      const url = tab === 'eventos' ? '/eventos/heatmap' : '/drones/heatmap'
      const res = await API.get(url, { params })
      setPuntos(res.data || [])
    } catch (err) {
      console.error('Error:', err)
      setPuntos([])
    } finally {
      setLoading(false)
    }
  }, [tab, fechaDesde, fechaHasta, tipoActividadId, provincia])

  useEffect(() => {
    cargarHeatmap()
  }, [cargarHeatmap])

  const maxDensidad = puntos.length > 0 ? Math.max(...puntos.map(p => p.peso)) : 0
  const promedio = puntos.length > 0 ? puntos.reduce((sum, p) => sum + p.peso, 0) / puntos.length : 0
  const puntosMapa: [number, number, number][] = puntos.map(p => [p.latitud, p.longitud, p.peso])

  const inputStyle = { width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '11px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: colors.bg }}>
      <div style={{ padding: '15px 20px', backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <h2 style={{ color: colors.text, margin: '0 0 8px 0' }}>🔥 Mapa de Calor</h2>
        <p style={{ color: colors.textSecondary, margin: '0', fontSize: '12px' }}>Densidad geográfica {tab === 'eventos' ? 'de eventos tácticos' : 'de fotos de drones'}</p>
      </div>

      <div style={{ padding: '10px 20px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => setTab('eventos')} className="btn" style={{ padding: '8px 16px', backgroundColor: tab === 'eventos' ? '#58a6ff' : colors.bgCard, color: tab === 'eventos' ? 'white' : colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold', fontSize: '13px' }}>⚠️ Eventos</button>
          <button onClick={() => setTab('fotos')} className="btn" style={{ padding: '8px 16px', backgroundColor: tab === 'fotos' ? '#58a6ff' : colors.bgCard, color: tab === 'fotos' ? 'white' : colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold', fontSize: '13px' }}>📸 Fotos</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', padding: '10px', backgroundColor: colors.bgCard, borderRadius: '6px' }}>
          <div>
            <label style={labelStyle}>Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Provincia</label>
            <select value={provincia} onChange={(e) => setProvincia(e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {provincias.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {tab === 'eventos' && (
            <div>
              <label style={labelStyle}>Tipo de Actividad</label>
              <select value={tipoActividadId} onChange={(e) => setTipoActividadId(e.target.value)} style={inputStyle}>
                <option value="">Todos</option>
                {tiposActividad.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '15px 20px', backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, margin: '0 0 5px 0', fontSize: '12px' }}>Puntos</p>
          <p style={{ color: '#58a6ff', fontSize: '22px', fontWeight: 'bold', margin: '0' }}>{puntos.length}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, margin: '0 0 5px 0', fontSize: '12px' }}>Densidad Máxima</p>
          <p style={{ color: '#ef4444', fontSize: '22px', fontWeight: 'bold', margin: '0' }}>{maxDensidad}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: colors.textSecondary, margin: '0 0 5px 0', fontSize: '12px' }}>Densidad Promedio</p>
          <p style={{ color: '#f97316', fontSize: '22px', fontWeight: 'bold', margin: '0' }}>{promedio.toFixed(1)}</p>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: '0' }}>
        {loading && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: colors.bgCard, color: colors.text, padding: '6px 14px', borderRadius: '6px', border: `1px solid ${colors.border}`, zIndex: 1000, fontSize: '12px' }}>
            Cargando...
          </div>
        )}
        {puntos.length === 0 && !loading && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: colors.bgCard, color: colors.textSecondary, padding: '6px 14px', borderRadius: '6px', border: `1px solid ${colors.border}`, zIndex: 1000, fontSize: '12px' }}>
            Sin datos para los filtros seleccionados
          </div>
        )}
        <MapContainer center={CENTRO_ECUADOR} zoom={7} style={{ width: '100%', height: '100%' }}>
          <CapasBaseMapa predeterminada={isDarkMode ? 'oscuro' : 'claro'} />
          {puntosMapa.length > 0 && <HeatLayer puntos={puntosMapa} max={maxDensidad} />}
        </MapContainer>

        <div className="card animate-in" style={{ position: 'absolute', bottom: '20px', left: '20px', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, padding: '12px 16px', zIndex: 1000, display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: colors.text, fontSize: '11px', fontWeight: 'bold' }}>Intensidad:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></div>
            <span style={{ color: colors.textSecondary, fontSize: '11px' }}>Baja</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#eab308', borderRadius: '50%' }}></div>
            <span style={{ color: colors.textSecondary, fontSize: '11px' }}>Media</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#f97316', borderRadius: '50%' }}></div>
            <span style={{ color: colors.textSecondary, fontSize: '11px' }}>Alta</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
            <span style={{ color: colors.textSecondary, fontSize: '11px' }}>Muy alta</span>
          </div>
        </div>
      </div>
    </div>
  )
}
