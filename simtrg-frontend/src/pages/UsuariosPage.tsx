import { useState, useEffect } from 'react'
import API from '../services/api'
import { getImageUrl } from '../utils/media'
import { useTheme } from '../contexts/ThemeContext'
import UbicacionMiniMapa from '../components/UbicacionMiniMapa'

export default function UsuariosPage() {
  const { colors } = useTheme()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [fotos, setFotos] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [selectedOperador, setSelectedOperador] = useState<any>(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [usuariosRes, fotosRes, eventosRes] = await Promise.all([
        API.get('/usuarios'),
        API.get('/drones'),
        API.get('/eventos'),
      ])
      setUsuarios(usuariosRes.data || [])
      setFotos(fotosRes.data || [])
      setEventos(eventosRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setListLoading(false)
    }
  }

  const statsPorOperador: Record<string, { fotos: number; eventos: number; provincias: Set<string>; ultima: number }> = {}
  const registrarStat = (operadorId: string, tipo: 'fotos' | 'eventos', provincia: string | null, fecha: number) => {
    if (!operadorId) return
    if (!statsPorOperador[operadorId]) statsPorOperador[operadorId] = { fotos: 0, eventos: 0, provincias: new Set(), ultima: 0 }
    statsPorOperador[operadorId][tipo]++
    if (provincia) statsPorOperador[operadorId].provincias.add(provincia)
    if (fecha > statsPorOperador[operadorId].ultima) statsPorOperador[operadorId].ultima = fecha
  }
  fotos.forEach(f => registrarStat(f.operadorId, 'fotos', f.provincia, new Date(f.fechaCaptura || f.createdAt).getTime()))
  eventos.forEach(e => registrarStat(e.operadorId, 'eventos', e.provincia, new Date(e.fechaHora).getTime()))

  const actividadDe = (operadorId: string) => {
    const items = [
      ...fotos.filter(f => f.operadorId === operadorId).map(f => ({ tipo: 'foto' as const, fecha: new Date(f.fechaCaptura || f.createdAt), data: f })),
      ...eventos.filter(e => e.operadorId === operadorId).map(e => ({ tipo: 'evento' as const, fecha: new Date(e.fechaHora), data: e })),
    ]
    return items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 8)
  }

  if (listLoading) return <div style={{ color: colors.text }}>Cargando...</div>

  return (
    <div>
      <h2 style={{ color: colors.text, marginBottom: '8px' }}>👥 Supervisión de Operadores</h2>
      <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>
        Actividad de cada operador: cuánto ha subido, dónde y cuándo
      </p>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Usuarios del Sistema ({usuarios.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Nombre</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Rol</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Estado</th>
                <th style={{ padding: '10px', textAlign: 'center', color: colors.textSecondary, fontSize: '12px' }}>📸 Fotos</th>
                <th style={{ padding: '10px', textAlign: 'center', color: colors.textSecondary, fontSize: '12px' }}>⚠️ Eventos</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Provincias</th>
                <th style={{ padding: '10px', textAlign: 'left', color: colors.textSecondary, fontSize: '12px' }}>Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(usr => {
                const stat = statsPorOperador[usr.id]
                return (
                  <tr key={usr.id} onClick={() => setSelectedOperador(usr)} className="row-hover" style={{ borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                    <td style={{ padding: '10px', color: colors.text, fontSize: '13px' }}>
                      {usr.nombreCompleto}
                      <div style={{ fontSize: '11px', color: colors.textSecondary }}>{usr.username}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#58a6ff', color: 'white', borderRadius: '4px', fontSize: '11px' }}>{usr.rol}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: usr.activo ? '#3fb950' : '#f85149', color: 'white', borderRadius: '4px', fontSize: '11px' }}>
                        {usr.activo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: colors.text, fontSize: '13px' }}>{stat?.fotos || 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: colors.text, fontSize: '13px' }}>{stat?.eventos || 0}</td>
                    <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{stat && stat.provincias.size > 0 ? Array.from(stat.provincias).join(', ') : '—'}</td>
                    <td style={{ padding: '10px', color: colors.textSecondary, fontSize: '12px' }}>{stat && stat.ultima > 0 ? new Date(stat.ultima).toLocaleDateString('es-EC') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOperador && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setSelectedOperador(null)}>
          <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '500px', width: '100%', padding: '20px', maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '16px' }}>{selectedOperador.nombreCompleto}</h3>
              <button onClick={() => setSelectedOperador(null)} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
              <div style={{ backgroundColor: colors.bg, padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: colors.textSecondary }}>Fotos</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#58a6ff' }}>{statsPorOperador[selectedOperador.id]?.fotos || 0}</p>
              </div>
              <div style={{ backgroundColor: colors.bg, padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: colors.textSecondary }}>Eventos</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#ffa657' }}>{statsPorOperador[selectedOperador.id]?.eventos || 0}</p>
              </div>
              <div style={{ backgroundColor: colors.bg, padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: colors.textSecondary }}>Provincias</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#db61a2' }}>{statsPorOperador[selectedOperador.id]?.provincias.size || 0}</p>
              </div>
            </div>

            <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Última ubicación conocida</h4>
            {selectedOperador.ultimaUbicacionLat != null && selectedOperador.ultimaUbicacionLon != null ? (
              <div style={{ marginBottom: '15px' }}>
                <UbicacionMiniMapa lat={selectedOperador.ultimaUbicacionLat} lon={selectedOperador.ultimaUbicacionLon} />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: colors.textSecondary }}>
                  {[selectedOperador.ultimaUbicacionParroquia, selectedOperador.ultimaUbicacionCanton, selectedOperador.ultimaUbicacionProvincia].filter(Boolean).join(', ') || 'Ubicación fuera de zonas conocidas'}
                  {' · '}
                  {selectedOperador.ultimaUbicacionLat.toFixed(4)}°, {selectedOperador.ultimaUbicacionLon.toFixed(4)}°
                </p>
                {selectedOperador.ultimaUbicacionFecha && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: colors.textTertiary }}>
                    Registrada el {new Date(selectedOperador.ultimaUbicacionFecha).toLocaleString('es-EC')}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '15px' }}>
                Sin registro de ubicación (se captura al iniciar/cerrar sesión, si el usuario autoriza la geolocalización del navegador).
              </p>
            )}

            <h4 style={{ color: colors.text, margin: '0 0 10px 0', fontSize: '13px' }}>Actividad reciente</h4>
            {actividadDe(selectedOperador.id).length === 0 ? (
              <p style={{ color: colors.textSecondary, fontSize: '12px' }}>Sin actividad registrada</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {actividadDe(selectedOperador.id).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.bg, padding: '8px', borderRadius: '6px' }}>
                    {item.tipo === 'foto' ? (
                      getImageUrl(item.data.rutaMiniatura) ? (
                        <img src={getImageUrl(item.data.rutaMiniatura)!} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '4px', backgroundColor: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</div>
                      )
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '4px', backgroundColor: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚠️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', color: colors.text, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.tipo === 'foto' ? item.data.nombreArchivo : (item.data.tipoActividad?.nombre || 'Evento')}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: colors.textSecondary }}>
                        {item.data.provincia || 'Sin ubicación'} · {item.fecha.toLocaleDateString('es-EC')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
