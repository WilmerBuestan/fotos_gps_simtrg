import { useState, useEffect } from 'react'
import API from '../services/api'
import { getImageUrl } from '../utils/media'
import MapaSelectorModal from '../components/MapaSelectorModal'
import { useTheme } from '../contexts/ThemeContext'

export default function FotosPage() {
  const { colors } = useTheme()
  const [fotos, setFotos] = useState<any[]>([])
  const [filtros, setFiltros] = useState({ fechas: [], operadores: [], provincias: [] })
  const [operadoresMap, setOperadoresMap] = useState({})
  const [selectedFechaInicio, setSelectedFechaInicio] = useState('')
  const [selectedFechaFin, setSelectedFechaFin] = useState('')
  const [selectedOperador, setSelectedOperador] = useState('')
  const [selectedProvincia, setSelectedProvincia] = useState('')
  const [selectedCanton, setSelectedCanton] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFoto, setSelectedFoto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [savingCoords, setSavingCoords] = useState(false)
  const [sinGpsQueue, setSinGpsQueue] = useState<string[]>([])







// Solo se usa para poblar las opciones de los selects de Provincia/Cantón
// (nombres administrativos válidos). La ubicación real de cada foto viene
// resuelta por el backend (provincia/canton ya persistidos en el registro).
const [cantonesPorProvincia, setCantonesPorProvincia] = useState<Record<string, string[]>>({})

useEffect(() => {
  const loadProvincias = async () => {
    try {
      const response = await fetch('/provincias.json')
      if (!response.ok) throw new Error('Failed to load provincias.json')
      const data: Record<string, any> = await response.json()
      const formatted: Record<string, string[]> = {}

      Object.values(data).forEach((prov: any) => {
        if (prov && prov.provincia && prov.cantones) {
          formatted[prov.provincia] = Object.values(prov.cantones).map((cant: any) => cant.canton)
        }
      })
      setCantonesPorProvincia(formatted)
    } catch (err) {
      console.error('Error loading provincias:', err)
    }
  }
  loadProvincias()
}, [])





  useEffect(() => {
    cargarFotos()
    cargarFiltros()
    cargarOperadores()
  }, [])

  const cargarFotos = async () => {
    try {
      const res = await API.get('/drones')
      setFotos(res.data || [])
    } catch (err) {
      console.error('Error:', err)
      setFotos([])
    } finally {
      setLoading(false)
    }
  }

  const cargarFiltros = async () => {
    try {
      const res = await API.get('/drones/filtros')
      setFiltros(res.data || { fechas: [], operadores: [], provincias: [] })
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

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files || []))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f =>
      ['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)
    )
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    setProgress(0)
    const formData = new FormData()
    selectedFiles.forEach(file => formData.append('fotos', file))

    try {
      const uploadRes = await API.post('/drones/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
      setSelectedFiles([])
      setProgress(0)

      const fotosRes = await API.get('/drones')
      setFotos(fotosRes.data || [])
      await cargarFiltros()

      // Si alguna foto subió sin GPS, pedimos coordenadas de inmediato
      const idsSinGps = (uploadRes.data?.resultados || [])
        .filter((r: any) => r.estado === 'sin_gps' && r.id)
        .map((r: any) => r.id)
      if (idsSinGps.length > 0) {
        setSinGpsQueue(idsSinGps)
        const primera = (fotosRes.data || []).find((f: any) => f.id === idsSinGps[0])
        if (primera) {
          setSelectedFoto(primera)
          setShowMapPicker(true)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al subir fotos')
    } finally {
      setUploading(false)
    }
  }

  const guardarCoordenadas = async (fotoId: string, lat: number, lon: number) => {
    setSavingCoords(true)
    try {
      await API.patch(`/drones/${fotoId}/coordenadas`, { latitud: lat, longitud: lon })
      const fotosRes = await API.get('/drones')
      setFotos(fotosRes.data || [])
      await cargarFiltros()

      const restantes = sinGpsQueue.filter((id) => id !== fotoId)
      setSinGpsQueue(restantes)
      if (restantes.length > 0) {
        const siguiente = (fotosRes.data || []).find((f: any) => f.id === restantes[0])
        setSelectedFoto(siguiente || null)
        setShowMapPicker(!!siguiente)
      } else {
        setShowMapPicker(false)
        setSelectedFoto((fotosRes.data || []).find((f: any) => f.id === fotoId) || null)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al guardar coordenadas')
    } finally {
      setSavingCoords(false)
    }
  }

  const handleDelete = async (fotoId) => {
    if (!window.confirm('¿Eliminar esta foto?')) return
    try {
      await API.delete(`/drones/${fotoId}`)
      await cargarFotos()
      setSelectedFoto(null)
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar foto')
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
    if (selectedProvincia && foto.provincia !== selectedProvincia) return false
    if (selectedCanton && foto.canton !== selectedCanton) return false
    return true
  })

  const cantonesProvincia = selectedProvincia ? (cantonesPorProvincia[selectedProvincia] || []) : []

  if (loading) return <div style={{ color: colors.text }}>Cargando fotos...</div>

  return (
    <div>
      <h2 style={{ color: colors.text, marginBottom: '8px' }}>📸 Fotos de Drones</h2>
      <p style={{ color: colors.textSecondary, marginTop: '0', marginBottom: '20px' }}>Gestiona fotos georeferenciadas</p>

      <div className="card animate-in" onDragOver={handleDrop} onDrop={handleDrop} style={{ border: `2px dashed #58a6ff`, padding: '30px', marginBottom: '20px', textAlign: 'center', backgroundColor: colors.bgCard, cursor: 'pointer' }}>
        <input type="file" multiple accept="image/jpeg,image/png" onChange={handleFileSelect} id="file-input" style={{ display: 'none' }} />
        <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
          <p style={{ color: colors.text, fontWeight: 'bold', margin: '0 0 5px 0' }}>Arrastra fotos aquí o haz clic</p>
          <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0' }}>JPG, PNG (máx 50MB)</p>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.text, fontWeight: 'bold', margin: '0 0 10px 0' }}>📋 {selectedFiles.length} archivo(s)</p>
          {progress > 0 && progress < 100 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ width: '100%', height: '6px', backgroundColor: colors.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#58a6ff', transition: 'width 0.3s' }}></div>
              </div>
              <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '5px 0 0 0' }}>{progress}%</p>
            </div>
          )}
          <button onClick={handleUpload} disabled={uploading} className="btn" style={{ width: '100%', padding: '10px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? `⏳ ${progress}%` : '🚀 Subir'}
          </button>
        </div>
      )}

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '15px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>🔍 Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' }}>Provincia</label>
            <select value={selectedProvincia} onChange={(e) => { setSelectedProvincia(e.target.value); setSelectedCanton(''); }} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '10px' }}>
              <option value="">Todas</option>
              {Object.keys(cantonesPorProvincia).sort().map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' }}>Cantón</label>
            <select value={selectedCanton} onChange={(e) => setSelectedCanton(e.target.value)} disabled={!selectedProvincia} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '10px' }}>
              <option value="">Todos</option>
              {cantonesProvincia.slice().sort().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' }}>Desde</label>
            <input type="date" value={selectedFechaInicio} onChange={(e) => setSelectedFechaInicio(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '10px' }} />
          </div>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' }}>Hasta</label>
            <input type="date" value={selectedFechaFin} onChange={(e) => setSelectedFechaFin(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '10px' }} />
          </div>
          <div>
            <label style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' }}>Operador</label>
            <select value={selectedOperador} onChange={(e) => setSelectedOperador(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '4px', marginTop: '4px', fontSize: '10px' }}>
              <option value="">Todos</option>
              {filtros.operadores && filtros.operadores.map(id => <option key={id} value={id}>{operadoresMap[id] || id}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card animate-in" style={{ backgroundColor: colors.bgCard, padding: '20px', border: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>Galería ({fotosFiltradas.length})</h3>
        {fotosFiltradas.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>Sin fotos</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
            {fotosFiltradas.map(foto => {
              const imgUrl = getImageUrl(foto.rutaMiniatura)
              return (
                <div key={foto.id} onClick={() => setSelectedFoto(foto)} className="card card-hover" style={{ overflow: 'hidden', border: selectedFoto?.id === foto.id ? '2px solid #58a6ff' : `1px solid ${colors.border}`, cursor: 'pointer' }}>
                  <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: colors.textSecondary, backgroundColor: colors.border }}>
                    {imgUrl ? <img src={imgUrl} alt={foto.nombreArchivo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

{selectedFoto && (
  <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedFoto(null)}>
    <div className="card animate-in" style={{ backgroundColor: colors.bgCard, maxWidth: '500px', width: '90%', padding: '20px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
      <h3 style={{ color: colors.text, margin: '0 0 15px 0' }}>{selectedFoto.nombreArchivo}</h3>
      <div style={{ height: '250px', backgroundColor: colors.border, borderRadius: '6px', marginBottom: '15px', overflow: 'hidden' }}>
        {(() => { const detalleImgUrl = getImageUrl(selectedFoto.rutaMiniatura); return detalleImgUrl ? (
          <img src={detalleImgUrl} alt={selectedFoto.nombreArchivo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSecondary }}>📷 Sin imagen</div>
        ) })()}
      </div>
      <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.5', marginBottom: '15px', backgroundColor: colors.bg, padding: '10px', borderRadius: '4px' }}>
        <p style={{ margin: '4px 0' }}><strong style={{ color: colors.text }}>Tamaño:</strong> {(selectedFoto.tamanoBytes / 1024).toFixed(2)} KB</p>
        {selectedFoto.latitud ? (
          <>
            <p style={{ margin: '4px 0' }}><strong style={{ color: colors.text }}>Coordenadas:</strong> {selectedFoto.latitud.toFixed(4)}°, {selectedFoto.longitud.toFixed(4)}°</p>
            <p style={{ margin: '4px 0' }}><strong style={{ color: colors.text }}>Provincia:</strong> {selectedFoto.provincia || 'Desconocida'}</p>
            <p style={{ margin: '4px 0' }}><strong style={{ color: colors.text }}>Cantón:</strong> {selectedFoto.canton || 'Desconocido'}</p>
          </>
        ) : (
          <div style={{ padding: '10px', backgroundColor: colors.border, borderRadius: '4px', border: `2px solid #f85149` }}>
            <p style={{ margin: '0 0 10px 0', color: '#f85149', fontWeight: 'bold' }}>⚠️ SIN UBICACIÓN GPS</p>
            <p style={{ margin: '0 0 8px 0', color: colors.text }}>Ingrese coordenadas manualmente:</p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <input type="number" placeholder="Latitud" step="0.0001" min="-90" max="90" id={`lat-${selectedFoto.id}`} style={{ flex: 1, padding: '6px', fontSize: '10px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '3px' }} />
              <input type="number" placeholder="Longitud" step="0.0001" min="-180" max="180" id={`lon-${selectedFoto.id}`} style={{ flex: 1, padding: '6px', fontSize: '10px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '3px' }} />
            </div>
            <button disabled={savingCoords} onClick={() => {
              const lat = parseFloat((document.getElementById(`lat-${selectedFoto.id}`) as HTMLInputElement)?.value || '0')
              const lon = parseFloat((document.getElementById(`lon-${selectedFoto.id}`) as HTMLInputElement)?.value || '0')
              if (lat && lon) {
                guardarCoordenadas(selectedFoto.id, lat, lon)
              } else {
                alert('Ingrese latitud y longitud válidas')
              }
            }} className="btn" style={{ width: '100%', padding: '6px', fontSize: '10px', backgroundColor: '#3fb950', color: 'white', fontWeight: 'bold', marginBottom: '8px', opacity: savingCoords ? 0.6 : 1 }}>
              {savingCoords ? '⏳ Guardando...' : '✅ Guardar Coordenadas'}
            </button>
            <button disabled={savingCoords} onClick={() => setShowMapPicker(true)} className="btn" style={{ width: '100%', padding: '6px', fontSize: '10px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontWeight: 'bold' }}>
              🗺️ Seleccionar en el mapa
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setSelectedFoto(null)} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: '#58a6ff', color: colors.bgCard, fontWeight: 'bold', fontSize: '12px' }}>Cerrar</button>
        <button onClick={() => handleDelete(selectedFoto.id)} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: '#f85149', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Eliminar</button>
      </div>
    </div>
  </div>
)}





      {showMapPicker && selectedFoto && (
        <MapaSelectorModal
          latInicial={selectedFoto.latitud}
          lonInicial={selectedFoto.longitud}
          colors={colors}
          onCerrar={() => setShowMapPicker(false)}
          onConfirmar={(lat, lon) => {
            setShowMapPicker(false)
            guardarCoordenadas(selectedFoto.id, lat, lon)
          }}
        />
      )}
    </div>
  )
}
