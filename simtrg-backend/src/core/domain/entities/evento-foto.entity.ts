// ============================================================
// ENTIDAD DE DOMINIO: EventoFoto
// Foto adjunta a un evento táctico (novedad).
// ============================================================

export class EventoFotoDomain {
  constructor(
    public readonly id: string,
    public readonly eventoTacticoId: string,
    public rutaArchivo: string,
    public rutaMiniatura: string,
    public nombreArchivo: string,
    public tamanoBytes: number,
    public readonly createdAt: Date,
  ) {}
}
