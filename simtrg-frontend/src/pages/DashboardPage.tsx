import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, CircleMarker, Popup } from 'react-leaflet'
import CapasBaseMapa from '../components/CapasBaseMapa'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import HeatLayer from '../components/HeatLayer'
import AjustarLimitesMapa from '../components/AjustarLimitesMapa'
import { exportarDashboardPdf, type SeccionPdf } from '../utils/exportarDashboardPdf'
import 'leaflet/dist/leaflet.css'

const CENTRO_ECUADOR: [number, number] = [-1.3, -78.4]
const COLORES_DONA = ['#3fb950', '#ffa657', '#f85149']

export default function DashboardPage() {
  const { colors } = useTheme()
  const [fotos, setFotos] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [puntosCalorEventos, setPuntosCalorEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [exportandoPdf, setExportandoPdf] = useState(false)

  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<HTMLDivElement>(null)
  const fotosChartsRef = useRef<HTMLDivElement>(null)
  const fotosTablaRef = useRef<HTMLDivElement>(null)
  const eventosChartsRef = useRef<HTMLDivElement>(null)
  const eventosHeatmapRef = useRef<HTMLDivElement>(null)
  const eventosTablaRef = useRef<HTMLDivElement>(null)

  const cargarDatos = useCallback(async () => {
    try {
      const [fotosRes, eventosRes, usuariosRes] = await Promise.all([
        API.get('/drones'),
        API.get('/eventos'),
        API.get('/usuarios'),
      ])
      setFotos(fotosRes.data || [])
      setEventos(eventosRes.data || [])
      setUsuarios(usuariosRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const cargarHeatmapEventos = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (fechaDesde) params.desde = new Date(fechaDesde).toISOString()
      if (fechaHasta) {
        const fin = new Date(fechaHasta)
        fin.setHours(23, 59, 59)
        params.hasta = fin.toISOString()
      }
      const res = await API.get('/eventos/heatmap', { params })
      setPuntosCalorEventos(res.data || [])
    } catch (err) {
      console.error('Error:', err)
      setPuntosCalorEventos([])
    }
  }, [fechaDesde, fechaHasta])

  useEffect(() => {
    cargarHeatmapEventos()
  }, [cargarHeatmapEventos])

  const dentroDelRango = (fecha: Date) => {
    if (fechaDesde && fecha < new Date(fechaDesde)) return false
    if (fechaHasta) {
      const fin = new Date(fechaHasta)
      fin.setHours(23, 59, 59)
      if (fecha > fin) return false
    }
    return true
  }

  const operadoresMap: Record<string, string> = {}
  usuarios.forEach((u) => { operadoresMap[u.id] = u.nombreCompleto || u.username })

  const fotosFiltradas = fotos.filter(f => dentroDelRango(new Date(f.fechaCaptura || f.createdAt)))
  const eventosFiltrados = eventos.filter(e => dentroDelRango(new Date(e.fechaHora)))

  const puntosMapaFotos: [number, number][] = fotosFiltradas
    .filter(f => f.latitud && f.longitud)
    .map((f): [number, number] => [f.latitud, f.longitud])

  const fotosSinGps = fotosFiltradas.filter(f => !f.latitud).length
  const operadoresActivos = new Set([
    ...fotosFiltradas.map(f => f.operadorId),
    ...eventosFiltrados.map(e => e.operadorId),
  ]).size
  const provinciasActivas = new Set([
    ...fotosFiltradas.filter(f => f.provincia).map(f => f.provincia),
    ...eventosFiltrados.filter(e => e.provincia).map(e => e.provincia),
  ]).size

  // ---- Helpers de agregación ----
  const contarPor = <T,>(items: T[], claveFn: (item: T) => string | null | undefined): Record<string, number> => {
    const map: Record<string, number> = {}
    items.forEach((item) => {
      const clave = claveFn(item)
      if (!clave) return
      map[clave] = (map[clave] || 0) + 1
    })
    return map
  }
  const top8 = (map: Record<string, number>, labelKey: string) =>
    Object.entries(map).map(([name, value]) => ({ [labelKey]: name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  const porDia = <T,>(items: T[], fechaFn: (item: T) => Date) => {
    const map: Record<string, number> = {}
    items.forEach((item) => {
      const key = fechaFn(item).toISOString().slice(0, 10)
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([fecha, value]) => ({ fecha, value, fechaLabel: new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }
  const porHora = <T,>(items: T[], fechaFn: (item: T) => Date) => {
    const horas = Array.from({ length: 24 }, (_, h) => ({ hora: `${h}h`, value: 0 }))
    items.forEach((item) => { horas[fechaFn(item).getHours()].value++ })
    return horas
  }

  // ---- Fotos: 7 gráficos ----
  const fotosPorDia = porDia(fotosFiltradas, f => new Date(f.fechaCaptura || f.createdAt))
  const fotosPorProvincia = top8(contarPor(fotosFiltradas, f => f.provincia), 'name')
  const fotosPorCanton = top8(contarPor(fotosFiltradas, f => f.canton), 'name')
  const fotosPorParroquia = top8(contarPor(fotosFiltradas, f => f.parroquia), 'name')
  const fotosPorOperador = top8(contarPor(fotosFiltradas, f => operadoresMap[f.operadorId] || 'Desconocido'), 'name')
  const fotosPorOrigen = [
    { name: 'GPS automático', value: fotosFiltradas.filter(f => f.latitud && f.origenCoordenada === 'GPS_EXIF').length },
    { name: 'Manual', value: fotosFiltradas.filter(f => f.latitud && f.origenCoordenada === 'MANUAL').length },
    { name: 'Sin GPS', value: fotosFiltradas.filter(f => !f.latitud).length },
  ].filter(d => d.value > 0)
  const fotosPorHora = porHora(fotosFiltradas, f => new Date(f.fechaCaptura || f.createdAt))

  // ---- Eventos: 7 gráficos ----
  const eventosPorTipoMap: Record<string, number> = {}
  eventosFiltrados.forEach(e => {
    const tipo = e.tipoActividad?.nombre || 'Sin tipo'
    eventosPorTipoMap[tipo] = (eventosPorTipoMap[tipo] || 0) + 1
  })
  const eventosPorTipo = Object.entries(eventosPorTipoMap).map(([name, value]) => ({ name, value }))
  const eventosPorDia = porDia(eventosFiltrados, e => new Date(e.fechaHora))
  const eventosPorProvincia = top8(contarPor(eventosFiltrados, e => e.provincia), 'name')
  const eventosPorCanton = top8(contarPor(eventosFiltrados, e => e.canton), 'name')
  const eventosPorParroquia = top8(contarPor(eventosFiltrados, e => e.parroquia), 'name')
  const eventosPorOperador = top8(contarPor(eventosFiltrados, e => operadoresMap[e.operadorId] || 'Desconocido'), 'name')
  const eventosPorHora = porHora(eventosFiltrados, e => new Date(e.fechaHora))

  // ---- Resúmenes agregados para la IA (nunca se envían filas crudas) ----
  const resumenFotos = {
    total: fotosFiltradas.length,
    sinGps: fotosSinGps,
    porProvincia: Object.fromEntries(fotosPorProvincia.map(d => [d.name, d.value])),
    porOperador: Object.fromEntries(fotosPorOperador.map(d => [d.name, d.value])),
    porDia: Object.fromEntries(fotosPorDia.map(d => [d.fecha, d.value])),
  }
  const resumenEventos = {
    total: eventosFiltrados.length,
    porTipo: eventosPorTipoMap,
    porProvincia: Object.fromEntries(eventosPorProvincia.map(d => [d.name, d.value])),
    porOperador: Object.fromEntries(eventosPorOperador.map(d => [d.name, d.value])),
    porDia: Object.fromEntries(eventosPorDia.map(d => [d.fecha, d.value])),
  }

  // El análisis de IA solo se genera al exportar el PDF (no en cada visita
  // al dashboard) para no gastar cuota del plan gratuito de Gemini sin necesidad.
  const generarComentarioIA = async (tipo: 'fotos' | 'eventos', resumen: Record<string, unknown>): Promise<string> => {
    try {
      const res = await API.post('/dashboard/analisis-ia', {
        tipo,
        resumen,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      })
      return res.data?.comentario || 'Sin comentario generado.'
    } catch (err) {
      console.error('Error generando análisis de IA:', err)
      return 'No se pudo generar el análisis de IA en este momento.'
    }
  }

  const handleExportarPdf = async () => {
    setExportandoPdf(true)
    try {
      // Secuencial (no Promise.all): el plan gratuito de Gemini tiene un
      // límite bajo de peticiones por minuto; disparar ambas a la vez
      // gasta esa cuota más rápido de lo necesario para un solo reporte.
      const comentarioFotos = fotosFiltradas.length > 0
        ? await generarComentarioIA('fotos', resumenFotos)
        : 'Sin fotos en el rango seleccionado.'
      const comentarioEventos = eventosFiltrados.length > 0
        ? await generarComentarioIA('eventos', resumenEventos)
        : 'Sin eventos en el rango seleccionado.'

      const imagen = (titulo: string, el: HTMLDivElement | null, sinCortar = false): SeccionPdf | null =>
        el ? { tipo: 'imagen', titulo, elemento: el, sinCortar } : null
      const texto = (titulo: string, contenido: string): SeccionPdf => ({ tipo: 'texto', titulo, texto: contenido })

      const secciones = [
        imagen('Fotos — Mapa', mapaRef.current, true),
        imagen('Fotos — Gráficos', fotosChartsRef.current, true),
        imagen('Fotos — Tabla', fotosTablaRef.current),
        texto('Fotos — Análisis de IA', comentarioFotos),
        imagen('Eventos — Mapa de Calor', eventosHeatmapRef.current, true),
        imagen('Eventos — Gráficos', eventosChartsRef.current, true),
        imagen('Eventos — Tabla', eventosTablaRef.current),
        texto('Eventos — Análisis de IA', comentarioEventos),
      ].filter((s): s is SeccionPdf => !!s)

      if (!contenedorRef.current) return
      const rango = fechaDesde || fechaHasta ? `Rango: ${fechaDesde || 'inicio'} a ${fechaHasta || 'hoy'}` : 'Rango: todo el histórico'
      const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')
      await exportarDashboardPdf(contenedorRef.current, secciones, {
        titulo: 'Reporte de Dashboard',
        unidad: '29 BIM - GMREE',
        subtitulo: rango,
        generadoPor: usuarioActual.nombreCompleto || usuarioActual.username,
        nombreArchivo: `simtrg-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } catch (err) {
      console.error('Error exportando PDF:', err)
      alert('No se pudo generar el PDF. Revisa la consola para más detalles.')
    } finally {
      setExportandoPdf(false)
    }
  }

  if (loading) return <div style={{ color: colors.text }}>Cargando...</div>

  const cardStyle = { backgroundColor: colors.bgCard, padding: '15px', textAlign: 'center' as const }
  const labelStyle = { color: colors.textSecondary, margin: '0 0 8px 0', fontSize: '12px' }
  const valueStyle = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0' }
  const chartCardStyle = { backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }
  const sectionTitle = { color: colors.text, margin: '30px 0 15px 0' }

  const renderBarHorizontal = (data: any[], dataKey = 'value', color = '#58a6ff') => (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid stroke={colors.border} />
        <XAxis type="number" stroke={colors.textSecondary} allowDecimals={false} />
        <YAxis type="category" dataKey="name" stroke={colors.textSecondary} tick={{ fontSize: 10 }} width={100} />
        <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderArea = (data: any[], color = '#58a6ff') => (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <CartesianGrid stroke={colors.border} />
        <XAxis dataKey="fechaLabel" stroke={colors.textSecondary} tick={{ fontSize: 10 }} />
        <YAxis stroke={colors.textSecondary} allowDecimals={false} />
        <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.25} />
      </AreaChart>
    </ResponsiveContainer>
  )

  const renderBarVertical = (data: any[], dataKey = 'value', color = '#ffa657', xKey = 'name') => (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke={colors.border} />
        <XAxis dataKey={xKey} stroke={colors.textSecondary} tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
        <YAxis stroke={colors.textSecondary} allowDecimals={false} />
        <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div ref={contenedorRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ color: colors.text, marginBottom: '8px' }}>📊 Dashboard</h2>
          <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>Resumen operacional</p>
        </div>
        <button
          onClick={handleExportarPdf}
          disabled={exportandoPdf}
          className="btn"
          style={{ padding: '10px 20px', backgroundColor: colors.primary, color: '#fff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: exportandoPdf ? 'not-allowed' : 'pointer', opacity: exportandoPdf ? 0.6 : 1 }}
        >
          {exportandoPdf ? '⏳ Generando PDF...' : '📄 Exportar PDF'}
        </button>
      </div>

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

      {/* ===================== FOTOS ===================== */}
      <h2 style={sectionTitle}>📸 Fotos</h2>
      <div ref={mapaRef} className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '15px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Mapa de Fotos</h3>
        <div style={{ height: '650px', borderRadius: '6px', overflow: 'hidden' }}>
          <MapContainer center={CENTRO_ECUADOR} zoom={6} style={{ width: '100%', height: '100%' }}>
            <CapasBaseMapa predeterminada="satelital" />
            <AjustarLimitesMapa puntos={puntosMapaFotos} />
            {fotosFiltradas.filter(f => f.latitud && f.longitud).map(f => (
              <CircleMarker key={`foto-${f.id}`} center={[f.latitud, f.longitud]} radius={6} pathOptions={{ color: '#58a6ff', fillColor: '#58a6ff', fillOpacity: 0.8 }}>
                <Popup><div style={{ fontSize: '12px' }}><strong>📸 {f.nombreArchivo}</strong><br />{f.provincia || 'Sin ubicación'}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div ref={fotosChartsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px', marginBottom: '15px' }}>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>1. Fotos por día</h4>
          {renderArea(fotosPorDia, '#58a6ff')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>2. Fotos por provincia (top 8)</h4>
          {renderBarHorizontal(fotosPorProvincia, 'value', '#58a6ff')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>3. Fotos por cantón (top 8)</h4>
          {renderBarHorizontal(fotosPorCanton, 'value', '#79c0ff')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>4. Fotos por parroquia (top 8)</h4>
          {fotosPorParroquia.length > 0 ? renderBarHorizontal(fotosPorParroquia, 'value', '#a5d6ff') : <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin datos de parroquia</p>}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>5. Fotos por operador</h4>
          {renderBarVertical(fotosPorOperador, 'value', '#3fb950')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>6. Origen de coordenadas</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={fotosPorOrigen} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                {fotosPorOrigen.map((_, i) => <Cell key={i} fill={COLORES_DONA[i % COLORES_DONA.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>7. Fotos por hora del día</h4>
          {renderBarVertical(fotosPorHora, 'value', '#ffa657', 'hora')}
        </div>
      </div>

      <div ref={fotosTablaRef} className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '15px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Tabla de Fotos ({fotosFiltradas.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Archivo</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Fecha</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Operador</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Provincia</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Cantón</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Parroquia</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Origen GPS</th>
              </tr>
            </thead>
            <tbody>
              {fotosFiltradas.map((f) => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '8px', color: colors.text, fontSize: '11px' }}>{f.nombreArchivo}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{new Date(f.fechaCaptura || f.createdAt).toLocaleDateString('es-EC')}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{operadoresMap[f.operadorId] || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{f.provincia || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{f.canton || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{f.parroquia || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{!f.latitud ? 'Sin GPS' : f.origenCoordenada === 'MANUAL' ? 'Manual' : 'Automático'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== EVENTOS ===================== */}
      <h2 style={sectionTitle}>⚠️ Eventos / Incidentes</h2>
      <div ref={eventosHeatmapRef} className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '15px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Mapa de Calor de Eventos</h3>
        <div style={{ height: '650px', borderRadius: '6px', overflow: 'hidden' }}>
          <MapContainer center={CENTRO_ECUADOR} zoom={6} style={{ width: '100%', height: '100%' }}>
            <CapasBaseMapa predeterminada="oscuro" />
            {puntosCalorEventos.length > 0 && (
              <>
                <AjustarLimitesMapa puntos={puntosCalorEventos.map((p): [number, number] => [p.latitud, p.longitud])} />
                <HeatLayer puntos={puntosCalorEventos.map((p) => [p.latitud, p.longitud, p.peso])} />
              </>
            )}
          </MapContainer>
        </div>
        {puntosCalorEventos.length === 0 && <p style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '10px' }}>Sin datos para los filtros seleccionados</p>}
      </div>

      <div ref={eventosChartsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px', marginBottom: '15px' }}>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>1. Eventos por tipo de actividad</h4>
          {renderBarVertical(eventosPorTipo, 'value', '#58a6ff')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>2. Eventos por día</h4>
          {renderArea(eventosPorDia, '#ffa657')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>3. Eventos por provincia (top 8)</h4>
          {renderBarHorizontal(eventosPorProvincia, 'value', '#ffa657')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>4. Eventos por cantón (top 8)</h4>
          {renderBarHorizontal(eventosPorCanton, 'value', '#ffc680')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>5. Eventos por parroquia (top 8)</h4>
          {eventosPorParroquia.length > 0 ? renderBarHorizontal(eventosPorParroquia, 'value', '#ffe0b3') : <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin datos de parroquia</p>}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>6. Eventos por operador</h4>
          {renderBarVertical(eventosPorOperador, 'value', '#f85149')}
        </div>
        <div className="card animate-in" style={chartCardStyle}>
          <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>7. Eventos por hora del día</h4>
          {renderBarVertical(eventosPorHora, 'value', '#db61a2', 'hora')}
        </div>
      </div>

      <div ref={eventosTablaRef} className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '15px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Tabla de Eventos ({eventosFiltrados.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Fecha</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Tipo</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Operador</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Provincia</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Cantón</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Parroquia</th>
                <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((e) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '8px', color: colors.text, fontSize: '11px' }}>{new Date(e.fechaHora).toLocaleDateString('es-EC')}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{e.tipoActividad?.nombre || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{operadoresMap[e.operadorId] || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{e.provincia || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{e.canton || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{e.parroquia || '—'}</td>
                  <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.descripcionDetallada}>{e.descripcionDetallada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
