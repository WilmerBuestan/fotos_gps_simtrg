import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface Props {
  puntos: [number, number][]
}

// Encuadra el mapa automáticamente sobre los puntos recibidos (en vez de un
// centro/zoom fijo que puede dejar los marcadores diminutos en una esquina).
// Con un solo punto, centra y acerca; con varios, ajusta los límites.
export default function AjustarLimitesMapa({ puntos }: Props) {
  const map = useMap()

  useEffect(() => {
    if (puntos.length === 0) return

    // Leaflet cachea el tamaño del contenedor al montar; si el mapa vive
    // dentro de una tarjeta/layout flex, ese tamaño puede quedar mal
    // medido. invalidateSize() lo corrige, pero si el ajuste de límites
    // se aplica en el mismo tick, el renderer SVG de los marcadores no
    // siempre termina de resincronizar su transform con el mapa (quedan
    // corridos). Se difiere un frame para que el navegador termine de
    // aplicar el resize antes de mover/hacer zoom.
    map.invalidateSize({ pan: false, animate: false })

    const id = requestAnimationFrame(() => {
      if (puntos.length === 1) {
        map.setView(puntos[0], 13, { animate: false })
      } else {
        map.fitBounds(L.latLngBounds(puntos), { padding: [20, 20], maxZoom: 15, animate: false })
      }
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(puntos)])

  return null
}
