// ============================================================
// PUERTO: IFotoDronRepository
// Capa: Core > Domain
// ============================================================

import { FotoDronDomain } from '../entities/foto-dron.entity'

export interface CreateFotoDronDto {
  rutaArchivo: string
  rutaMiniatura: string
  latitud: number | null
  longitud: number | null
  fechaCaptura: Date | null
  esCoordenadasManual: boolean
  origenCoordenada: string | null
  operadorId: string
  nombreArchivo: string
  tamanoBytes: number
  provincia?: string | null
  canton?: string | null
}

export interface FiltroFotosHeatmapDto {
  desde?: Date
  hasta?: Date
  provincia?: string
}

export interface PuntoHeatmapFoto {
  latitud: number
  longitud: number
  peso: number
}

export abstract class IFotoDronRepository {
  abstract create(data: CreateFotoDronDto): Promise<FotoDronDomain>
  abstract findAll(): Promise<FotoDronDomain[]>
  abstract findById(id: string): Promise<FotoDronDomain | null>
  abstract findByOperador(operadorId: string): Promise<FotoDronDomain[]>
  abstract update(id: string, data: Partial<CreateFotoDronDto>): Promise<FotoDronDomain>
  abstract delete(id: string): Promise<void>
  abstract generarHeatmap(filtro?: FiltroFotosHeatmapDto): Promise<PuntoHeatmapFoto[]>
}
