const API_HOST = 'http://localhost:3000'

export function getImageUrl(ruta?: string | null): string | null {
  if (!ruta) return null
  return `${API_HOST}${ruta.replace('/app/uploads', '/uploads')}`
}
