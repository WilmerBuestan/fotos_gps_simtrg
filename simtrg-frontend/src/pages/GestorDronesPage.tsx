import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { exportarDashboardPdf } from '../utils/exportarDashboardPdf'
import type { SeccionPdf } from '../utils/exportarDashboardPdf'

const initialFormData = {
  id: null as string | null,
  codigoInterno: '',
  modelo: '',
  marca: '',
  tagRfid: '',
  estado: 'DISPONIBLE',
  observaciones: '',
}

const HORAS_ALERTA_PRESTAMO = 24

const colorEstado = (estado: string) => {
  switch (estado) {
    case 'DISPONIBLE': return '#3fb950'
    case 'PRESTADO': return '#58a6ff'
    case 'MANTENIMIENTO': return '#ffa657'
    case 'BAJA': return '#f85149'
    default: return '#8b949e'
  }
}

const hoyStr = (offsetDias = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

type Tab = 'movimientos' | 'inventario' | 'usuarios' | 'dashboard'

export default function GestorDronesPage() {
  const { colors, isDarkMode } = useTheme()
  const [tab, setTab] = useState<Tab>('movimientos')

  const [drones, setDrones] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [prestamos, setPrestamos] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<any>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const editando = formData.id !== null

  const [showMovimiento, setShowMovimiento] = useState(false)
  const [movDronId, setMovDronId] = useState('')
  const [movUsuarioId, setMovUsuarioId] = useState('')
  const [movError, setMovError] = useState('')
  const [movMensaje, setMovMensaje] = useState('')

  const [movFechaDesde, setMovFechaDesde] = useState('')
  const [movFechaHasta, setMovFechaHasta] = useState('')

  const [pendienteSeleccion, setPendienteSeleccion] = useState<Record<string, string>>({})
  const [pendienteError, setPendienteError] = useState<Record<string, string>>({})
  const [pendienteProcesando, setPendienteProcesando] = useState<Record<string, boolean>>({})

  const [tagEdits, setTagEdits] = useState<Record<string, string>>({})
  const [tagGuardando, setTagGuardando] = useState<Record<string, boolean>>({})
  const [tagMensaje, setTagMensaje] = useState<Record<string, string>>({})

  const [dashFechaDesde, setDashFechaDesde] = useState(hoyStr(-29))
  const [dashFechaHasta, setDashFechaHasta] = useState(hoyStr())
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [exportandoPdf, setExportandoPdf] = useState(false)

  const contenedorRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)

  const cargarTodo = useCallback(async () => {
    try {
      const [dronesRes, usuariosRes, prestamosRes, pendientesRes] = await Promise.all([
        API.get('/drones-fisicos'),
        API.get('/usuarios'),
        API.get('/drones-fisicos/prestamos'),
        API.get('/drones-fisicos/movimientos-pendientes'),
      ])
      setDrones(dronesRes.data || [])
      setUsuarios(usuariosRes.data || [])
      setPrestamos(prestamosRes.data || [])
      setPendientes(pendientesRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarTodo()
  }, [cargarTodo])

  const cargarEstadisticas = useCallback(async () => {
    setLoadingStats(true)
    try {
      const params: any = {}
      if (dashFechaDesde) params.desde = new Date(dashFechaDesde).toISOString()
      if (dashFechaHasta) params.hasta = new Date(dashFechaHasta + 'T23:59:59').toISOString()
      const res = await API.get('/drones-fisicos/estadisticas', { params })
      setEstadisticas(res.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [dashFechaDesde, dashFechaHasta])

  useEffect(() => {
    if (tab === 'dashboard') cargarEstadisticas()
  }, [tab, cargarEstadisticas])

  // ---- Inventario: crear/editar ----

  const abrirCrear = () => {
    setFormData(initialFormData)
    setError('')
    setShowModal(true)
  }

  const abrirEditar = (dron: any) => {
    setFormData({
      id: dron.id,
      codigoInterno: dron.codigoInterno,
      modelo: dron.modelo,
      marca: dron.marca || '',
      tagRfid: dron.tagRfid || '',
      estado: dron.estado,
      observaciones: dron.observaciones || '',
    })
    setError('')
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setFormData(initialFormData)
    setError('')
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        codigoInterno: formData.codigoInterno,
        modelo: formData.modelo,
        marca: formData.marca.trim() || null,
        tagRfid: formData.tagRfid.trim() || null,
        observaciones: formData.observaciones.trim() || null,
        ...(editando && { estado: formData.estado }),
      }
      if (editando) {
        await API.patch(`/drones-fisicos/${formData.id}`, payload)
      } else {
        await API.post('/drones-fisicos', payload)
      }
      cerrarModal()
      cargarTodo()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el dron')
    } finally {
      setSaving(false)
    }
  }

  // ---- Movimiento manual ----

  const abrirMovimiento = () => {
    setMovDronId('')
    setMovUsuarioId('')
    setMovError('')
    setMovMensaje('')
    setShowMovimiento(true)
  }

  const handleMovimiento = async (e: any) => {
    e.preventDefault()
    setMovError('')
    setMovMensaje('')
    try {
      const res = await API.post('/drones-fisicos/movimiento', { dronId: movDronId, usuarioId: movUsuarioId })
      if (res.data?.ok) {
        setMovMensaje(res.data.mensaje)
        cargarTodo()
      } else {
        setMovError(res.data?.mensaje || 'No se pudo registrar el movimiento')
      }
    } catch (err: any) {
      setMovError(err.response?.data?.message || 'Error al registrar el movimiento')
    }
  }

  // ---- Movimientos pendientes (tarjeta perdida) ----

  const resolverPendiente = async (p: any, descartar: boolean) => {
    const seleccion = pendienteSeleccion[p.id]
    if (!descartar && !seleccion) {
      setPendienteError((prev) => ({ ...prev, [p.id]: 'Selecciona una opción primero.' }))
      return
    }
    setPendienteProcesando((prev) => ({ ...prev, [p.id]: true }))
    setPendienteError((prev) => ({ ...prev, [p.id]: '' }))
    try {
      if (descartar) {
        await API.post(`/drones-fisicos/movimientos-pendientes/${p.id}/descartar`)
      } else {
        const body = p.tipo === 'FALTA_USUARIO' ? { usuarioId: seleccion } : { dronId: seleccion }
        const res = await API.post(`/drones-fisicos/movimientos-pendientes/${p.id}/completar`, body)
        if (!res.data?.ok) {
          setPendienteError((prev) => ({ ...prev, [p.id]: res.data?.mensaje || 'No se pudo completar.' }))
          setPendienteProcesando((prev) => ({ ...prev, [p.id]: false }))
          return
        }
      }
      cargarTodo()
    } catch (err: any) {
      setPendienteError((prev) => ({ ...prev, [p.id]: err.response?.data?.message || 'Error al procesar.' }))
    } finally {
      setPendienteProcesando((prev) => ({ ...prev, [p.id]: false }))
    }
  }

  // ---- Filtro rápido de fechas (Movimientos) ----

  const setRangoHoy = () => { setMovFechaDesde(hoyStr()); setMovFechaHasta(hoyStr()) }
  const setRangoSemana = () => { setMovFechaDesde(hoyStr(-6)); setMovFechaHasta(hoyStr()) }
  const setRangoMes = () => { setMovFechaDesde(hoyStr(-29)); setMovFechaHasta(hoyStr()) }
  const limpiarRango = () => { setMovFechaDesde(''); setMovFechaHasta('') }

  const dentroDelRangoMov = (fecha: Date) => {
    if (movFechaDesde && fecha < new Date(movFechaDesde)) return false
    if (movFechaHasta && fecha > new Date(movFechaHasta + 'T23:59:59')) return false
    return true
  }

  const eventosActividad = useMemo(() => {
    const eventos: any[] = []
    for (const p of prestamos) {
      eventos.push({
        id: `${p.id}-salida`, tipo: 'SALIDA', fecha: p.fechaSalida,
        dronCodigo: p.dronCodigoInterno, persona: p.usuarioSalidaNombre,
      })
      if (p.fechaEntrada) {
        eventos.push({
          id: `${p.id}-entrada`, tipo: 'ENTRADA', fecha: p.fechaEntrada,
          dronCodigo: p.dronCodigoInterno, persona: p.usuarioEntradaNombre,
        })
      }
    }
    return eventos
      .filter((e) => dentroDelRangoMov(new Date(e.fecha)))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamos, movFechaDesde, movFechaHasta])

  const prestamosFiltrados = useMemo(
    () => prestamos.filter((p) => dentroDelRangoMov(new Date(p.fechaSalida))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prestamos, movFechaDesde, movFechaHasta],
  )

  // ---- Tags de usuario ----

  const guardarTag = async (usuarioId: string) => {
    const valor = (tagEdits[usuarioId] ?? '').trim()
    setTagGuardando((prev) => ({ ...prev, [usuarioId]: true }))
    setTagMensaje((prev) => ({ ...prev, [usuarioId]: '' }))
    try {
      await API.patch(`/usuarios/${usuarioId}/tag-rfid`, { tagRfid: valor || null })
      setTagMensaje((prev) => ({ ...prev, [usuarioId]: 'Guardado.' }))
      const res = await API.get('/usuarios')
      setUsuarios(res.data || [])
    } catch (err: any) {
      setTagMensaje((prev) => ({ ...prev, [usuarioId]: err.response?.data?.message || 'Error al guardar' }))
    } finally {
      setTagGuardando((prev) => ({ ...prev, [usuarioId]: false }))
    }
  }

  // ---- Dashboard: exportar PDF ----

  const handleExportarPdf = async () => {
    setExportandoPdf(true)
    try {
      if (!contenedorRef.current) return
      const secciones: (SeccionPdf | null)[] = [
        statsRef.current ? { tipo: 'imagen', titulo: 'Resumen', elemento: statsRef.current, sinCortar: true } : null,
        chartsRef.current ? { tipo: 'imagen', titulo: 'Gráficos', elemento: chartsRef.current, sinCortar: true } : null,
      ]
      const seccionesValidas = secciones.filter((s): s is SeccionPdf => !!s)

      const rango = dashFechaDesde || dashFechaHasta
        ? `Rango: ${dashFechaDesde || 'inicio'} a ${dashFechaHasta || 'hoy'}`
        : 'Rango: todo el histórico'
      const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')
      await exportarDashboardPdf(contenedorRef.current, seccionesValidas, {
        titulo: 'Reporte Gestor de Drones',
        unidad: '29 BIM - GMREC',
        subtitulo: rango,
        generadoPor: usuarioActual.nombreCompleto || usuarioActual.username,
        nombreArchivo: `simtrg-gestor-drones-${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } catch (err) {
      console.error('Error exportando PDF:', err)
      alert('No se pudo generar el PDF. Revisa la consola para más detalles.')
    } finally {
      setExportandoPdf(false)
    }
  }

  const inputStyle = { width: '100%', padding: '9px 10px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '12px', fontWeight: 'bold' as const }
  const cardStyle = { backgroundColor: colors.bgCard, padding: '15px', textAlign: 'center' as const }
  const statLabelStyle = { color: colors.textSecondary, margin: '0 0 8px 0', fontSize: '12px' }
  const statValueStyle = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0' }

  const horasEnCurso = (fechaSalida: string) => (Date.now() - new Date(fechaSalida).getTime()) / (1000 * 60 * 60)
  const duracion = (p: any) => {
    const ms = (p.fechaEntrada ? new Date(p.fechaEntrada).getTime() : Date.now()) - new Date(p.fechaSalida).getTime()
    const horas = Math.floor(ms / (1000 * 60 * 60))
    const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }

  const usuariosActivos = usuarios.filter((u) => u.activo)
  const dronesDisponibles = drones.filter((d) => d.estado === 'DISPONIBLE' || d.estado === 'PRESTADO')

  if (loading) return <div style={{ color: colors.text }}>Cargando...</div>

  const tabs: { id: Tab; label: string }[] = [
    { id: 'movimientos', label: '🔄 Movimientos' },
    { id: 'inventario', label: '🚁 Inventario' },
    { id: 'usuarios', label: '🏷️ Tags de usuarios' },
    { id: 'dashboard', label: '📊 Dashboard' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: colors.text, margin: '0 0 8px 0' }}>🚁 Gestor de Drones</h2>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Inventario de drones físicos y control de préstamos (bodega)</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="btn"
            style={{
              padding: '9px 16px',
              backgroundColor: tab === t.id ? colors.primary : 'transparent',
              color: tab === t.id ? (isDarkMode ? '#0d1117' : '#ffffff') : colors.text,
              border: `1px solid ${tab === t.id ? colors.primary : colors.border}`,
              fontWeight: 'bold', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pendientes.length > 0 && (
        <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '16px', border: '1px solid #ffa657', marginBottom: '20px' }}>
          <h3 style={{ color: '#ffa657', margin: '0 0 12px 0', fontSize: '14px' }}>⚠️ Movimientos pendientes (tarjeta perdida) — {pendientes.length}</h3>
          {pendientes.map((p) => (
            <div key={p.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', padding: '10px', borderTop: `1px solid ${colors.border}` }}>
              <span style={{ color: colors.text, fontSize: '13px', flex: '1 1 260px' }}>
                {p.tipo === 'FALTA_USUARIO'
                  ? <>Dron <b>{p.dronCodigoInterno}</b> identificado, falta la tarjeta del operador.</>
                  : <><b>{p.usuarioNombreCompleto}</b> identificado, falta la tarjeta del dron.</>}
              </span>
              <select
                value={pendienteSeleccion[p.id] || ''}
                onChange={(e) => setPendienteSeleccion((prev) => ({ ...prev, [p.id]: e.target.value }))}
                style={{ ...inputStyle, width: 'auto', marginTop: 0, minWidth: '200px' }}
              >
                <option value="">
                  {p.tipo === 'FALTA_USUARIO' ? 'Selecciona el operador...' : 'Selecciona el dron...'}
                </option>
                {p.tipo === 'FALTA_USUARIO'
                  ? usuariosActivos.map((u) => <option key={u.id} value={u.id}>{u.nombreCompleto}</option>)
                  : dronesDisponibles.map((d) => <option key={d.id} value={d.id}>{d.codigoInterno} — {d.modelo} ({d.estado})</option>)}
              </select>
              <button
                onClick={() => resolverPendiente(p, false)}
                disabled={pendienteProcesando[p.id]}
                className="btn"
                style={{ padding: '8px 14px', backgroundColor: '#3fb950', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: pendienteProcesando[p.id] ? 0.6 : 1 }}
              >
                Completar
              </button>
              <button
                onClick={() => resolverPendiente(p, true)}
                disabled={pendienteProcesando[p.id]}
                className="btn"
                style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', opacity: pendienteProcesando[p.id] ? 0.6 : 1 }}
              >
                Descartar
              </button>
              {pendienteError[p.id] && <span style={{ color: '#f85149', fontSize: '12px', flexBasis: '100%' }}>{pendienteError[p.id]}</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'movimientos' && (
        <div className="animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={setRangoHoy} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Hoy</button>
              <button onClick={setRangoSemana} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Semana</button>
              <button onClick={setRangoMes} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Mes</button>
              {(movFechaDesde || movFechaHasta) && (
                <button onClick={limpiarRango} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Todo</button>
              )}
            </div>
            <button onClick={abrirMovimiento} className="btn" style={{ padding: '10px 16px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              🔄 Registrar movimiento manual
            </button>
          </div>

          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
            <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Actividad reciente ({eventosActividad.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {eventosActividad.slice(0, 30).map((e) => (
                <div key={e.id} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>{e.tipo === 'SALIDA' ? '↗️' : '↘️'}</span>
                    <span style={{ fontSize: '10px', color: e.tipo === 'SALIDA' ? '#58a6ff' : '#3fb950', fontWeight: 'bold' }}>{e.tipo}</span>
                  </div>
                  <p style={{ margin: '8px 0 2px 0', color: colors.text, fontWeight: 'bold', fontSize: '13px' }}>{e.dronCodigo}</p>
                  <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '12px' }}>{e.persona || '—'}</p>
                  <p style={{ margin: 0, color: colors.textTertiary, fontSize: '11px' }}>{new Date(e.fecha).toLocaleString('es-EC')}</p>
                </div>
              ))}
              {eventosActividad.length === 0 && (
                <p style={{ color: colors.textSecondary, gridColumn: '1 / -1', textAlign: 'center', padding: '16px' }}>Sin actividad en el rango seleccionado</p>
              )}
            </div>
          </div>

          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Historial de préstamos ({prestamosFiltrados.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Dron</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Salió</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Fecha salida</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Entregó</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Fecha entrada</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Duración</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {prestamosFiltrados.map((p) => {
                    const enCurso = !p.fechaEntrada
                    const atrasado = enCurso && horasEnCurso(p.fechaSalida) > HORAS_ALERTA_PRESTAMO
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: atrasado ? 'rgba(248,81,73,0.08)' : enCurso ? 'rgba(255,166,87,0.06)' : 'transparent' }}>
                        <td style={{ padding: '10px', color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{p.dronCodigoInterno}</td>
                        <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{p.usuarioSalidaNombre}</td>
                        <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{new Date(p.fechaSalida).toLocaleString('es-EC')}</td>
                        <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{p.usuarioEntradaNombre || '—'}</td>
                        <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{p.fechaEntrada ? new Date(p.fechaEntrada).toLocaleString('es-EC') : '—'}</td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>
                          <span style={{ color: atrasado ? '#f85149' : enCurso ? '#ffa657' : colors.textSecondary, fontWeight: enCurso ? 'bold' : 'normal' }}>
                            {duracion(p)} {enCurso ? '(en curso)' : ''} {atrasado ? '⚠️' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: colors.textTertiary, fontSize: '11px' }}>{p.origen}</td>
                      </tr>
                    )
                  })}
                  {prestamosFiltrados.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: colors.textSecondary }}>Sin préstamos en el rango seleccionado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'inventario' && (
        <div className="animate-in card" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: colors.text, margin: 0 }}>Inventario ({drones.length})</h3>
            <button onClick={abrirCrear} className="btn" style={{ padding: '10px 20px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              + Nuevo Dron
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Código</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Modelo</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Tag RFID</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Estado</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: colors.textSecondary, fontSize: '12px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {drones.map((dron) => (
                  <tr key={dron.id} className="row-hover" style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '10px', color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{dron.codigoInterno}</td>
                    <td style={{ padding: '10px', color: colors.text, fontSize: '13px' }}>
                      {dron.modelo}
                      {dron.marca && <div style={{ fontSize: '11px', color: colors.textSecondary }}>{dron.marca}</div>}
                    </td>
                    <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{dron.tagRfid || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: colorEstado(dron.estado), color: 'white', borderRadius: '4px', fontSize: '11px' }}>{dron.estado}</span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button onClick={() => abrirEditar(dron)} className="btn" style={{ padding: '6px 10px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {drones.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: colors.textSecondary }}>Sin drones registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="animate-in card" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
          <h3 style={{ color: colors.text, margin: '0 0 6px 0' }}>Tags RFID de usuarios ({usuarios.length})</h3>
          <p style={{ color: colors.textSecondary, margin: '0 0 15px 0', fontSize: '12px' }}>
            Asigna aquí la tarjeta física de cada operador. Deja el campo vacío y guarda para quitar una tarjeta.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Usuario</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Rol</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Tag RFID</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: colors.textSecondary, fontSize: '12px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '10px', color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{u.nombreCompleto || `${u.nombre} ${u.apellido}`}</td>
                    <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{u.rol}</td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="text"
                        value={tagEdits[u.id] ?? u.tagRfid ?? ''}
                        onChange={(e) => setTagEdits((prev) => ({ ...prev, [u.id]: e.target.value.toUpperCase() }))}
                        style={{ ...inputStyle, marginTop: 0, maxWidth: '200px' }}
                        placeholder="Sin tarjeta"
                      />
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        onClick={() => guardarTag(u.id)}
                        disabled={tagGuardando[u.id]}
                        className="btn"
                        style={{ padding: '6px 12px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: tagGuardando[u.id] ? 0.6 : 1 }}
                      >
                        {tagGuardando[u.id] ? 'Guardando...' : 'Guardar'}
                      </button>
                      {tagMensaje[u.id] && <div style={{ fontSize: '11px', color: tagMensaje[u.id] === 'Guardado.' ? '#3fb950' : '#f85149', marginTop: '4px' }}>{tagMensaje[u.id]}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="animate-in" ref={contenedorRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={labelStyle}>Desde</label>
                <input type="date" value={dashFechaDesde} onChange={(e) => setDashFechaDesde(e.target.value)} style={{ ...inputStyle, marginTop: '2px' }} />
              </div>
              <div>
                <label style={labelStyle}>Hasta</label>
                <input type="date" value={dashFechaHasta} onChange={(e) => setDashFechaHasta(e.target.value)} style={{ ...inputStyle, marginTop: '2px' }} />
              </div>
              <button onClick={() => { setDashFechaDesde(hoyStr()); setDashFechaHasta(hoyStr()) }} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginTop: '18px' }}>Hoy</button>
              <button onClick={() => { setDashFechaDesde(hoyStr(-6)); setDashFechaHasta(hoyStr()) }} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginTop: '18px' }}>Semana</button>
              <button onClick={() => { setDashFechaDesde(hoyStr(-29)); setDashFechaHasta(hoyStr()) }} className="btn" style={{ padding: '8px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginTop: '18px' }}>Mes</button>
            </div>
            <button onClick={handleExportarPdf} disabled={exportandoPdf || loadingStats} className="btn" style={{ padding: '10px 18px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: exportandoPdf ? 0.6 : 1 }}>
              {exportandoPdf ? 'Generando...' : '📄 Generar reporte'}
            </button>
          </div>

          {loadingStats && !estadisticas && <p style={{ color: colors.textSecondary }}>Cargando estadísticas...</p>}

          {estadisticas && (
            <>
              <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div className="card card-hover" style={cardStyle}>
                  <p style={statLabelStyle}>🔄 Movimientos</p>
                  <p style={{ ...statValueStyle, color: '#58a6ff' }}>{estadisticas.movimientosEnRango}</p>
                </div>
                <div className="card card-hover" style={cardStyle}>
                  <p style={statLabelStyle}>📦 Préstamos activos</p>
                  <p style={{ ...statValueStyle, color: '#3fb950' }}>{estadisticas.prestamosActivos}</p>
                </div>
                <div className="card card-hover" style={cardStyle}>
                  <p style={statLabelStyle}>⚠️ Atrasados (&gt;24h)</p>
                  <p style={{ ...statValueStyle, color: '#f85149' }}>{estadisticas.prestamosAtrasados}</p>
                </div>
                {estadisticas.porEstado.map((e: any) => (
                  <div key={e.estado} className="card card-hover" style={cardStyle}>
                    <p style={statLabelStyle}>{e.estado}</p>
                    <p style={{ ...statValueStyle, color: colorEstado(e.estado) }}>{e.cantidad}</p>
                  </div>
                ))}
              </div>

              <div ref={chartsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px' }}>
                <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Distribución por estado</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={estadisticas.porEstado.map((e: any) => ({ name: e.estado, value: e.cantidad }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                        {estadisticas.porEstado.map((e: any, i: number) => <Cell key={i} fill={colorEstado(e.estado)} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Movimientos por día</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={estadisticas.movimientosPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="fecha" tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="salidas" fill="#58a6ff" />
                      <Bar dataKey="entradas" fill="#3fb950" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Top operadores (por préstamos)</h4>
                  {estadisticas.topUsuarios.length === 0 && <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin datos en el rango.</p>}
                  {estadisticas.topUsuarios.map((u: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < estadisticas.topUsuarios.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                      <span style={{ color: colors.text, fontSize: '13px' }}>{u.nombre}</span>
                      <span style={{ color: colors.primary, fontSize: '13px', fontWeight: 'bold' }}>{u.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={cerrarModal}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '440px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>{editando ? 'Editar Dron' : 'Nuevo Dron'}</h3>
              <button onClick={cerrarModal} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Código interno</label>
                <input type="text" value={formData.codigoInterno} onChange={(e) => setFormData({ ...formData, codigoInterno: e.target.value.toUpperCase() })} style={inputStyle} placeholder="Ej. DRN-001" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Modelo</label>
                  <input type="text" value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} style={inputStyle} placeholder="Ej. Mavic 3" required />
                </div>
                <div>
                  <label style={labelStyle}>Marca (opcional)</label>
                  <input type="text" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} style={inputStyle} placeholder="Ej. DJI" />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Tag RFID (opcional)</label>
                <input type="text" value={formData.tagRfid} onChange={(e) => setFormData({ ...formData, tagRfid: e.target.value.toUpperCase() })} style={inputStyle} placeholder="Ej. 0B7F1A22" />
              </div>

              {editando && (
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Estado</label>
                  <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} style={inputStyle}>
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="PRESTADO">Prestado</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                    <option value="BAJA">Baja</option>
                  </select>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: colors.textTertiary }}>
                    El estado DISPONIBLE/PRESTADO normalmente lo cambia solo el escaneo RFID o el movimiento manual — cámbialo aquí solo para correcciones.
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Observaciones (opcional)</label>
                <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' as const }} />
              </div>

              {error && (
                <p style={{ color: '#f85149', fontSize: '12px', marginTop: '-8px', marginBottom: '14px' }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={cerrarModal} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear Dron'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovimiento && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowMovimiento(false)}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '420px', width: '100%', padding: '24px', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>Registrar movimiento manual</h3>
              <button onClick={() => setShowMovimiento(false)} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: colors.textSecondary }}>
              Respaldo para cuando el equipo RFID no está disponible. Sacar/entregar se decide automáticamente según el estado actual del dron.
            </p>

            <form onSubmit={handleMovimiento}>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Dron</label>
                <select value={movDronId} onChange={(e) => setMovDronId(e.target.value)} style={inputStyle} required>
                  <option value="">Selecciona un dron...</option>
                  {dronesDisponibles.map((d) => (
                    <option key={d.id} value={d.id}>{d.codigoInterno} — {d.modelo} ({d.estado})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Usuario</label>
                <select value={movUsuarioId} onChange={(e) => setMovUsuarioId(e.target.value)} style={inputStyle} required>
                  <option value="">Selecciona un usuario...</option>
                  {usuariosActivos.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombreCompleto}</option>
                  ))}
                </select>
              </div>

              {movError && <p style={{ color: '#f85149', fontSize: '12px', marginTop: '-8px', marginBottom: '14px' }}>{movError}</p>}
              {movMensaje && <p style={{ color: '#3fb950', fontSize: '12px', marginTop: '-8px', marginBottom: '14px' }}>{movMensaje}</p>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowMovimiento(false)} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button type="submit" className="btn" style={{ flex: 1, padding: '10px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
