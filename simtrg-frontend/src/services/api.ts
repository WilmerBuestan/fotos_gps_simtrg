import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      // Aviso reactivo (sin recargar la página, sin loop): App.tsx escucha
      // este evento y limpia la sesión para mostrar el login al instante.
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export default API
