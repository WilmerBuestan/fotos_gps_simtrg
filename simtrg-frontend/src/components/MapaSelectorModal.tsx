import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Colores {
  bg: string
  bgCard: string
  text: string
  textSecondary: string
  border: string
}

interface Props {
  latInicial?: number | null
  lonInicial?: number | null
  colors: Colores
  onConfirmar: (lat: number, lon: number) => void
  onCerrar: () => void
}

const CENTRO_ECUADOR: [number, number] = [-0.2226, -78.5125]

function SelectorClicks({ onSeleccionar }: { onSeleccionar: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onSeleccionar(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function CentrarMapa({ punto, trigger }: { punto: [number, number]; trigger: number }) {
  const map = useMap()
  useEffect(() => {
    if (trigger > 0) map.flyTo(punto, 15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return null
}

export default function MapaSelectorModal({ latInicial, lonInicial, colors, onConfirmar, onCerrar }: Props) {
  const [punto, setPunto] = useState<[number, number]>(
    latInicial != null && lonInicial != null ? [latInicial, lonInicial] : CENTRO_ECUADOR,
  )
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false)
  const [recentrarTrigger, setRecentrarTrigger] = useState(0)

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      return
    }
    setObteniendoUbicacion(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPunto([pos.coords.latitude, pos.coords.longitude])
        setRecentrarTrigger((t) => t + 1)
        setObteniendoUbicacion(false)
      },
      () => {
        alert('No se pudo obtener tu ubicación actual')
        setObteniendoUbicacion(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}
      onClick={onCerrar}
    >
      <div
        style={{ backgroundColor: colors.bgCard, borderRadius: '10px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '15px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: colors.text, fontSize: '15px' }}>🗺️ Seleccionar ubicación</h3>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ height: '360px' }}>
          <MapContainer center={punto} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
            <Marker position={punto} />
            <SelectorClicks onSeleccionar={(lat, lon) => setPunto([lat, lon])} />
            <CentrarMapa punto={punto} trigger={recentrarTrigger} />
          </MapContainer>
        </div>

        <div style={{ padding: '15px 20px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: colors.textSecondary }}>
            Clic en el mapa para mover el punto. Coordenadas:{' '}
            <strong style={{ color: colors.text }}>{punto[0].toFixed(5)}°, {punto[1].toFixed(5)}°</strong>
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={usarUbicacionActual}
              disabled={obteniendoUbicacion}
              style={{ padding: '10px 14px', backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: obteniendoUbicacion ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              {obteniendoUbicacion ? '⏳ Obteniendo...' : '🎯 Usar mi ubicación actual'}
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={onCerrar} style={{ padding: '10px 16px', backgroundColor: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              Cancelar
            </button>
            <button
              onClick={() => onConfirmar(punto[0], punto[1])}
              style={{ padding: '10px 16px', backgroundColor: '#3fb950', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              ✅ Confirmar ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
