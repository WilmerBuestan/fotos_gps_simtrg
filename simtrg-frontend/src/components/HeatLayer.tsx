import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

// leaflet.heat es un plugin clásico (no ESM) que espera `L` como variable
// global del navegador. Con imports de ES modules eso nunca queda seteado,
// así que lo hacemos explícito antes de cargar el plugin dinámicamente.
if (typeof window !== 'undefined' && !(window as any).L) {
  ;(window as any).L = L
}

interface Props {
  puntos: [number, number, number][]
  max?: number
}

export default function HeatLayer({ puntos, max }: Props) {
  const map = useMap()

  useEffect(() => {
    let cancelado = false
    let capa: any = null

    import('leaflet.heat').then(() => {
      if (cancelado) return
      capa = (L as any).heatLayer(puntos, {
        radius: 28,
        blur: 22,
        maxZoom: 14,
        max: max && max > 0 ? max : 1,
        minOpacity: 0.4,
        gradient: { 0.2: '#3b82f6', 0.4: '#eab308', 0.7: '#f97316', 1.0: '#ef4444' },
      })
      capa.addTo(map)
    })

    return () => {
      cancelado = true
      if (capa) map.removeLayer(capa)
    }
  }, [map, puntos, max])

  return null
}
