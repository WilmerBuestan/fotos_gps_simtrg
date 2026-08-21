import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export type SeccionPdf =
  // sinCortar: nunca se parte entre páginas — si no cabe entera, se
  // encoge manteniendo la proporción (mapas, cuadrículas de gráficos).
  // Sin ese flag, el contenido alto se corta en franjas entre páginas
  // (tablas largas, donde eso sí es normal en un reporte).
  | { tipo: 'imagen'; titulo: string; elemento: HTMLElement; sinCortar?: boolean }
  | { tipo: 'texto'; titulo: string; texto: string }

export interface OpcionesPdf {
  titulo: string
  unidad: string
  subtitulo?: string
  generadoPor?: string
  nombreArchivo: string
}

const MARGEN = 15
const PAGE_W = 210 // A4 mm
const PAGE_H = 297 // A4 mm
const ANCHO_UTIL = PAGE_W - MARGEN * 2
const HEADER_H = 12
const FOOTER_H = 14
const CONTENT_TOP = MARGEN + HEADER_H
const CONTENT_BOTTOM = PAGE_H - MARGEN - FOOTER_H

const AZUL_MARCA: [number, number, number] = [22, 60, 110]
const GRIS_TEXTO: [number, number, number] = [90, 90, 90]

// /login/emblema.png tal como lo usa LoginPage.tsx. Se carga una sola vez
// como data URL para poder incrustarla en el PDF (addImage necesita base64,
// no una URL servida por el navegador).
async function cargarLogoDataUrl(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch('/login/emblema.png')
    const blob = await res.blob()
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const dims: { w: number; h: number } = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.width, h: img.height })
      img.onerror = reject
      img.src = dataUrl
    })
    return { dataUrl, ...dims }
  } catch {
    return null
  }
}

function dibujarCaratula(
  pdf: jsPDF,
  opciones: OpcionesPdf,
  logo: { dataUrl: string; w: number; h: number } | null,
) {
  pdf.setFillColor(...AZUL_MARCA)
  pdf.rect(0, 0, PAGE_W, 60, 'F')

  if (logo) {
    const logoAltoMm = 26
    const logoAnchoMm = (logo.w / logo.h) * logoAltoMm
    pdf.addImage(logo.dataUrl, 'PNG', PAGE_W - MARGEN - logoAnchoMm, 15, logoAnchoMm, logoAltoMm)
  }

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SIMTRG', MARGEN, 24)
  pdf.setFontSize(9.5)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Sistema de Monitoreo Táctico', MARGEN, 32)

  pdf.setTextColor(30, 30, 30)
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  const tituloLineas = pdf.splitTextToSize(opciones.titulo, ANCHO_UTIL)
  pdf.text(tituloLineas, MARGEN, 105)

  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...GRIS_TEXTO)
  let y = 105 + tituloLineas.length * 10 + 8
  pdf.text(opciones.unidad, MARGEN, y)

  if (opciones.subtitulo) {
    y += 8
    pdf.setFontSize(11)
    pdf.text(opciones.subtitulo, MARGEN, y)
  }

  pdf.setDrawColor(...AZUL_MARCA)
  pdf.setLineWidth(0.8)
  pdf.line(MARGEN, 235, PAGE_W - MARGEN, 235)

  pdf.setFontSize(9.5)
  pdf.setTextColor(...GRIS_TEXTO)
  const generado = `Generado el ${new Date().toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' })}`
  pdf.text(generado, MARGEN, 244)
  if (opciones.generadoPor) {
    pdf.text(`Generado por: ${opciones.generadoPor}`, MARGEN, 250.5)
  }
  pdf.text('Documento de uso interno — SIMTRG', MARGEN, 257)

  pdf.setFontSize(8.5)
  pdf.setTextColor(140, 140, 140)
  pdf.text('Desarrollado por: Mashi - Wilo  ·  Powered by: Sanchez', MARGEN, PAGE_H - 12)
}

function dibujarIndice(pdf: jsPDF, entradas: { titulo: string; pagina: number }[]) {
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(20, 20, 20)
  pdf.text('Índice', MARGEN, MARGEN + 8)
  pdf.setDrawColor(...AZUL_MARCA)
  pdf.setLineWidth(0.6)
  pdf.line(MARGEN, MARGEN + 12, PAGE_W - MARGEN, MARGEN + 12)

  let y = MARGEN + 26
  pdf.setFontSize(11)
  entradas.forEach((entrada, i) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(40, 40, 40)
    const etiqueta = `${i + 1}. ${entrada.titulo}`
    const numPagina = String(entrada.pagina)
    const anchoEtiqueta = pdf.getTextWidth(etiqueta)
    const anchoNumero = pdf.getTextWidth(numPagina)
    pdf.text(etiqueta, MARGEN, y)

    const inicioPuntos = MARGEN + anchoEtiqueta + 2
    const finPuntos = PAGE_W - MARGEN - anchoNumero - 2
    if (finPuntos > inicioPuntos) {
      const puntos = pdf.splitTextToSize('.'.repeat(200), finPuntos - inicioPuntos)[0] || ''
      pdf.setTextColor(...GRIS_TEXTO)
      pdf.text(puntos, inicioPuntos, y)
    }

    pdf.setTextColor(40, 40, 40)
    pdf.text(numPagina, PAGE_W - MARGEN, y, { align: 'right' })
    y += 9
  })
}

function dibujarHeaderFooter(
  pdf: jsPDF,
  opciones: OpcionesPdf,
  logo: { dataUrl: string; w: number; h: number } | null,
  pagina: number,
  total: number,
) {
  if (logo) {
    const altoMm = 7
    const anchoMm = (logo.w / logo.h) * altoMm
    pdf.addImage(logo.dataUrl, 'PNG', MARGEN, MARGEN - 8, anchoMm, altoMm)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...AZUL_MARCA)
    pdf.text('SIMTRG', MARGEN + anchoMm + 3, MARGEN)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...GRIS_TEXTO)
    pdf.text(opciones.unidad, MARGEN + anchoMm + 21, MARGEN)
  } else {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...AZUL_MARCA)
    pdf.text('SIMTRG', MARGEN, MARGEN)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...GRIS_TEXTO)
    pdf.text(opciones.unidad, MARGEN + 18, MARGEN)
  }
  pdf.text(opciones.titulo, PAGE_W - MARGEN, MARGEN, { align: 'right' })
  pdf.setDrawColor(210, 210, 210)
  pdf.setLineWidth(0.3)
  pdf.line(MARGEN, MARGEN + 3, PAGE_W - MARGEN, MARGEN + 3)

  const yFooter = PAGE_H - MARGEN
  pdf.line(MARGEN, yFooter - 6, PAGE_W - MARGEN, yFooter - 6)
  pdf.setFontSize(8)
  pdf.setTextColor(...GRIS_TEXTO)
  const izquierda = opciones.generadoPor ? `Generado por: ${opciones.generadoPor}` : 'SIMTRG'
  pdf.text(izquierda, MARGEN, yFooter)
  pdf.text(new Date().toLocaleDateString('es-EC'), PAGE_W / 2, yFooter, { align: 'center' })
  pdf.text(`Página ${pagina - 2} de ${total - 2}`, PAGE_W - MARGEN, yFooter, { align: 'right' })
}

// jsPDF solo justifica cuando recibe el párrafo completo en una sola
// llamada (re-parte el texto internamente); si se le pasa una línea ya
// cortada de antemano, la trata como "última línea" y no la justifica
// nunca. Por eso se reparte el espacio extra a mano, palabra por palabra.
function dibujarLineaJustificada(pdf: jsPDF, linea: string, x: number, y: number, anchoObjetivo: number): void {
  const palabras = linea.split(' ').filter(Boolean)
  if (palabras.length <= 1) {
    pdf.text(linea, x, y)
    return
  }
  const anchoNatural = pdf.getTextWidth(linea)
  const espacioExtra = anchoObjetivo - anchoNatural
  const anchoEspacio = pdf.getTextWidth(' ')
  const extraPorHueco = espacioExtra / (palabras.length - 1)

  let cursorX = x
  palabras.forEach((palabra, i) => {
    pdf.text(palabra, cursorX, y)
    cursorX += pdf.getTextWidth(palabra) + anchoEspacio + (i < palabras.length - 1 ? extraPorHueco : 0)
  })
}

function recortarCanvas(origen: HTMLCanvasElement, xPx: number, yPx: number, wPx: number, hPx: number): HTMLCanvasElement {
  const recorte = document.createElement('canvas')
  recorte.width = Math.max(1, Math.round(wPx))
  recorte.height = Math.max(1, Math.round(hPx))
  const ctx = recorte.getContext('2d')!
  ctx.drawImage(origen, xPx, yPx, wPx, hPx, 0, 0, recorte.width, recorte.height)
  return recorte
}

function dibujarFranja(pdf: jsPDF, canvas: HTMLCanvasElement, offsetPx: number, altoPx: number, y: number): void {
  const imgWidthMm = ANCHO_UTIL
  const franjaCanvas = document.createElement('canvas')
  franjaCanvas.width = canvas.width
  franjaCanvas.height = altoPx
  const ctx = franjaCanvas.getContext('2d')!
  ctx.drawImage(canvas, 0, offsetPx, canvas.width, altoPx, 0, 0, canvas.width, altoPx)
  const altoMm = (altoPx * imgWidthMm) / canvas.width
  pdf.addImage(franjaCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGEN, y, imgWidthMm, altoMm)
}

// Para secciones que no deben partirse (mapas, cuadrículas de gráficos):
// si la imagen entera no cabe en lo que queda de la página actual, se
// pasa a una página nueva; si ni así entra completa, se encoge
// manteniendo la proporción — nunca se corta a la mitad.
function colocarImagenSinCortar(pdf: jsPDF, canvas: HTMLCanvasElement, cursorY: number): void {
  const anchoNaturalMm = ANCHO_UTIL
  const altoNaturalMm = (canvas.height * anchoNaturalMm) / canvas.width
  const alturaPaginaCompleta = CONTENT_BOTTOM - CONTENT_TOP

  let y = cursorY
  let espacioAlto = CONTENT_BOTTOM - cursorY
  if (altoNaturalMm > espacioAlto && espacioAlto < alturaPaginaCompleta) {
    pdf.addPage()
    y = CONTENT_TOP
    espacioAlto = alturaPaginaCompleta
  }

  let anchoFinal = anchoNaturalMm
  let altoFinal = altoNaturalMm
  if (altoFinal > espacioAlto) {
    const factor = espacioAlto / altoFinal
    altoFinal = espacioAlto
    anchoFinal = anchoNaturalMm * factor
  }

  const xCentrado = MARGEN + (ANCHO_UTIL - anchoFinal) / 2
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', xCentrado, y, anchoFinal, altoFinal)
}

// Dibuja un bloque de imagen (canvas ya capturado) empezando en cursorY.
// La primera franja usa el espacio físico que queda en la página actual
// (fijo, no se puede ampliar). El resto del contenido, si no cupo entero,
// se reparte en partes iguales entre las páginas siguientes que hagan
// falta — en vez de llenar cada página al máximo y dejar una última
// página con apenas una sobra mínima del recorte anterior.
function colocarImagen(pdf: jsPDF, canvas: HTMLCanvasElement, cursorY: number): void {
  const imgWidthMm = ANCHO_UTIL
  const pxPorMm = canvas.width / imgWidthMm

  const espacioPrimeraPx = Math.max(0, Math.floor((CONTENT_BOTTOM - cursorY) * pxPorMm))
  const primeraAltoPx = Math.min(espacioPrimeraPx, canvas.height)
  if (primeraAltoPx > 0) {
    dibujarFranja(pdf, canvas, 0, primeraAltoPx, cursorY)
  }

  const restantePx = canvas.height - primeraAltoPx
  if (restantePx <= 0) return

  const alturaCompletaPx = Math.floor((CONTENT_BOTTOM - CONTENT_TOP) * pxPorMm)
  const numPaginas = Math.ceil(restantePx / alturaCompletaPx)
  const alturaBalanceadaPx = Math.ceil(restantePx / numPaginas)

  let offsetPx = primeraAltoPx
  for (let i = 0; i < numPaginas; i++) {
    pdf.addPage()
    const altoPx = Math.min(alturaBalanceadaPx, canvas.height - offsetPx)
    dibujarFranja(pdf, canvas, offsetPx, altoPx, CONTENT_TOP)
    offsetPx += altoPx
  }
}

// Captura TODO el contenedor del dashboard en una sola pasada de
// html2canvas (respetando exactamente lo que el usuario ve en pantalla) y
// luego recorta cada sección de esa única captura. Capturar cada
// sub-elemento por separado (como se hacía antes) es una fuente conocida de
// desfases en html2canvas cuando el elemento necesita scroll para verse y
// tiene contenido posicionado con CSS transform adentro (como los paneles
// de Leaflet) — capturando todo de una vez en su posición natural se evita
// ese problema de raíz. Arma un PDF con carátula, índice, encabezado/pie
// con logo en cada página y una página propia por sección.
export async function exportarDashboardPdf(
  contenedor: HTMLElement,
  secciones: SeccionPdf[],
  opciones: OpcionesPdf,
): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await cargarLogoDataUrl()

  dibujarCaratula(pdf, opciones, logo) // página 1
  pdf.addPage() // página 2: índice (se completa al final)

  const entradasIndice: { titulo: string; pagina: number }[] = []

  // Deja un respiro para que terminen de cargar los tiles del mapa (piden
  // red de forma asíncrona) antes de la única captura completa.
  await new Promise((resolve) => setTimeout(resolve, 600))
  const ESCALA = 2
  const canvasCompleto = await html2canvas(contenedor, {
    scale: ESCALA,
    useCORS: true,
    backgroundColor: '#ffffff',
  })
  const contenedorRect = contenedor.getBoundingClientRect()

  for (const seccion of secciones) {
    pdf.addPage()
    entradasIndice.push({ titulo: seccion.titulo, pagina: pdf.getNumberOfPages() })

    let cursorY = CONTENT_TOP
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20, 20, 20)
    pdf.text(seccion.titulo, MARGEN, cursorY)
    pdf.setFont('helvetica', 'normal')
    cursorY += 9

    if (seccion.tipo === 'texto') {
      pdf.setFontSize(10.5)
      pdf.setTextColor(40, 40, 40)
      const lineas: string[] = pdf.splitTextToSize(seccion.texto, ANCHO_UTIL)
      const altoLineaMm = 5.5
      lineas.forEach((linea, i) => {
        if (cursorY + altoLineaMm > CONTENT_BOTTOM) {
          pdf.addPage()
          cursorY = CONTENT_TOP
        }
        const esUltimaLineaDelParrafo = i === lineas.length - 1
        if (esUltimaLineaDelParrafo) {
          pdf.text(linea, MARGEN, cursorY)
        } else {
          dibujarLineaJustificada(pdf, linea, MARGEN, cursorY, ANCHO_UTIL)
        }
        cursorY += altoLineaMm
      })
      continue
    }

    try {
      const elRect = seccion.elemento.getBoundingClientRect()
      const xPx = (elRect.left - contenedorRect.left) * ESCALA
      const yPx = (elRect.top - contenedorRect.top) * ESCALA
      const wPx = elRect.width * ESCALA
      const hPx = elRect.height * ESCALA
      if (wPx <= 0 || hPx <= 0) {
        throw new Error('Sección sin tamaño visible')
      }
      const canvas = recortarCanvas(canvasCompleto, xPx, yPx, wPx, hPx)

      if (seccion.sinCortar) {
        colocarImagenSinCortar(pdf, canvas, cursorY)
      } else {
        colocarImagen(pdf, canvas, cursorY)
      }
    } catch (error) {
      // Nunca dejar una página en blanco sin explicación: si esta sección
      // puntual no se pudo recortar, se avisa en el propio PDF en vez de
      // fallar todo el reporte o dejar un vacío sin aviso.
      console.error(`No se pudo capturar la sección "${seccion.titulo}":`, error)
      pdf.setFontSize(10)
      pdf.setTextColor(180, 60, 60)
      pdf.text('No se pudo capturar esta sección. Revísala directamente en el Dashboard.', MARGEN, cursorY)
      pdf.setTextColor(0, 0, 0)
    }
  }

  // Completar índice ahora que se conocen las páginas de cada sección
  pdf.setPage(2)
  dibujarIndice(pdf, entradasIndice)

  // Encabezado/pie en todas las páginas de contenido (no en carátula ni índice)
  const totalPaginas = pdf.getNumberOfPages()
  for (let i = 3; i <= totalPaginas; i++) {
    pdf.setPage(i)
    dibujarHeaderFooter(pdf, opciones, logo, i, totalPaginas)
  }

  pdf.save(opciones.nombreArchivo)
}
