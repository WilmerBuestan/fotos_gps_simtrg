import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Props {
  lat: number
  lon: number
  height?: string
}

// Mapa de solo lectura (sin interacción de clic) para mostrar un punto ya
// conocido, como la última ubicación de un usuario. Para seleccionar/editar
// un punto, usar MapaSelectorModal en su lugar.
export default function UbicacionMiniMapa({ lat, lon, height = '180px' }: Props) {
  return (
    <div style={{ height, borderRadius: '6px', overflow: 'hidden' }}>
      <MapContainer
        center={[lat, lon]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
        <Marker position={[lat, lon]} />
      </MapContainer>
    </div>
  )
}
