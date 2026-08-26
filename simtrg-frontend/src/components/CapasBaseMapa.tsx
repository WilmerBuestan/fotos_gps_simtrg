import { LayersControl, TileLayer } from 'react-leaflet'

export type CapaMapaId = 'satelital' | 'oscuro' | 'claro' | 'calles'

interface Props {
  predeterminada?: CapaMapaId
}

// Control de capas de Leaflet: deja elegir el tipo de mapa base (satelital,
// oscuro, claro, calles) desde el propio mapa, en vez de un tile fijo.
// Se usa en Dashboard, Mapa Geoespacial y Mapa de Calor.
export default function CapasBaseMapa({ predeterminada = 'satelital' }: Props) {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked={predeterminada === 'satelital'} name="🛰️ Satelital">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri"
          crossOrigin="anonymous"
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={predeterminada === 'oscuro'} name="🌑 Oscuro">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri"
          crossOrigin="anonymous"
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={predeterminada === 'claro'} name="☀️ Claro">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri"
          crossOrigin="anonymous"
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={predeterminada === 'calles'} name="🗺️ Calles">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          crossOrigin="anonymous"
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  )
}
