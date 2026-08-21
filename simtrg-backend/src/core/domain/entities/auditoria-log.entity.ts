// ============================================================
// ENTIDAD DE DOMINIO: AuditoriaLog
// Capa: Core > Domain
// NO tiene dependencias de frameworks ni librerías externas.
// Representa un evento registrado por el mini-SIEM: login/logout
// y toda acción de escritura (crear/editar/eliminar).
// ============================================================

export enum TipoEventoAuditoria {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export class AuditoriaLogDomain {
  constructor(
    public readonly id: string,
    public readonly timestamp: Date,
    public readonly tipoEvento: TipoEventoAuditoria,
    public readonly metodoHttp: string,
    public readonly url: string,
    public readonly usuarioId: string | null,
    public readonly username: string | null,
    public readonly rol: string | null,
    public readonly ip: string | null,
    public readonly latitud: number | null,
    public readonly longitud: number | null,
    public readonly provincia: string | null,
    public readonly canton: string | null,
    public readonly parroquia: string | null,
    public readonly detalle: Record<string, unknown> | null,
    public readonly exitoso: boolean,
    public readonly mensajeError: string | null,
  ) {}
}
