// Ruta relativa: el proxy de Vite (ver vite.config.ts) reenvía /uploads
// al backend. Funciona igual en localhost, por túnel o por IP de red local.
const API_HOST = ''

export function getImageUrl(ruta?: string | null): string | null {
  if (!ruta) return null
  return `${API_HOST}${ruta.replace('/app/uploads', '/uploads')}`
}
