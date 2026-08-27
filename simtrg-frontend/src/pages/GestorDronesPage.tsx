import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MapContainer, CircleMarker, Popup } from 'react-leaflet'
import CapasBaseMapa from '../components/CapasBaseMapa'
import AjustarLimitesMapa from '../components/AjustarLimitesMapa'
import 'leaflet/dist/leaflet.css'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { getImageUrl } from '../utils/media'
import { exportarDashboardPdf } from '../utils/exportarDashboardPdf'
import type { SeccionPdf } from '../utils/exportarDashboardPdf'

const CENTRO_ECUADOR: [number, number] = [-0.2226, -78.5125]

const initialFormData = {
  id: null as string | null,
  codigoInterno: '',
  modelo: '',
  marca: '',
  version: '',
  tagRfid: '',
  estado: 'DISPONIBLE',
  observaciones: '',
  anioCompra: '',
  horasVuelo: '',
  bateriaPorcentaje: '',
  ubicacionBodega: '',
}

const HORAS_ALERTA_PRESTAMO = 24
const POLLING_MS = 8000

const colorBateria = (pct: number) => (pct >= 60 ? '#3fb950' : pct >= 30 ? '#ffa657' : '#f85149')

const colorPrioridad = (prioridad: string) => {
  switch (prioridad) {
    case 'ALTA': return '#f85149'
    case 'MEDIA': return '#ffa657'
    case 'BAJA': return '#3fb950'
    default: return '#8b949e'
  }
}

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

type Seccion = 'movimientos' | 'inventario' | 'usuarios' | 'dashboard'

export default function GestorDronesPage({ seccion }: { seccion: Seccion }) {
  const { colors, isDarkMode } = useTheme()
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = usuarioActual.rol === 'ADMINISTRADOR'

  const [drones, setDrones] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [prestamos, setPrestamos] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<any[]>([])
  const [tareas, setTareas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [invBusqueda, setInvBusqueda] = useState('')
  const [invFiltroEstado, setInvFiltroEstado] = useState('')
  const [movBusqueda, setMovBusqueda] = useState('')
  const [movOrigenFiltro, setMovOrigenFiltro] = useState('')

  const [dronPerfil, setDronPerfil] = useState<any>(null)
  const [archivoFotoDron, setArchivoFotoDron] = useState<File | null>(null)
  const [previewFotoDron, setPreviewFotoDron] = useState<string | null>(null)
  const dronFotoInputRef = useRef<HTMLInputElement>(null)

  const [showNuevaTarea, setShowNuevaTarea] = useState(false)
  const [tareaDronId, setTareaDronId] = useState('')
  const [tareaDescripcion, setTareaDescripcion] = useState('')
  const [tareaPrioridad, setTareaPrioridad] = useState('MEDIA')
  const [tareaTecnico, setTareaTecnico] = useState('')
  const [tareaError, setTareaError] = useState('')
  const [tareaGuardando, setTareaGuardando] = useState(false)

  const [eventoDetalle, setEventoDetalle] = useState<any>(null)

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
  const detalleRef = useRef<HTMLDivElement>(null)

  const cargarTodo = useCallback(async () => {
    try {
      const [dronesRes, usuariosRes, prestamosRes, pendientesRes, tareasRes] = await Promise.all([
        API.get('/drones-fisicos'),
        API.get('/usuarios'),
        API.get('/drones-fisicos/prestamos'),
        API.get('/drones-fisicos/movimientos-pendientes'),
        API.get('/drones-fisicos/tareas-mantenimiento'),
      ])
      setDrones(dronesRes.data || [])
      setUsuarios(usuariosRes.data || [])
      setPrestamos(prestamosRes.data || [])
      setPendientes(pendientesRes.data || [])
      setTareas(tareasRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarTodo()
  }, [cargarTodo])

  // Tiempo real: el ESP32 puede registrar movimientos mientras la página
  // está abierta (nadie va a presionar F5 parado frente a la bodega).
  useEffect(() => {
    const intervalo = setInterval(cargarTodo, POLLING_MS)
    return () => clearInterval(intervalo)
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
    if (seccion === 'dashboard') cargarEstadisticas()
  }, [seccion, cargarEstadisticas])

  // ---- Inventario: crear/editar ----

  const abrirCrear = () => {
    setFormData(initialFormData)
    setArchivoFotoDron(null)
    setPreviewFotoDron(null)
    setError('')
    setShowModal(true)
  }

  const abrirEditar = (dron: any) => {
    setFormData({
      id: dron.id,
      codigoInterno: dron.codigoInterno,
      modelo: dron.modelo,
      marca: dron.marca || '',
      version: dron.version || '',
      tagRfid: dron.tagRfid || '',
      estado: dron.estado,
      observaciones: dron.observaciones || '',
      anioCompra: dron.anioCompra ?? '',
      horasVuelo: dron.horasVuelo ?? '',
      bateriaPorcentaje: dron.bateriaPorcentaje ?? '',
      ubicacionBodega: dron.ubicacionBodega || '',
    })
    setDronPerfil(dron)
    setArchivoFotoDron(null)
    setPreviewFotoDron(null)
    setError('')
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setFormData(initialFormData)
    setDronPerfil(null)
    setArchivoFotoDron(null)
    setPreviewFotoDron(null)
    setError('')
  }

  const handleFotoDronChange = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivoFotoDron(file)
    setPreviewFotoDron(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload: any = {
        codigoInterno: formData.codigoInterno,
        modelo: formData.modelo,
        marca: formData.marca.trim() || null,
        version: formData.version.trim() || null,
        tagRfid: formData.tagRfid.trim() || null,
        observaciones: formData.observaciones.trim() || null,
        anioCompra: formData.anioCompra !== '' ? Number(formData.anioCompra) : null,
      }
      if (editando) {
        payload.estado = formData.estado
        payload.horasVuelo = formData.horasVuelo !== '' ? Number(formData.horasVuelo) : 0
        if (formData.bateriaPorcentaje !== '') {
          payload.bateriaPorcentaje = Number(formData.bateriaPorcentaje)
          payload.bateriaActualizada = new Date().toISOString()
        }
        payload.ubicacionBodega = formData.ubicacionBodega.trim() || null
        await API.patch(`/drones-fisicos/${formData.id}`, payload)
        if (archivoFotoDron) {
          const fd = new FormData()
          fd.append('foto', archivoFotoDron)
          await API.post(`/drones-fisicos/${formData.id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }
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

  // ---- Tareas de mantenimiento ----

  const abrirNuevaTarea = (dronId = '', prioridad = 'MEDIA') => {
    setTareaDronId(dronId)
    setTareaDescripcion('')
    setTareaPrioridad(prioridad)
    setTareaTecnico('')
    setTareaError('')
    setShowNuevaTarea(true)
  }

  const handleCrearTarea = async (e: any) => {
    e.preventDefault()
    if (!tareaDronId) {
      setTareaError('Selecciona un dron.')
      return
    }
    setTareaGuardando(true)
    setTareaError('')
    try {
      await API.post(`/drones-fisicos/${tareaDronId}/tareas-mantenimiento`, {
        descripcion: tareaDescripcion,
        prioridad: tareaPrioridad,
        tecnicoAsignado: tareaTecnico.trim() || undefined,
      })
      setShowNuevaTarea(false)
      cargarTodo()
    } catch (err: any) {
      setTareaError(err.response?.data?.message || 'Error al crear la tarea')
    } finally {
      setTareaGuardando(false)
    }
  }

  const completarTarea = async (id: string) => {
    try {
      await API.patch(`/drones-fisicos/tareas-mantenimiento/${id}/completar`)
      cargarTodo()
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo completar la tarea')
    }
  }

  const eliminarPrestamo = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro del historial de préstamos? Esta acción no se puede deshacer.')) return
    try {
      await API.delete(`/drones-fisicos/prestamos/${id}`)
      cargarTodo()
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el registro')
    }
  }

  const eliminarDron = async (dron: any) => {
    if (!window.confirm(`¿Eliminar el dron ${dron.codigoInterno} del inventario? Esta acción no se puede deshacer.`)) return
    try {
      await API.delete(`/drones-fisicos/${dron.id}`)
      cargarTodo()
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el dron')
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

  const horasEnCurso = (fechaSalida: string) => (Date.now() - new Date(fechaSalida).getTime()) / (1000 * 60 * 60)
  const duracion = (p: any) => {
    const ms = (p.fechaEntrada ? new Date(p.fechaEntrada).getTime() : Date.now()) - new Date(p.fechaSalida).getTime()
    const horas = Math.floor(ms / (1000 * 60 * 60))
    const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }

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
        dronCodigo: p.dronCodigoInterno, persona: p.usuarioSalidaNombre, prestamo: p,
      })
      if (p.fechaEntrada) {
        eventos.push({
          id: `${p.id}-entrada`, tipo: 'ENTRADA', fecha: p.fechaEntrada,
          dronCodigo: p.dronCodigoInterno, persona: p.usuarioEntradaNombre, prestamo: p,
        })
      }
    }
    const busqueda = movBusqueda.trim().toLowerCase()
    return eventos
      .filter((e) => dentroDelRangoMov(new Date(e.fecha)))
      .filter((e) => !movOrigenFiltro || e.prestamo.origen === movOrigenFiltro)
      .filter((e) => !busqueda || e.dronCodigo?.toLowerCase().includes(busqueda) || e.persona?.toLowerCase().includes(busqueda))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamos, movFechaDesde, movFechaHasta, movBusqueda, movOrigenFiltro])

  const prestamosFiltrados = useMemo(() => {
    const busqueda = movBusqueda.trim().toLowerCase()
    return prestamos
      .filter((p) => dentroDelRangoMov(new Date(p.fechaSalida)))
      .filter((p) => !movOrigenFiltro || p.origen === movOrigenFiltro)
      .filter((p) => !busqueda || p.dronCodigoInterno?.toLowerCase().includes(busqueda) || p.usuarioSalidaNombre?.toLowerCase().includes(busqueda) || p.usuarioEntradaNombre?.toLowerCase().includes(busqueda))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamos, movFechaDesde, movFechaHasta, movBusqueda, movOrigenFiltro])

  const dronesFiltrados = useMemo(() => {
    const busqueda = invBusqueda.trim().toLowerCase()
    return drones
      .filter((d) => !invFiltroEstado || d.estado === invFiltroEstado)
      .filter((d) => !busqueda || d.codigoInterno?.toLowerCase().includes(busqueda) || d.modelo?.toLowerCase().includes(busqueda) || d.tagRfid?.toLowerCase().includes(busqueda))
  }, [drones, invBusqueda, invFiltroEstado])

  const ultimoVueloPorDron = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const p of prestamos) {
      const fecha = p.fechaEntrada || p.fechaSalida
      if (!mapa[p.dronId] || new Date(fecha) > new Date(mapa[p.dronId])) {
        mapa[p.dronId] = fecha
      }
    }
    return mapa
  }, [prestamos])

  const tareasPendientes = useMemo(() => tareas.filter((t) => t.estado === 'PENDIENTE'), [tareas])

  // ---- Dashboard: alertas, actividad reciente y ubicación de préstamos en curso ----

  const prestamosEnCurso = useMemo(() => prestamos.filter((p) => !p.fechaEntrada), [prestamos])

  const alertasAtrasados = useMemo(
    () => prestamosEnCurso.filter((p) => horasEnCurso(p.fechaSalida) > HORAS_ALERTA_PRESTAMO),
    [prestamosEnCurso],
  )
  const dronesEnMantenimiento = useMemo(() => drones.filter((d) => d.estado === 'MANTENIMIENTO'), [drones])

  // ---- Movimientos: resumen del día, alertas y estadísticas (todo con datos reales) ----

  const esHoy = (fecha: string) => new Date(fecha).toDateString() === new Date().toDateString()

  const resumenHoyMovimientos = useMemo(() => {
    const salidasHoy = prestamos.filter((p) => esHoy(p.fechaSalida))
    const entradasHoy = prestamos.filter((p) => p.fechaEntrada && esHoy(p.fechaEntrada))
    const completados = prestamos.filter((p) => p.fechaEntrada)
    const aTiempo = completados.filter((p) => (new Date(p.fechaEntrada).getTime() - new Date(p.fechaSalida).getTime()) / (1000 * 60 * 60) <= HORAS_ALERTA_PRESTAMO)
    const porcentajeATiempo = completados.length > 0 ? (aTiempo.length / completados.length) * 100 : 100
    return {
      totalHoy: salidasHoy.length + entradasHoy.length,
      prestados: prestamosEnCurso.length,
      entradasHoy: entradasHoy.length,
      atrasados: alertasAtrasados.length,
      porcentajeATiempo,
    }
  }, [prestamos, prestamosEnCurso, alertasAtrasados])

  const duracionPromedioPorDia = useMemo(() => {
    const mapa = new Map<string, { totalMin: number; cantidad: number }>()
    for (const p of prestamos) {
      if (!p.fechaEntrada) continue
      const dia = new Date(p.fechaEntrada).toISOString().slice(0, 10)
      const minutos = (new Date(p.fechaEntrada).getTime() - new Date(p.fechaSalida).getTime()) / (1000 * 60)
      const actual = mapa.get(dia) ?? { totalMin: 0, cantidad: 0 }
      actual.totalMin += minutos
      actual.cantidad += 1
      mapa.set(dia, actual)
    }
    return Array.from(mapa.entries())
      .map(([dia, v]) => ({ dia, minutos: Math.round(v.totalMin / v.cantidad) }))
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .slice(-14)
  }, [prestamos])

  const movimientosPorOperador = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const p of prestamos) {
      if (p.usuarioSalidaNombre) conteo.set(p.usuarioSalidaNombre, (conteo.get(p.usuarioSalidaNombre) ?? 0) + 1)
    }
    return Array.from(conteo.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
  }, [prestamos])

  const movimientosPorDron = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const p of prestamos) {
      if (p.dronCodigoInterno) conteo.set(p.dronCodigoInterno, (conteo.get(p.dronCodigoInterno) ?? 0) + 1)
    }
    return Array.from(conteo.entries()).map(([codigo, cantidad]) => ({ codigo, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
  }, [prestamos])

  const dronesBateriaBaja = useMemo(() => drones.filter((d) => d.bateriaPorcentaje != null && d.bateriaPorcentaje < 20), [drones])

  const eventosRecientesTodos = useMemo(() => {
    const eventos: any[] = []
    for (const p of prestamos) {
      eventos.push({ id: `${p.id}-salida`, tipo: 'SALIDA', fecha: p.fechaSalida, dronCodigo: p.dronCodigoInterno, persona: p.usuarioSalidaNombre })
      if (p.fechaEntrada) {
        eventos.push({ id: `${p.id}-entrada`, tipo: 'ENTRADA', fecha: p.fechaEntrada, dronCodigo: p.dronCodigoInterno, persona: p.usuarioEntradaNombre })
      }
    }
    return eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [prestamos])

  const ubicacionesPrestamosEnCurso = useMemo(() => {
    return prestamosEnCurso
      .map((p) => {
        const operador = usuarios.find((u) => u.id === p.usuarioSalidaId)
        if (!operador?.ultimaUbicacionLat || !operador?.ultimaUbicacionLon) return null
        return {
          id: p.id,
          lat: operador.ultimaUbicacionLat as number,
          lon: operador.ultimaUbicacionLon as number,
          dronCodigo: p.dronCodigoInterno,
          persona: p.usuarioSalidaNombre,
          fechaSalida: p.fechaSalida,
        }
      })
      .filter((p): p is NonNullable<typeof p> => !!p)
  }, [prestamosEnCurso, usuarios])

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
        detalleRef.current ? { tipo: 'imagen', titulo: 'Detalle', elemento: detalleRef.current } : null,
      ]
      const seccionesValidas = secciones.filter((s): s is SeccionPdf => !!s)

      const rango = dashFechaDesde || dashFechaHasta
        ? `Rango: ${dashFechaDesde || 'inicio'} a ${dashFechaHasta || 'hoy'}`
        : 'Rango: todo el histórico'
      const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')
      await exportarDashboardPdf(contenedorRef.current, seccionesValidas, {
        titulo: 'Reporte Gestor de Drones',
        unidad: '29 BIM - GMREE',
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

  const usuariosActivos = usuarios.filter((u) => u.activo)
  const dronesDisponibles = drones.filter((d) => d.estado === 'DISPONIBLE' || d.estado === 'PRESTADO')

  if (loading) return <div style={{ color: colors.text }}>Cargando...</div>

  const titulos: Record<Seccion, string> = {
    dashboard: '📊 Dashboard',
    movimientos: '🔄 Movimientos',
    inventario: '📦 Inventario',
    usuarios: '🏷️ Tags de usuarios',
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: colors.text, margin: '0 0 8px 0' }}>🚁 Gestor de Drones — {titulos[seccion]}</h2>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Inventario de drones físicos y control de préstamos (bodega)</p>
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

      {seccion === 'movimientos' && (
        <div className="animate-in">
          <h3 style={{ color: colors.text, margin: '0 0 12px 0', fontSize: '13px', letterSpacing: '0.5px' }}>RESUMEN HOY</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div className="card card-hover" style={cardStyle}>
              <p style={statLabelStyle}>Total Movimientos</p>
              <p style={{ ...statValueStyle, color: colors.primary }}>{resumenHoyMovimientos.totalHoy}</p>
            </div>
            <div className="card card-hover" style={cardStyle}>
              <p style={statLabelStyle}>Drones Prestados</p>
              <p style={{ ...statValueStyle, color: '#58a6ff' }}>{resumenHoyMovimientos.prestados}</p>
            </div>
            <div className="card card-hover" style={cardStyle}>
              <p style={statLabelStyle}>Entradas Registradas</p>
              <p style={{ ...statValueStyle, color: '#3fb950' }}>{resumenHoyMovimientos.entradasHoy}</p>
            </div>
            <div className="card card-hover" style={cardStyle}>
              <p style={statLabelStyle}>Préstamos Atrasados</p>
              <p style={{ ...statValueStyle, color: '#f85149' }}>{resumenHoyMovimientos.atrasados}</p>
            </div>
            <div className="card card-hover" style={cardStyle}>
              <p style={statLabelStyle}>% Devueltos a Tiempo</p>
              <p style={{ ...statValueStyle, color: '#3fb950' }}>{resumenHoyMovimientos.porcentajeATiempo.toFixed(1)}%</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={movBusqueda}
                onChange={(e) => setMovBusqueda(e.target.value)}
                placeholder="🔍 Buscar por dron u operador..."
                style={{ ...inputStyle, marginTop: 0, width: 'auto', minWidth: '220px' }}
              />
              <select value={movOrigenFiltro} onChange={(e) => setMovOrigenFiltro(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: 'auto' }}>
                <option value="">Todos los orígenes</option>
                <option value="ESP32">ESP32</option>
                <option value="MANUAL">Manual</option>
              </select>
              <button onClick={setRangoHoy} className="btn" style={{ padding: '9px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Hoy</button>
              <button onClick={setRangoSemana} className="btn" style={{ padding: '9px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Semana</button>
              <button onClick={setRangoMes} className="btn" style={{ padding: '9px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Mes</button>
              {(movFechaDesde || movFechaHasta) && (
                <button onClick={limpiarRango} className="btn" style={{ padding: '9px 14px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Todo</button>
              )}
            </div>
            <button onClick={abrirMovimiento} className="btn" style={{ padding: '10px 16px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              🔄 Registrar movimiento manual
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '2 1 560px' }}>
              <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Actividad reciente ({eventosActividad.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {eventosActividad.slice(0, 30).map((e) => (
                    <div
                      key={e.id}
                      onClick={() => setEventoDetalle(e.prestamo)}
                      className="row-hover"
                      style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px' }}>{e.tipo === 'SALIDA' ? '↗️' : '↘️'}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', color: 'white', backgroundColor: e.tipo === 'SALIDA' ? '#58a6ff' : '#3fb950', fontWeight: 'bold' }}>{e.tipo}</span>
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
                <div className="desktop-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Dron</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Salió</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Fecha salida</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Entregó</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Fecha entrada</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Duración</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Estado</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Origen</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: colors.textSecondary, fontSize: '12px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {prestamosFiltrados.map((p) => {
                        const enCurso = !p.fechaEntrada
                        const atrasado = enCurso && horasEnCurso(p.fechaSalida) > HORAS_ALERTA_PRESTAMO
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setEventoDetalle(p)}
                            className="row-hover"
                            style={{ borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', backgroundColor: atrasado ? 'rgba(248,81,73,0.08)' : enCurso ? 'rgba(255,166,87,0.06)' : 'transparent' }}
                          >
                            <td style={{ padding: '10px', color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{p.dronCodigoInterno}</td>
                            <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{p.usuarioSalidaNombre}</td>
                            <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{new Date(p.fechaSalida).toLocaleString('es-EC')}</td>
                            <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{p.usuarioEntradaNombre || '—'}</td>
                            <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{p.fechaEntrada ? new Date(p.fechaEntrada).toLocaleString('es-EC') : '—'}</td>
                            <td style={{ padding: '10px', fontSize: '12px' }}>
                              <span style={{ color: atrasado ? '#f85149' : enCurso ? '#ffa657' : colors.textSecondary, fontWeight: enCurso ? 'bold' : 'normal' }}>
                                {duracion(p)} {atrasado ? '⚠️' : ''}
                              </span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '3px 9px', borderRadius: '999px', color: 'white', fontSize: '10px', fontWeight: 'bold', backgroundColor: atrasado ? '#f85149' : enCurso ? '#58a6ff' : '#3fb950' }}>
                                {atrasado ? 'ATRASADO' : enCurso ? 'EN CURSO' : 'DEVUELTO'}
                              </span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '999px', color: 'white', fontSize: '10px', backgroundColor: p.origen === 'ESP32' ? '#3fb950' : '#8b949e' }}>{p.origen}</span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span style={{ color: colors.primary, fontSize: '11px', fontWeight: 'bold' }}>Ver Detalle</span>
                              {esAdmin && (
                                <button
                                  onClick={(ev) => { ev.stopPropagation(); eliminarPrestamo(p.id) }}
                                  className="btn"
                                  title="Eliminar registro"
                                  style={{ marginLeft: '10px', padding: '3px 8px', backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}
                                >
                                  🗑️
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {prestamosFiltrados.length === 0 && (
                        <tr><td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: colors.textSecondary }}>Sin préstamos en el rango seleccionado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-cards" style={{ flexDirection: 'column', gap: '10px' }}>
                  {prestamosFiltrados.map((p) => {
                    const enCurso = !p.fechaEntrada
                    const atrasado = enCurso && horasEnCurso(p.fechaSalida) > HORAS_ALERTA_PRESTAMO
                    return (
                      <div
                        key={p.id}
                        onClick={() => setEventoDetalle(p)}
                        style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, cursor: 'pointer', backgroundColor: atrasado ? 'rgba(248,81,73,0.08)' : enCurso ? 'rgba(255,166,87,0.06)' : colors.bg }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <p style={{ margin: 0, color: colors.text, fontSize: '14px', fontWeight: 'bold' }}>{p.dronCodigoInterno}</p>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ padding: '3px 9px', borderRadius: '999px', color: 'white', fontSize: '10px', fontWeight: 'bold', backgroundColor: atrasado ? '#f85149' : enCurso ? '#58a6ff' : '#3fb950' }}>
                              {atrasado ? 'ATRASADO' : enCurso ? 'EN CURSO' : 'DEVUELTO'}
                            </span>
                            <span style={{ padding: '3px 8px', borderRadius: '999px', color: 'white', fontSize: '10px', backgroundColor: p.origen === 'ESP32' ? '#3fb950' : '#8b949e' }}>{p.origen}</span>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 2px 0', color: colors.textSecondary, fontSize: '12px' }}>↗️ Salió: <b>{p.usuarioSalidaNombre}</b> · {new Date(p.fechaSalida).toLocaleString('es-EC')}</p>
                        {p.fechaEntrada && (
                          <p style={{ margin: '0 0 2px 0', color: colors.textSecondary, fontSize: '12px' }}>↘️ Entregó: <b>{p.usuarioEntradaNombre || '—'}</b> · {new Date(p.fechaEntrada).toLocaleString('es-EC')}</p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ margin: 0, color: colors.textTertiary, fontSize: '11px' }}>Duración: {duracion(p)}</p>
                          {esAdmin && (
                            <button
                              onClick={(ev) => { ev.stopPropagation(); eliminarPrestamo(p.id) }}
                              className="btn"
                              style={{ padding: '4px 10px', backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {prestamosFiltrados.length === 0 && (
                    <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '16px' }}>Sin préstamos en el rango seleccionado</p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>⏱️ Duración promedio</h4>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={duracionPromedioPorDia}>
                    <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, fontSize: '11px' }} formatter={(v: any) => [`${v} min`, 'Promedio']} />
                    <Area type="monotone" dataKey="minutos" stroke={colors.primary} fill={colors.primary} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>⚠️ Alertas y Notificaciones</h4>
                {dronesBateriaBaja.length === 0 && alertasAtrasados.length === 0 && (
                  <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin alertas activas.</p>
                )}
                {dronesBateriaBaja.map((d) => (
                  <div key={d.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border}` }}>
                    <p style={{ margin: 0, color: '#f85149', fontSize: '12px', fontWeight: 'bold' }}>🔋 {d.codigoInterno}: Batería {d.bateriaPorcentaje}%</p>
                  </div>
                ))}
                {alertasAtrasados.map((p) => (
                  <div key={p.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border}` }}>
                    <p style={{ margin: 0, color: '#ffa657', fontSize: '12px', fontWeight: 'bold' }}>⏰ {p.dronCodigoInterno}: préstamo atrasado ({duracion(p)})</p>
                  </div>
                ))}
              </div>

              <div className="card" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Movimientos por operador</h4>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={movimientosPorOperador} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                    <YAxis type="category" dataKey="nombre" width={80} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, fontSize: '11px' }} />
                    <Bar dataKey="cantidad" fill="#58a6ff" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Movimientos por dron</h4>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={movimientosPorDron} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                    <YAxis type="category" dataKey="codigo" width={80} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, fontSize: '11px' }} />
                    <Bar dataKey="cantidad" fill="#3fb950" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {seccion === 'inventario' && (
        <div className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div className="card card-hover" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}`, borderLeft: '4px solid #58a6ff' }}>
              <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '12px' }}>🚁 Drones Totales</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#58a6ff' }}>{drones.length}</p>
            </div>
            <div className="card card-hover" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}`, borderLeft: '4px solid #3fb950' }}>
              <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '12px' }}>✓ Drones Activos</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#3fb950' }}>{drones.filter((d) => d.estado === 'DISPONIBLE' || d.estado === 'PRESTADO').length}</p>
            </div>
            <div className="card card-hover" style={{ backgroundColor: colors.bgCard, padding: '18px', border: `1px solid ${colors.border}`, borderLeft: '4px solid #ffa657' }}>
              <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '12px' }}>🔧 En Mantenimiento</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffa657' }}>{drones.filter((d) => d.estado === 'MANTENIMIENTO').length}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="card" style={{ flex: '2 1 560px', backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                <h3 style={{ color: colors.text, margin: 0 }}>Inventario ({dronesFiltrados.length})</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={invBusqueda}
                    onChange={(e) => setInvBusqueda(e.target.value)}
                    placeholder="🔍 Buscar..."
                    style={{ ...inputStyle, marginTop: 0, width: 'auto', minWidth: '160px' }}
                  />
                  <select value={invFiltroEstado} onChange={(e) => setInvFiltroEstado(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: 'auto' }}>
                    <option value="">Todos los estados</option>
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="PRESTADO">Prestado</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                    <option value="BAJA">Baja</option>
                  </select>
                  <button onClick={abrirCrear} className="btn" style={{ padding: '9px 18px', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    + Nuevo Dron
                  </button>
                </div>
              </div>
              <div className="desktop-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                      <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Dron</th>
                      <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Ubicación</th>
                      <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Horas vuelo</th>
                      <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Último vuelo</th>
                      <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Batería</th>
                      <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Estado</th>
                      <th style={{ padding: '10px', textAlign: 'right', color: colors.textSecondary, fontSize: '12px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dronesFiltrados.map((dron) => {
                      const ultimoVuelo = ultimoVueloPorDron[dron.id]
                      return (
                        <tr key={dron.id} className="row-hover" style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '6px', flexShrink: 0, backgroundColor: colors.bgTertiary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', overflow: 'hidden',
                                backgroundImage: dron.foto ? `url(${getImageUrl(dron.foto)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
                              }}>
                                {!dron.foto && '🚁'}
                              </div>
                              <div>
                                <p style={{ margin: 0, color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{dron.codigoInterno}</p>
                                <p style={{ margin: 0, color: colors.textSecondary, fontSize: '11px' }}>{dron.modelo}{dron.marca ? ` · ${dron.marca}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{dron.ubicacionBodega || '—'}</td>
                          <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{dron.horasVuelo ?? 0}h</td>
                          <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{ultimoVuelo ? new Date(ultimoVuelo).toLocaleDateString('es-EC') : '—'}</td>
                          <td style={{ padding: '10px' }}>
                            {dron.bateriaPorcentaje != null ? (
                              <span style={{ padding: '3px 9px', borderRadius: '999px', color: 'white', fontSize: '11px', fontWeight: 'bold', backgroundColor: colorBateria(dron.bateriaPorcentaje) }}>
                                {dron.bateriaPorcentaje}%
                              </span>
                            ) : <span style={{ color: colors.textTertiary, fontSize: '12px' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '4px 10px', backgroundColor: colorEstado(dron.estado), color: 'white', borderRadius: '999px', fontSize: '11px', fontWeight: 'bold' }}>{dron.estado}</span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={() => abrirEditar(dron)} className="btn" style={{ padding: '6px 10px', marginRight: '6px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                              Ver perfil
                            </button>
                            <button onClick={() => abrirNuevaTarea(dron.id, 'ALTA')} className="btn" style={{ padding: '6px 10px', marginRight: '6px', backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                              Reportar falla
                            </button>
                            <button onClick={() => eliminarDron(dron)} className="btn" title="Eliminar dron" style={{ padding: '6px 8px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                              🗑️
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {dronesFiltrados.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: colors.textSecondary }}>Sin drones que coincidan</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards" style={{ flexDirection: 'column', gap: '10px' }}>
                {dronesFiltrados.map((dron) => {
                  const ultimoVuelo = ultimoVueloPorDron[dron.id]
                  return (
                    <div key={dron.id} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '6px', flexShrink: 0, backgroundColor: colors.bgTertiary,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', overflow: 'hidden',
                          backgroundImage: dron.foto ? `url(${getImageUrl(dron.foto)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
                        }}>
                          {!dron.foto && '🚁'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, color: colors.text, fontSize: '14px', fontWeight: 'bold' }}>{dron.codigoInterno}</p>
                          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '12px' }}>{dron.modelo}{dron.marca ? ` · ${dron.marca}` : ''}</p>
                        </div>
                        <span style={{ padding: '4px 10px', backgroundColor: colorEstado(dron.estado), color: 'white', borderRadius: '999px', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>{dron.estado}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                        <div><span style={{ color: colors.textTertiary }}>Ubicación: </span><span style={{ color: colors.textSecondary }}>{dron.ubicacionBodega || '—'}</span></div>
                        <div><span style={{ color: colors.textTertiary }}>Horas vuelo: </span><span style={{ color: colors.textSecondary }}>{dron.horasVuelo ?? 0}h</span></div>
                        <div><span style={{ color: colors.textTertiary }}>Último vuelo: </span><span style={{ color: colors.textSecondary }}>{ultimoVuelo ? new Date(ultimoVuelo).toLocaleDateString('es-EC') : '—'}</span></div>
                        <div>
                          <span style={{ color: colors.textTertiary }}>Batería: </span>
                          {dron.bateriaPorcentaje != null ? (
                            <span style={{ padding: '2px 7px', borderRadius: '999px', color: 'white', fontSize: '10px', fontWeight: 'bold', backgroundColor: colorBateria(dron.bateriaPorcentaje) }}>{dron.bateriaPorcentaje}%</span>
                          ) : <span style={{ color: colors.textSecondary }}>—</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => abrirEditar(dron)} className="btn" style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                          Ver perfil
                        </button>
                        <button onClick={() => abrirNuevaTarea(dron.id, 'ALTA')} className="btn" style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                          Reportar falla
                        </button>
                        <button onClick={() => eliminarDron(dron)} className="btn" style={{ padding: '8px 10px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
                {dronesFiltrados.length === 0 && (
                  <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '16px' }}>Sin drones que coincidan</p>
                )}
              </div>
            </div>

            <div className="card" style={{ flex: '1 1 300px', backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ color: colors.text, margin: 0, fontSize: '14px' }}>🛠️ Tareas Pendientes ({tareasPendientes.length})</h3>
                <button onClick={() => abrirNuevaTarea()} className="btn" style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                  + Nueva
                </button>
              </div>
              {tareasPendientes.length === 0 && <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin tareas pendientes.</p>}
              {tareasPendientes.map((t) => (
                <div key={t.id} style={{ padding: '10px 0', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ margin: 0, color: colors.text, fontSize: '12px', fontWeight: 'bold' }}>{t.dronCodigoInterno}</p>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', color: 'white', fontSize: '10px', fontWeight: 'bold', backgroundColor: colorPrioridad(t.prioridad), flexShrink: 0 }}>{t.prioridad}</span>
                  </div>
                  <p style={{ margin: '0 0 2px 0', color: colors.textSecondary, fontSize: '11px' }}>{t.descripcion}</p>
                  <p style={{ margin: '0 0 6px 0', color: colors.textTertiary, fontSize: '11px' }}>Técnico: {t.tecnicoAsignado || 'Sin asignar'}</p>
                  <button onClick={() => completarTarea(t.id)} className="btn" style={{ width: '100%', padding: '6px', backgroundColor: '#3fb950', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Completar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {seccion === 'usuarios' && (
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
                    <td style={{ padding: '10px', color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{u.nombreCompleto || `${u.grado ? u.grado + ' ' : ''}${u.apellido} ${u.nombre}`}</td>
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

      {seccion === 'dashboard' && (
        <div className="animate-in" ref={contenedorRef}>
          {(() => {
            const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}')
            const nombre = usuarioActual.nombreCompleto || usuarioActual.username || 'Usuario'
            const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', flexShrink: 0 }}>
                  {iniciales || '👤'}
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '12px' }}>Bienvenido,</p>
                  <h3 style={{ margin: 0, color: colors.text, fontSize: '18px' }}>{nombre}</h3>
                </div>
              </div>
            )
          })()}

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
                  <p style={statLabelStyle}>🚁 Total drones</p>
                  <p style={{ ...statValueStyle, color: colors.primary }}>{drones.length}</p>
                </div>
                {estadisticas.porEstado.map((e: any) => (
                  <div key={e.estado} className="card card-hover" style={cardStyle}>
                    <p style={statLabelStyle}>{e.estado}</p>
                    <p style={{ ...statValueStyle, color: colorEstado(e.estado) }}>{e.cantidad}</p>
                  </div>
                ))}
                <div className="card card-hover" style={cardStyle}>
                  <p style={statLabelStyle}>🔄 Movimientos</p>
                  <p style={{ ...statValueStyle, color: '#58a6ff' }}>{estadisticas.movimientosEnRango}</p>
                </div>
                <div className="card card-hover" style={cardStyle}>
                  <p style={statLabelStyle}>⚠️ Atrasados (&gt;24h)</p>
                  <p style={{ ...statValueStyle, color: '#f85149' }}>{estadisticas.prestamosAtrasados}</p>
                </div>
              </div>

              <div ref={chartsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Estado de Flota</h4>
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
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Ubicación de drones prestados</h4>
                  {ubicacionesPrestamosEnCurso.length === 0 ? (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary, fontSize: '12px', textAlign: 'center', padding: '0 20px' }}>
                      Aún no hay ubicaciones registradas para los préstamos activos.
                    </div>
                  ) : (
                    <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden' }}>
                      <MapContainer center={CENTRO_ECUADOR} zoom={6} style={{ width: '100%', height: '100%' }}>
                        <CapasBaseMapa predeterminada="satelital" />
                        <AjustarLimitesMapa puntos={ubicacionesPrestamosEnCurso.map((p): [number, number] => [p.lat, p.lon])} />
                        {ubicacionesPrestamosEnCurso.map((p) => (
                          <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={7} pathOptions={{ color: '#58a6ff', fillColor: '#58a6ff', fillOpacity: 0.85 }}>
                            <Popup>
                              <div style={{ fontSize: '12px' }}>
                                <strong>🚁 {p.dronCodigo}</strong><br />
                                {p.persona}<br />
                                {duracion({ fechaSalida: p.fechaSalida })} en curso
                              </div>
                            </Popup>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    </div>
                  )}
                </div>
              </div>

              <div ref={detalleRef}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                    <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>⚠️ Alertas Críticas</h4>
                    {alertasAtrasados.length === 0 && dronesEnMantenimiento.length === 0 && (
                      <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin alertas activas.</p>
                    )}
                    {alertasAtrasados.map((p) => (
                      <div key={p.id} style={{ padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                        <p style={{ margin: 0, color: '#f85149', fontSize: '12px', fontWeight: 'bold' }}>Dron {p.dronCodigoInterno}</p>
                        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '11px' }}>Préstamo atrasado — {duracion(p)} con {p.usuarioSalidaNombre}</p>
                      </div>
                    ))}
                    {dronesEnMantenimiento.map((d) => (
                      <div key={d.id} style={{ padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                        <p style={{ margin: 0, color: '#ffa657', fontSize: '12px', fontWeight: 'bold' }}>Dron {d.codigoInterno}</p>
                        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '11px' }}>En mantenimiento{d.observaciones ? ` — ${d.observaciones}` : ''}</p>
                      </div>
                    ))}
                  </div>

                  <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                    <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Últimas Actividades</h4>
                    {eventosRecientesTodos.length === 0 && <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin actividad registrada.</p>}
                    {eventosRecientesTodos.slice(0, 8).map((e) => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                        <span>{e.tipo === 'SALIDA' ? '↗️' : '↘️'}</span>
                        <div>
                          <p style={{ margin: 0, color: colors.text, fontSize: '12px', fontWeight: 'bold' }}>{e.dronCodigo} — {e.persona || '—'}</p>
                          <p style={{ margin: 0, color: colors.textTertiary, fontSize: '11px' }}>{new Date(e.fecha).toLocaleString('es-EC')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Histórico de estado de flota</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={estadisticas.movimientosPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="fecha" tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" dataKey="salidas" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="entradas" stroke="#3fb950" fill="#3fb950" fillOpacity={0.25} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="card" style={{ backgroundColor: colors.bgCard, padding: '15px', border: `1px solid ${colors.border}` }}>
                  <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Inventario Completo</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                          <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Código</th>
                          <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Modelo</th>
                          <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Estado</th>
                          <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Tag RFID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drones.map((d) => (
                          <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <td style={{ padding: '8px', color: colors.text, fontSize: '12px', fontWeight: 'bold' }}>{d.codigoInterno}</td>
                            <td style={{ padding: '8px', color: colors.text, fontSize: '12px' }}>{d.modelo}</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ padding: '3px 7px', backgroundColor: colorEstado(d.estado), color: 'white', borderRadius: '4px', fontSize: '10px' }}>{d.estado}</span>
                            </td>
                            <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '12px' }}>{d.tagRfid || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={cerrarModal}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '480px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>{editando ? 'Perfil del Dron' : 'Nuevo Dron'}</h3>
              <button onClick={cerrarModal} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              {editando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div
                    onClick={() => dronFotoInputRef.current?.click()}
                    style={{
                      width: '60px', height: '60px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                      backgroundColor: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', border: `2px solid ${colors.border}`, overflow: 'hidden',
                      backgroundImage: (previewFotoDron || getImageUrl(dronPerfil?.foto)) ? `url(${previewFotoDron || getImageUrl(dronPerfil?.foto)})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}
                  >
                    {!(previewFotoDron || dronPerfil?.foto) && '🚁'}
                  </div>
                  <div>
                    <button type="button" onClick={() => dronFotoInputRef.current?.click()} className="btn" style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>
                      📷 Cambiar foto
                    </button>
                    <input ref={dronFotoInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFotoDronChange} style={{ display: 'none' }} />
                  </div>
                </div>
              )}

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
                  <label style={labelStyle}>Marca</label>
                  <input type="text" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} style={inputStyle} placeholder="Ej. DJI" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Versión</label>
                  <input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} style={inputStyle} placeholder="Ej. RTK v2" required />
                </div>
                <div>
                  <label style={labelStyle}>Año de compra (opcional)</label>
                  <input type="number" value={formData.anioCompra} onChange={(e) => setFormData({ ...formData, anioCompra: e.target.value })} style={inputStyle} placeholder="Ej. 2024" />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Tag RFID (opcional)</label>
                <input type="text" value={formData.tagRfid} onChange={(e) => setFormData({ ...formData, tagRfid: e.target.value.toUpperCase() })} style={inputStyle} placeholder="Ej. 0B7F1A22" />
              </div>

              {editando && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={labelStyle}>Estado</label>
                      <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} style={inputStyle}>
                        <option value="DISPONIBLE">Disponible</option>
                        <option value="PRESTADO">Prestado</option>
                        <option value="MANTENIMIENTO">Mantenimiento</option>
                        <option value="BAJA">Baja</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Ubicación en bodega</label>
                      <input type="text" value={formData.ubicacionBodega} onChange={(e) => setFormData({ ...formData, ubicacionBodega: e.target.value })} style={inputStyle} placeholder="Ej. Banco 3" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={labelStyle}>Horas de vuelo (vitácora)</label>
                      <input type="number" step="0.1" min="0" value={formData.horasVuelo} onChange={(e) => setFormData({ ...formData, horasVuelo: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Batería % (último reporte manual)</label>
                      <input type="number" min="0" max="100" value={formData.bateriaPorcentaje} onChange={(e) => setFormData({ ...formData, bateriaPorcentaje: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <p style={{ margin: '-4px 0 10px 0', fontSize: '11px', color: colors.textTertiary }}>
                    El estado DISPONIBLE/PRESTADO normalmente lo cambia solo el escaneo RFID o el movimiento manual — cámbialo aquí solo para correcciones.
                  </p>
                </>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Observaciones (opcional)</label>
                <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' as const }} />
              </div>

              {editando && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Tareas de mantenimiento</label>
                  <div style={{ marginTop: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {tareas.filter((t) => t.dronId === formData.id).length === 0 && (
                      <p style={{ margin: 0, fontSize: '12px', color: colors.textTertiary }}>Sin tareas registradas.</p>
                    )}
                    {tareas.filter((t) => t.dronId === formData.id).map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.border}` }}>
                        <div>
                          <span style={{ fontSize: '12px', color: colors.text }}>{t.descripcion}</span>
                          <span style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', borderRadius: '8px', color: 'white', backgroundColor: colorPrioridad(t.prioridad) }}>{t.prioridad}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: t.estado === 'COMPLETADA' ? '#3fb950' : colors.textSecondary }}>{t.estado}</span>
                      </div>
                    ))}
                  </div>
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
                  {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear Dron'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNuevaTarea && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowNuevaTarea(false)}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '400px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>Nueva tarea de mantenimiento</h3>
              <button onClick={() => setShowNuevaTarea(false)} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCrearTarea}>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Dron</label>
                <select value={tareaDronId} onChange={(e) => setTareaDronId(e.target.value)} style={inputStyle} required>
                  <option value="">Selecciona un dron...</option>
                  {drones.map((d) => <option key={d.id} value={d.id}>{d.codigoInterno} — {d.modelo}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Descripción</label>
                <textarea value={tareaDescripcion} onChange={(e) => setTareaDescripcion(e.target.value)} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' as const }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div>
                  <label style={labelStyle}>Prioridad</label>
                  <select value={tareaPrioridad} onChange={(e) => setTareaPrioridad(e.target.value)} style={inputStyle}>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Técnico (opcional)</label>
                  <input type="text" value={tareaTecnico} onChange={(e) => setTareaTecnico(e.target.value)} style={inputStyle} placeholder="Nombre" />
                </div>
              </div>
              {tareaError && <p style={{ color: '#f85149', fontSize: '12px', marginTop: '-8px', marginBottom: '14px' }}>{tareaError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowNuevaTarea(false)} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={tareaGuardando} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: tareaGuardando ? 0.6 : 1 }}>
                  {tareaGuardando ? 'Creando...' : 'Crear tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventoDetalle && (() => {
        const dron = drones.find((d) => d.id === eventoDetalle.dronId)
        const usuarioSalida = usuarios.find((u) => u.id === eventoDetalle.usuarioSalidaId)
        const usuarioEntrada = usuarios.find((u) => u.id === eventoDetalle.usuarioEntradaId)
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setEventoDetalle(null)}>
            <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '440px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>Detalle del movimiento</h3>
                <button onClick={() => setEventoDetalle(null)} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '8px', backgroundColor: colors.bgTertiary, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', overflow: 'hidden',
                  backgroundImage: dron?.foto ? `url(${getImageUrl(dron.foto)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {!dron?.foto && '🚁'}
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.text, fontWeight: 'bold', fontSize: '14px' }}>{eventoDetalle.dronCodigoInterno}</p>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '12px' }}>{dron?.modelo}{dron?.marca ? ` · ${dron.marca}` : ''}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', backgroundColor: colors.primary, color: isDarkMode ? '#0d1117' : '#ffffff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden',
                  backgroundImage: usuarioSalida?.foto ? `url(${getImageUrl(usuarioSalida.foto)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {!usuarioSalida?.foto && (eventoDetalle.usuarioSalidaNombre?.charAt(0) || '?')}
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.text, fontSize: '13px' }}>↗️ Sacó: <b>{eventoDetalle.usuarioSalidaNombre}</b></p>
                  <p style={{ margin: 0, color: colors.textTertiary, fontSize: '11px' }}>{new Date(eventoDetalle.fechaSalida).toLocaleString('es-EC')}</p>
                </div>
              </div>

              {eventoDetalle.fechaEntrada && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#3fb950', color: 'white', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden',
                    backgroundImage: usuarioEntrada?.foto ? `url(${getImageUrl(usuarioEntrada.foto)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
                  }}>
                    {!usuarioEntrada?.foto && (eventoDetalle.usuarioEntradaNombre?.charAt(0) || '?')}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: colors.text, fontSize: '13px' }}>↘️ Entregó: <b>{eventoDetalle.usuarioEntradaNombre}</b></p>
                    <p style={{ margin: 0, color: colors.textTertiary, fontSize: '11px' }}>{new Date(eventoDetalle.fechaEntrada).toLocaleString('es-EC')}</p>
                  </div>
                </div>
              )}

              <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: colors.textSecondary }}>
                Duración: <b>{duracion(eventoDetalle)}</b>{!eventoDetalle.fechaEntrada ? ' (en curso)' : ''}
              </p>
              <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: colors.textSecondary }}>
                Origen: <span style={{ padding: '2px 7px', borderRadius: '8px', color: 'white', fontSize: '10px', backgroundColor: eventoDetalle.origen === 'ESP32' ? '#3fb950' : '#8b949e' }}>{eventoDetalle.origen}</span>
              </p>
              {eventoDetalle.observaciones && (
                <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: colors.textSecondary, fontStyle: 'italic' }}>"{eventoDetalle.observaciones}"</p>
              )}

              <button onClick={() => setEventoDetalle(null)} className="btn" style={{ width: '100%', marginTop: '18px', padding: '10px', backgroundColor: colors.bgTertiary, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        )
      })()}

      {showMovimiento && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowMovimiento(false)}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '420px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
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
