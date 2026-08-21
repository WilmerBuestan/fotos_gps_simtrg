import { useState, useEffect, useCallback } from 'react'
import API from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

const TIPOS_EVENTO = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE']

const colorTipoEvento = (tipo: string) => {
  switch (tipo) {
    case 'LOGIN': return '#3fb950'
    case 'LOGOUT': return '#8b949e'
    case 'CREATE': return '#58a6ff'
    case 'UPDATE': return '#ffa657'
    case 'DELETE': return '#f85149'
    default: return '#8b949e'
  }
}

export default function LogsPage() {
  const { colors } = useTheme()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [tipoEvento, setTipoEvento] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const cargarLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit }
      if (tipoEvento) params.tipoEvento = tipoEvento
      if (fechaDesde) params.fechaDesde = new Date(fechaDesde).toISOString()
      if (fechaHasta) {
        const fin = new Date(fechaHasta)
        fin.setHours(23, 59, 59)
        params.fechaHasta = fin.toISOString()
      }
      const res = await API.get('/logs', { params })
      setLogs(res.data?.data || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      console.error('Error:', err)
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, tipoEvento, fechaDesde, fechaHasta])

  useEffect(() => {
    cargarLogs()
  }, [cargarLogs])

  // Cualquier cambio de filtro vuelve a la página 1
  useEffect(() => {
    setPage(1)
  }, [tipoEvento, fechaDesde, fechaHasta])

  const inputStyle = { width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '11px', boxSizing: 'border-box' as const }
  const labelStyle = { color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' as const }

  const totalPaginas = Math.max(1, Math.ceil(total / limit))

  const ubicacionTexto = (log: any) => {
    const partes = [log.parroquia, log.canton, log.provincia].filter(Boolean)
    return partes.length > 0 ? partes.join(', ') : (log.latitud != null ? 'Fuera de zonas conocidas' : '—')
  }

  return (
    <div>
      <h2 style={{ color: colors.text, marginBottom: '8px' }}>📋 Logs de Auditoría</h2>
      <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>
        Quién entra, quién sale y qué se crea/edita/elimina en el sistema
      </p>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>🔍 Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Evento</label>
            <select value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {TIPOS_EVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
          </div>
          {(tipoEvento || fechaDesde || fechaHasta) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => { setTipoEvento(''); setFechaDesde(''); setFechaHasta('') }}
                className="btn"
                style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, fontSize: '11px' }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Registros ({total})</h3>
        {loading ? (
          <p style={{ color: colors.textSecondary }}>Cargando...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>Sin registros para estos filtros</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Fecha/Hora</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Evento</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Usuario</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Acción</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>IP</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: colors.textSecondary, fontSize: '11px' }}>Ubicación</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: colors.textSecondary, fontSize: '11px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="row-hover" style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '8px', color: colors.text, fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString('es-EC')}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ padding: '3px 7px', backgroundColor: colorTipoEvento(log.tipoEvento), color: 'white', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        {log.tipoEvento}
                      </span>
                    </td>
                    <td style={{ padding: '8px', color: colors.text, fontSize: '11px' }}>
                      {log.username || 'ANÓNIMO'}
                      {log.rol && <div style={{ fontSize: '10px', color: colors.textTertiary }}>{log.rol}</div>}
                    </td>
                    <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${log.metodoHttp} ${log.url}`}>
                      {log.metodoHttp} {log.url}
                    </td>
                    <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{log.ip || '—'}</td>
                    <td style={{ padding: '8px', color: colors.textSecondary, fontSize: '11px' }}>{ubicacionTexto(log)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {log.exitoso ? (
                        <span title="Exitoso" style={{ color: '#3fb950' }}>✓</span>
                      ) : (
                        <span title={log.mensajeError || 'Error'} style={{ color: '#f85149' }}>✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn"
              style={{ padding: '6px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, fontSize: '12px', opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Anterior
            </button>
            <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Página {page} de {totalPaginas}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              disabled={page >= totalPaginas}
              className="btn"
              style={{ padding: '6px 14px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, fontSize: '12px', opacity: page >= totalPaginas ? 0.4 : 1, cursor: page >= totalPaginas ? 'not-allowed' : 'pointer' }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
