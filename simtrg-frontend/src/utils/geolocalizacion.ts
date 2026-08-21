// Envuelve navigator.geolocation en una promesa que nunca rechaza: si el
// usuario niega el permiso, el navegador no lo soporta, o se agota el
// tiempo, resuelve con coordenadas vacías en vez de lanzar. Se usa en
// login/logout, donde la ubicación es un dato adicional, no un requisito
// para poder entrar o salir del sistema.
export interface Coordenadas {
  latitud?: number
  longitud?: number
}

export function obtenerGeolocalizacion(timeoutMs = 6000): Promise<Coordenadas> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({})
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: timeoutMs },
    )
  })
}
